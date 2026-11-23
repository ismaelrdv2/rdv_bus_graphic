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
        "mp4-h264" => Some(("mp4", vec!["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "medium", "-movflags", "+faststart"])),
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

// Arquivo .mlt destinado à biblioteca do Kdenlive, não um projeto .kdenlive.
fn escape_mlt_xml(value: &str) -> String {
    value.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;")
        .replace('"', "&quot;").replace('\'', "&apos;")
}

fn kdenlive_clip_xml(video: &Path, width: u32, height: u32, fps: u32, frames: u32) -> String {
    let parent = escape_mlt_xml(&video.parent().unwrap_or(Path::new(".")).to_string_lossy());
    let resource = escape_mlt_xml(&video.to_string_lossy());
    let name = escape_mlt_xml(&video.file_name().unwrap_or_default().to_string_lossy());
    let (aspect_num, aspect_den) = if width > height { (16, 9) } else { (9, 16) };
    let last = frames - 1; // MLT usa out inclusivo: 318 quadros => 0..317.
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
<mlt LC_NUMERIC=\"C\" root=\"{parent}\" producer=\"rdv_playlist\">\n\
  <profile description=\"RDV Bus Studio Kdenlive {width}x{height} {fps}fps\" width=\"{width}\" height=\"{height}\" progressive=\"1\" sample_aspect_num=\"1\" sample_aspect_den=\"1\" display_aspect_num=\"{aspect_num}\" display_aspect_den=\"{aspect_den}\" frame_rate_num=\"{fps}\" frame_rate_den=\"1\" colorspace=\"709\"/>\n\
  <chain id=\"rdv_source\" in=\"0\" out=\"{last}\">\n\
    <property name=\"resource\">{resource}</property>\n\
    <property name=\"mlt_service\">avformat</property>\n\
    <property name=\"kdenlive:clipname\">{name}</property>\n\
    <property name=\"set.test_audio\">1</property>\n\
    <property name=\"set.test_image\">0</property>\n\
  </chain>\n\
  <playlist id=\"rdv_playlist\">\n\
    <entry producer=\"rdv_source\" in=\"0\" out=\"{last}\"/>\n\
  </playlist>\n\
</mlt>\n"
    )
}

#[tauri::command]
fn kdenlive_prepare_clip(
    path: String, width: u32, height: u32, fps: u32, frames: u32, background: String
) -> Result<String, String> {
    if !((width == 1920 && height == 1080) || (width == 1080 && height == 1920))
        || !(fps == 30 || fps == 60) || !(1..=1800).contains(&frames) {
        return Err("Perfil Kdenlive inválido: Full HD, 30/60 FPS, 1 a 1800 quadros.".into());
    }
    if !matches!(background.as_str(), "transparent" | "green" | "blue" | "black") {
        return Err("Fundo de exportação não reconhecido.".into());
    }
    let video = PathBuf::from(path);
    if !video.is_absolute() || !video.is_file() {
        return Err("O vídeo exportado precisa existir em um caminho absoluto.".into());
    }
    let ext = video.extension().and_then(|x| x.to_str()).unwrap_or("").to_ascii_lowercase();
    if !matches!(ext.as_str(), "mov" | "mkv" | "webm" | "mp4") {
        return Err("O formato do vídeo não é compatível com este perfil Kdenlive.".into());
    }
    let mlt = video.with_extension("mlt");
    let readme = video.with_extension("kdenlive-LEIA-ME.txt");
    let mode = match background.as_str() {
        "transparent" => "Canal alfa: coloque o clipe em V2 acima do video V1. Nao use Chroma Key.\n",
        "green" => "Chroma Key verde (#00FF00): coloque em V2 e aplique Chroma Key: Basic sobre este clipe.\n",
        "blue" => "Chroma Key azul (#0000FF): coloque em V2 e aplique Chroma Key: Basic sobre este clipe.\n",
        _ => "Fundo preto opaco: este arquivo nao apresenta transparência sobre o video V1.\n",
    };
    let instructions = format!(
        "RDV BUS STUDIO - INTEGRACAO KDENLIVE\n\n\
Arquivo de video: {}\nPerfil: {}x{}, {} FPS, {} quadros\n\n\
{}\n\
1. No Kdenlive crie/abra o seu projeto com o mesmo perfil e FPS.\n\
2. Adicione o arquivo de video pelo Bin de Projeto e arraste-o para V2, acima do material em V1.\n\
3. Alternativa experimental: copie o .mlt para a Biblioteca do Kdenlive e importe como clipe MLT.\n\
4. Os arquivos .mlt guardam o caminho absoluto do video: nao mova o video sem religar a midia.\n\
5. Para MOV com alfa, ative composicao na timeline caso seu layout nao a aplique automaticamente.\n\
6. A qualidade das bordas e do alfa deve ser validada na exportacao final do Kdenlive.\n\n\
Este .mlt nao e um projeto .kdenlive nem altera projetos existentes.\n",
        video.display(), width, height, fps, frames, mode
    );
    fs::write(&mlt, kdenlive_clip_xml(&video, width, height, fps, frames))
        .map_err(|e| format!("Não foi possível preparar o clipe MLT: {e}"))?;
    fs::write(&readme, instructions).map_err(|e| format!("Clipe MLT gerado, mas falha no guia Kdenlive: {e}"))?;
    Ok(mlt.to_string_lossy().into_owned())
}

#[cfg(test)]
mod kdenlive_tests {
    use super::*;
    #[test]
    fn escapes_xml_and_preserves_exact_frame_count() {
        let clip = kdenlive_clip_xml(Path::new("/tmp/RDV & <S>.mov"), 1920, 1080, 60, 318);
        assert!(clip.contains("/tmp/RDV &amp; &lt;S&gt;.mov"));
        assert!(clip.contains("out=\"317\""));
        assert!(clip.contains("frame_rate_num=\"60\""));
        assert!(clip.contains("display_aspect_num=\"16\""));
    }
    #[test]
    fn portrait_profile() {
        let clip = kdenlive_clip_xml(Path::new("/tmp/retrato.mov"), 1080, 1920, 30, 150);
        assert!(clip.contains("display_aspect_num=\"9\""));
        assert!(clip.contains("display_aspect_den=\"16\""));
        assert!(clip.contains("out=\"149\""));
    }
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(VideoState::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![video_begin, video_frame, video_finish, video_cancel, kdenlive_prepare_clip, list_system_fonts, desktop_default_output_directory, desktop_open_output_directory])
        .run(tauri::generate_context!())
        .expect("Falha ao iniciar o RDV Bus Studio");
}
