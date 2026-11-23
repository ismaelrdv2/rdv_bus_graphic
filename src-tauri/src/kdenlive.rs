use std::{fs, path::{Path, PathBuf}};

// Arquivo .mlt destinado à biblioteca do Kdenlive, não um projeto .kdenlive.
fn escape_mlt_xml(value: &str) -> String {
    value.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;")
        .replace('"', "&quot;").replace('\'', "&apos;")
}

fn kdenlive_clip_xml(video: &Path, width: u32, height: u32, fps: u32, frames: u32) -> String {
    let parent = escape_mlt_xml(&video.parent().unwrap_or(Path::new(".")).to_string_lossy());
    let resource = escape_mlt_xml(&video.to_string_lossy());
    let name = escape_mlt_xml(&video.file_name().unwrap_or_else(|| std::ffi::OsStr::new("")).to_string_lossy());
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

pub fn prepare_clip(
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

