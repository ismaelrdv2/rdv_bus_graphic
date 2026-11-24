//! Compactador ZIP32 portável para MP4/MOV/MKV/WebM já comprimidos.
 //! Sem utilitários externos, sem permissão para arquivos fora da pasta de etapa.
use std::{fs::{self, File, OpenOptions}, io::{Read, Write},path::{Path,PathBuf},time::{SystemTime,UNIX_EPOCH}};
fn valid_name(n:&str)->bool{
    n.len()<=110&&n.len()>=5&&!n.contains("..")&&
    n.bytes().all(|b|b.is_ascii_alphanumeric()||matches!(b,b'.'|b'_'|b'-'))&&
    [".mp4",".mov",".mkv",".webm"].iter().any(|ext|n.ends_with(ext))
}
fn stage_path(raw:&str)->Result<PathBuf,String>{
    let path=fs::canonicalize(raw).map_err(|e|format!("Pasta do lote indisponível: {e}"))?;
    let temp=fs::canonicalize(std::env::temp_dir()).map_err(|e|e.to_string())?;
    let name=path.file_name().and_then(|n|n.to_str()).unwrap_or("");
    if !path.is_dir()||path.parent()!=Some(temp.as_path())||!name.starts_with(".rdv-bus-batch-"){
        return Err("A pasta não é uma etapa temporária do RDV Bus Studio".into());
    }
    Ok(path)
}
fn le16(f:&mut File,n:u16)->std::io::Result<()>{f.write_all(&n.to_le_bytes())}
fn le32(f:&mut File,n:u32)->std::io::Result<()>{f.write_all(&n.to_le_bytes())}
fn crc32(src:&Path)->Result<(u32,u32),String>{
    let mut input=File::open(src).map_err(|e|e.to_string())?;
    let mut crc=0xffff_ffffu32;let mut bytes=0u64;
    let mut buf=[0u8;32768];
    loop{
        let n=input.read(&mut buf).map_err(|e|e.to_string())?;
        if n==0{break;}
        bytes+=n as u64;
        if bytes>1_000_000_000{return Err("Um vídeo do lote ultrapassa 1 GB".into())}
        for &byte in &buf[..n]{
            crc^=byte as u32;
            for _ in 0..8{crc=(crc>>1)^if crc&1==1{0xedb8_8320}else{0};}
        }
    }
    if bytes<1024{return Err("Vídeo vazio ou incompleto no lote".into())}
    Ok((!crc,bytes as u32))
}
struct Member{name:String,src:PathBuf,crc:u32,size:u32,offset:u32}
pub fn stage_create()->Result<String,String>{
    let temp=std::env::temp_dir();
    for increment in 0..8u8{
        let stamp=SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_nanos();
        let path=temp.join(format!(".rdv-bus-batch-{}-{stamp}-{increment}",std::process::id()));
        match fs::create_dir(&path){
            Ok(())=>return Ok(path.to_string_lossy().into_owned()),
            Err(e) if e.kind()==std::io::ErrorKind::AlreadyExists=>continue,
            Err(e)=>return Err(format!("Não foi possível criar pasta temporária: {e}"))
        }
    }
    Err("Falha ao criar uma pasta única de produção".into())
}
pub fn stage_cleanup(stage:String)->Result<(),String>{
    let folder=stage_path(&stage)?;
    fs::remove_dir_all(folder).map_err(|e|format!("Falha ao limpar vídeos temporários: {e}"))
}
pub fn archive(stage:String,output:String,names:Vec<String>)->Result<String,String>{
    if names.is_empty()||names.len()>24{return Err("Selecione de 1 a 24 vídeos".into())}
    let stage=stage_path(&stage)?;
    let output=PathBuf::from(&output);
    if output.extension().and_then(|e|e.to_str()).map(|x|x.to_ascii_lowercase())!=Some("zip".into()){
        return Err("Produção compactada exige extensão .zip".into())
    }
    if !output.is_absolute()||!output.parent().ok_or("Pasta de saída inválida")?.is_dir(){
        return Err("Selecione uma pasta existente para salvar o ZIP".into())
    }
    let mut seen=std::collections::HashSet::new();
    let mut members=Vec::new();let mut sum=0u64;
    for name in names{
        if !valid_name(&name)||!seen.insert(name.clone()){return Err("Nome de vídeo inválido ou repetido".into())}
        let source=stage.join(&name);
        let canonical=fs::canonicalize(&source).map_err(|e|format!("Vídeo {name} indisponível: {e}"))?;
        if canonical.parent()!=Some(stage.as_path()){return Err("O arquivo está fora da pasta temporária".into())}
        let (crc,size)=crc32(&canonical)?;
        sum+=size as u64;
        if sum>3_700_000_000{return Err("ZIP excede limite de 3,7 GB".into())}
        members.push(Member{name:format!("RDV_Bus_Studio/{name}"),src:canonical,crc,size,offset:0});
    }
    let mut out=OpenOptions::new().create_new(true).write(true).open(&output)
        .map_err(|e|format!("Arquivo ZIP já existe ou não está disponível: {e}"))?;
    let result=(||->Result<(),String>{
        let mut offset=0u64;
        for m in &mut members{
            let name=m.name.as_bytes();
            m.offset=u32::try_from(offset).map_err(|_|"ZIP grande demais")?;
            le32(&mut out,0x0403_4b50).map_err(|e|e.to_string())?;
            le16(&mut out,20).map_err(|e|e.to_string())?;
            le16(&mut out,0x0800).map_err(|e|e.to_string())?; // UTF-8
            le16(&mut out,0).map_err(|e|e.to_string())?; // Store (vídeo já comprimido)
            le16(&mut out,0).map_err(|e|e.to_string())?;
            le16(&mut out,0).map_err(|e|e.to_string())?;
            le32(&mut out,m.crc).map_err(|e|e.to_string())?;
            le32(&mut out,m.size).map_err(|e|e.to_string())?;
            le32(&mut out,m.size).map_err(|e|e.to_string())?;
            le16(&mut out,name.len() as u16).map_err(|e|e.to_string())?;
            le16(&mut out,0).map_err(|e|e.to_string())?;
            out.write_all(name).map_err(|e|e.to_string())?;
            let mut src=File::open(&m.src).map_err(|e|e.to_string())?;
            std::io::copy(&mut src,&mut out).map_err(|e|e.to_string())?;
            offset+=30+name.len() as u64+m.size as u64;
        }
        let directory_start=offset;
        for m in &members{
            let name=m.name.as_bytes();
            le32(&mut out,0x0201_4b50).map_err(|e|e.to_string())?;
            le16(&mut out,20).map_err(|e|e.to_string())?;
            le16(&mut out,20).map_err(|e|e.to_string())?;
            le16(&mut out,0x0800).map_err(|e|e.to_string())?;
            le16(&mut out,0).map_err(|e|e.to_string())?;
            le16(&mut out,0).map_err(|e|e.to_string())?;
            le16(&mut out,0).map_err(|e|e.to_string())?;
            le32(&mut out,m.crc).map_err(|e|e.to_string())?;
            le32(&mut out,m.size).map_err(|e|e.to_string())?;
            le32(&mut out,m.size).map_err(|e|e.to_string())?;
            le16(&mut out,name.len() as u16).map_err(|e|e.to_string())?;
            for _ in 0..5{le16(&mut out,0).map_err(|e|e.to_string())?;}
            le32(&mut out,0).map_err(|e|e.to_string())?;
            le32(&mut out,m.offset).map_err(|e|e.to_string())?;
            out.write_all(name).map_err(|e|e.to_string())?;
            offset+=46+name.len() as u64;
        }
        let size=offset-directory_start;
        le32(&mut out,0x0605_4b50).map_err(|e|e.to_string())?;
        le16(&mut out,0).map_err(|e|e.to_string())?;
        le16(&mut out,0).map_err(|e|e.to_string())?;
        le16(&mut out,members.len() as u16).map_err(|e|e.to_string())?;
        le16(&mut out,members.len() as u16).map_err(|e|e.to_string())?;
        le32(&mut out,size as u32).map_err(|e|e.to_string())?;
        le32(&mut out,directory_start as u32).map_err(|e|e.to_string())?;
        le16(&mut out,0).map_err(|e|e.to_string())?;
        out.flush().map_err(|e|e.to_string())
    })();
    drop(out);
    if let Err(e)=result{let _=fs::remove_file(&output);return Err(e);}
    Ok(output.to_string_lossy().into_owned())
}
#[cfg(test)]
mod tests{
    use super::*;
    #[test]
    fn safe_member_names(){
        assert!(valid_name("01_Ficha_Tecnica.mov"));
        assert!(!valid_name("../secret.mp4"));
        assert!(!valid_name("abc.zip"));
    }
    #[test]
    fn archive_roundtrip_headers(){
        let stage=stage_create().unwrap();
        let f=PathBuf::from(&stage).join("01_Teste.mp4");
        fs::write(&f,vec![17u8;2048]).unwrap();
        let target=std::env::temp_dir().join(format!("rdv-batch-test-{}.zip",std::process::id()));
        if target.exists(){fs::remove_file(&target).unwrap()}
        archive(stage.clone(),target.to_string_lossy().into_owned(),vec!["01_Teste.mp4".into()]).unwrap();
        let bytes=fs::read(&target).unwrap();
        assert!(bytes.starts_with(b"PK\x03\x04"));
        assert!(bytes.windows(18).any(|v|v==b"RDV_Bus_Studio/01_"));
        assert!(bytes.windows(4).any(|v|v==b"PK\x05\x06"));
        assert!(archive(stage.clone(),target.to_string_lossy().into_owned(),vec!["01_Teste.mp4".into()]).is_err());
        stage_cleanup(stage).unwrap();
        fs::remove_file(target).unwrap();
    }
}
