use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use std::{
    collections::BTreeSet,
    env,
    fs,
    io::Write,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(VideoState::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![video_begin, video_frame, video_finish, video_cancel, list_system_fonts])
        .run(tauri::generate_context!())
        .expect("Falha ao iniciar o RDV Bus Studio");
}
