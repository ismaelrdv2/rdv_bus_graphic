use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use std::{
    collections::BTreeSet,
    env,
    fs,
    io::{self, Write},
    path::{Path, PathBuf},
    process::{Child, ChildStdin, Command, Stdio},
    sync::Mutex,
};
use tauri::{Manager, State};

/** Nome das famílias de fontes disponíveis localmente, nunca seus arquivos. */
#[tauri::command]
async fn list_system_fonts() -> Vec<String> {
    tauri::async_runtime::spawn_blocking(|| {
    let mut db = fontdb::Database::new();
    db.load_system_fonts();
    let mut families = BTreeSet::new();
    for face in db.faces() {
        for (family, _) in &face.families {
            if !family.trim().is_empty() && family.len() <= 100 {
                families.insert(family.to_owned());
            }
        }
    }
    families.into_iter().collect()
    }).await.unwrap_or_default()
}

// Um trabalho por vez para evitar disputa por memória e por codificadores.
#[derive(Default)]
struct VideoState(Mutex<Option<VideoJob>>);

struct VideoJob {
    id: String,
    output: PathBuf,
    child: Child,
    input: Option<ChildStdin>,
    expected: u32,
    written: u32,
}

fn executable(app: &tauri::AppHandle) -> PathBuf {
    // Permite fornecer um FFmpeg estático/bundled em versões futuras.
    if let Ok(custom) = env::var("RDV_FFMPEG") {
        if !custom.trim().is_empty() {
            return PathBuf::from(custom);
        }
    }
    let filename = if cfg!(windows) { "ffmpeg.exe" } else { "ffmpeg" };
    if let Ok(resource) = app.path().resource_dir() {
        let candidate = resource.join("ffmpeg").join(filename);
        if candidate.is_file() {
            return candidate;
        }
    }
    PathBuf::from(filename) // Busca no PATH em ambiente de desenvolvimento.
}

fn encoder_args(format: &str) -> Option<(&'static str, Vec<&'static str>)> {
    match format {
        "mov-qtrle" => Some(("mov", vec!["-c:v", "qtrle", "-pix_fmt", "argb"])),
        "mov-prores" => Some(("mov", vec!["-c:v", "prores_ks", "-profile:v", "4", "-pix_fmt", "yuva444p10le", "-alpha_bits", "16"])),
        "mkv-ffv1" => Some(("mkv", vec!["-c:v", "ffv1", "-level", "3", "-pix_fmt", "bgra"])),
        "webm-vp9" => Some(("webm", vec!["-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-auto-alt-ref", "0", "-lossless", "1", "-deadline", "good", "-cpu-used", "2"])),
        _ => None,
    }
}

fn lock_state(state: &VideoState) -> Result<std::sync::MutexGuard<'_, Option<VideoJob>>, String> {
    state.0.lock().map_err(|_| "Estado de exportação indisponível".to_owned())
}

#[tauri::command]
fn video_begin(
    app: tauri::AppHandle,
    state: State<'_, VideoState>,
    path: String,
    width: u32,
    height: u32,
    fps: u32,
    frames: u32,
    format: String,
) -> Result<String, String> {
    if !((width == 1920 && height == 1080) || (width == 1080 && height == 1920))
        || !(fps == 30 || fps == 60)
        || !(1..=1800).contains(&frames)
    {
        return Err("Resolução, FPS ou quantidade de quadros não suportados".into());
    }
    let (extension, args) = encoder_args(&format).ok_or("Formato de vídeo desconhecido")?;
    let output = PathBuf::from(path);
    if output.extension().and_then(|s| s.to_str()).map(|e| e.to_ascii_lowercase()) != Some(extension.to_owned()) {
        return Err("A extensão do arquivo não corresponde ao formato selecionado".into());
    }
    if output.file_name().is_none() || output.parent().is_none() || !output.parent().unwrap().exists() {
        return Err("Escolha uma pasta de saída existente".into());
    }
    let mut active = lock_state(&state)?;
    if active.is_some() {
        return Err("Já existe uma exportação de vídeo em andamento".into());
    }
    let mut cmd = Command::new(executable(&app));
    cmd.args(["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", &fps.to_string(), "-vcodec", "png", "-i", "pipe:0", "-an"]);
    cmd.args(args);
    cmd.arg(&output).stdin(Stdio::piped()).stdout(Stdio::null()).stderr(Stdio::piped());
    let mut child = cmd.spawn().map_err(|e| format!("FFmpeg não encontrado ou não executável: {e}. Instale o FFmpeg para testar no desktop."))?;
    let input = child.stdin.take().ok_or("Não foi possível abrir a entrada do FFmpeg")?;
    let id = format!("{}-{}", std::process::id(), std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos());
    *active = Some(VideoJob { id: id.clone(), output, child, input: Some(input), expected: frames, written: 0 });
    Ok(id)
}

#[tauri::command]
fn video_frame(state: State<'_, VideoState>, job_id: String, data: String) -> Result<(), String> {
    let mut active = lock_state(&state)?;
    let job = active.as_mut().ok_or("Não há vídeo em execução")?;
    if job.id != job_id { return Err("Trabalho de exportação desconhecido".into()); }
    if job.written >= job.expected { return Err("Quantidade máxima de quadros excedida".into()); }
    // Proteção de memória para frames recebidos via IPC.
    if data.len() > 32_000_000 { return Err("Quadro PNG grande demais".into()); }
    let bytes = BASE64.decode(data).map_err(|e| format!("Quadro inválido: {e}"))?;
    if bytes.len() < 8 || !bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        return Err("O quadro recebido não é um PNG válido".into());
    }
    job.input.as_mut().ok_or("FFmpeg encerrado")?
        .write_all(&bytes).map_err(|e| format!("Erro ao enviar quadro ao FFmpeg: {e}"))?;
    job.written += 1;
    Ok(())
}

#[tauri::command]
fn video_finish(state: State<'_, VideoState>, job_id: String) -> Result<String, String> {
    let mut active = lock_state(&state)?;
    if active.as_ref().map(|j| j.id.as_str()) != Some(job_id.as_str()) {
        return Err("Trabalho de exportação desconhecido".into());
    }
    let mut job = active.take().ok_or("Vídeo indisponível")?;
    let frame_count_ok = job.written == job.expected;
    drop(job.input.take()); // EOF: o FFmpeg pode encerrar a codificação.
    let result = job.child.wait_with_output().map_err(|e| format!("Falha ao finalizar o FFmpeg: {e}"))?;
    if !frame_count_ok || !result.status.success() {
        let _ = fs::remove_file(&job.output);
        let stderr = String::from_utf8_lossy(&result.stderr);
        return Err(format!("Exportação incompleta ou erro do FFmpeg: {}", stderr.chars().take(1200).collect::<String>()));
    }
    Ok(job.output.to_string_lossy().into_owned())
}

#[tauri::command]
fn video_cancel(state: State<'_, VideoState>, job_id: String) -> Result<(), String> {
    let mut active = lock_state(&state)?;
    if active.as_ref().map(|j| j.id.as_str()) != Some(job_id.as_str()) {
        return Err("Trabalho de exportação desconhecido".into());
    }
    let mut job = active.take().ok_or("Vídeo indisponível")?;
    drop(job.input.take());
    let _ = job.child.kill();
    let _ = job.child.wait();
    if Path::new(&job.output).is_file() {
        let _ = fs::remove_file(job.output);
    }
    Ok(())
}

// A pasta pública padrão do Desktop fica diretamente no diretório HOME
// do usuário, não em Downloads. A UI permite selecionar outra pasta no diálogo.
fn output_directory() -> Result<PathBuf, String> {
    let home = if cfg!(windows) { env::var_os("USERPROFILE") } else { env::var_os("HOME") }
        .filter(|s| !s.is_empty())
        .ok_or("Não foi possível localizar o diretório pessoal do usuário")?;
    let path = PathBuf::from(home).join("RDV Bus Studio");
    fs::create_dir_all(&path)
        .map_err(|e| format!("Não foi possível criar a pasta de saída: {e}"))?;
    Ok(path)
}

#[tauri::command]
fn desktop_default_output_directory() -> Result<String, String> {
    Ok(output_directory()?.to_string_lossy().into_owned())
}

#[tauri::command]
fn desktop_open_output_directory(path: Option<String>) -> Result<String, String> {
    let dir = match path {
        Some(p) if !p.trim().is_empty() => PathBuf::from(p),
        _ => output_directory()?,
    };
    if !dir.is_dir() { return Err(format!("Pasta de saída não encontrada: {}", dir.display())); }
    // Argumento separado: evita executar comandos de shell com caminhos de usuário.
    #[cfg(target_os = "linux")]
    let mut command = Command::new("xdg-open");
    #[cfg(target_os = "windows")]
    let mut command = Command::new("explorer.exe");
    #[cfg(target_os = "macos")]
    let mut command = Command::new("open");
    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    return Err("Abertura de pasta não implementada neste sistema".to_owned());
    #[cfg(any(target_os = "linux", target_os = "windows", target_os = "macos"))]
    {
        command.arg(&dir).spawn()
            .map_err(|e| format!("Não foi possível abrir a pasta: {e}"))?;
        Ok(dir.to_string_lossy().into_owned())
    }
}


// Exportação em lote: somente pastas internas controladas pelo aplicativo.
#[derive(Default)]
struct BatchState(Mutex<Option<PathBuf>>);

const BATCH_CATEGORIES: [&str; 9] = [
    "01_ficha_tecnica", "02_localizacao", "03_data", "04_linha_onibus",
    "05_motorista", "06_credito_filmagem", "07_texto_livre",
    "08_slide", "09_imagem_canto",
];

#[tauri::command]
fn batch_export_begin(state: State<'_, BatchState>) -> Result<String, String> {
    let mut guard = state.0.lock().map_err(|_| "Exportação em lote indisponível")?;
    if guard.is_some() {
        return Err("Já existe uma exportação por abas em andamento".into());
    }
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos();
    let root = env::temp_dir().join(format!("rdv-studio-batch-{}-{stamp}", std::process::id()));
    fs::create_dir(&root).map_err(|e| format!("Não foi possível preparar arquivos temporários: {e}"))?;
    for folder in BATCH_CATEGORIES {
        if let Err(e) = fs::create_dir(root.join(folder)) {
            let _ = fs::remove_dir_all(&root);
            return Err(format!("Erro ao preparar aba {folder}: {e}"));
        }
    }
    *guard = Some(root.clone());
    Ok(root.to_string_lossy().into_owned())
}

#[tauri::command]
fn batch_export_archive(state: State<'_, BatchState>, path: String) -> Result<String, String> {
    let mut guard = state.0.lock().map_err(|_| "Exportação em lote indisponível")?;
    let root = guard.as_ref().ok_or("Não existe exportação por abas ativa")?.clone();
    let target = PathBuf::from(path);
    if target.extension().and_then(|e|e.to_str()).map(|e|e.to_ascii_lowercase()) != Some("zip".into()) {
        return Err("A exportação por abas exige um arquivo .zip".into());
    }
    if !target.parent().map(|p|p.is_dir()).unwrap_or(false) || target.starts_with(&root) {
        return Err("Escolha uma pasta de destino válida e fora dos arquivos temporários".into());
    }
    let target_file = fs::File::create(&target).map_err(|e|format!("Falha ao criar ZIP: {e}"))?;
    let mut writer = zip::ZipWriter::new(target_file);
    let options = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);
    let mut count = 0;
    let result = (|| -> Result<(), String> {
        for folder in BATCH_CATEGORIES {
            for entry in fs::read_dir(root.join(folder)).map_err(|e|e.to_string())? {
                let entry = entry.map_err(|e|e.to_string())?;
                let file_type = entry.file_type().map_err(|e|e.to_string())?;
                if !file_type.is_file() || file_type.is_symlink() { continue; }
                let name = entry.file_name().to_string_lossy().to_string();
                if !["mov","mkv","webm"].iter().any(|ext| name.to_ascii_lowercase().ends_with(&format!(".{ext}"))) { continue; }
                writer.start_file(format!("{folder}/{name}"), options).map_err(|e|e.to_string())?;
                let mut input = fs::File::open(entry.path()).map_err(|e|e.to_string())?;
                io::copy(&mut input, &mut writer).map_err(|e|e.to_string())?;
                count += 1;
            }
        }
        if count == 0 { return Err("Nenhum vídeo foi gerado pelas abas".into()); }
        writer.finish().map_err(|e|e.to_string())?;
        Ok(())
    })();
    if let Err(error) = result {
        let _ = fs::remove_file(&target);
        return Err(format!("Falha ao empacotar abas: {error}"));
    }
    let _ = fs::remove_dir_all(root);
    *guard = None;
    Ok(target.to_string_lossy().into_owned())
}

#[tauri::command]
fn batch_export_cancel(state: State<'_, BatchState>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|_| "Exportação em lote indisponível")?;
    if let Some(root) = guard.take() {
        fs::remove_dir_all(root).map_err(|e|format!("Falha ao limpar arquivos temporários: {e}"))?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(VideoState::default())
        .manage(BatchState::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![video_begin, video_frame, video_finish, video_cancel, list_system_fonts, desktop_default_output_directory, desktop_open_output_directory, batch_export_begin, batch_export_archive, batch_export_cancel])
        .run(tauri::generate_context!())
        .expect("Falha ao iniciar o RDV Bus Studio");
}
