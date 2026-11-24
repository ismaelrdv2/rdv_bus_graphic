//! ZIP/ZIP64 sem recompressão: vídeos podem ultrapassar 4 GiB; memória limitada.
use std::{collections::HashSet,fs::{self,File,OpenOptions},io::{Read,Write,Seek,SeekFrom},path::{Path,PathBuf},sync::{Mutex,OnceLock},time::{SystemTime,UNIX_EPOCH}};
static STAGES:OnceLock<Mutex<HashSet<PathBuf>>>=OnceLock::new();
fn stages()->&'static Mutex<HashSet<PathBuf>>{STAGES.get_or_init(||Mutex::new(HashSet::new()))}
fn valid_name(n:&str)->bool{n.len()<=110&&n.len()>=5&&!n.contains("..")&&n.bytes().all(|b|b.is_ascii_alphanumeric()||matches!(b,b'.'|b'_'|b'-'))&&[".mp4",".mov",".mkv",".webm"].iter().any(|ext|n.ends_with(ext))}
fn stage_path(raw:&str)->Result<PathBuf,String>{
 let p=fs::canonicalize(raw).map_err(|e|format!("Pasta do lote indisponível: {e}"))?;
 if !p.is_dir()||!stages().lock().map_err(|_|"Registro de lotes indisponível")?.contains(&p){return Err("Pasta temporária não registrada nesta sessão".into())} Ok(p)
}
fn output_path(raw:&str)->Result<PathBuf,String>{
 let p=PathBuf::from(raw);
 if p.extension().and_then(|e|e.to_str()).map(|x|x.to_ascii_lowercase())!=Some("zip".into()){return Err("Produção compactada exige extensão .zip".into())}
 if !p.is_absolute()||!p.parent().ok_or("Pasta de saída inválida")?.is_dir(){return Err("Selecione uma pasta existente para salvar o ZIP".into())}
 if p.symlink_metadata().is_ok(){return Err("Já existe um ZIP com esse nome. Escolha outro nome para preservar o arquivo existente.".into())} Ok(p)
}
pub fn stage_create(output:Option<String>)->Result<String,String>{
 let dir=match output{Some(raw)=>fs::canonicalize(output_path(&raw)?.parent().ok_or("Pasta de saída inválida")?).map_err(|e|e.to_string())?,None=>fs::canonicalize(std::env::temp_dir()).map_err(|e|e.to_string())?};
 for i in 0..8{
  let stamp=SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_nanos();
  let p=dir.join(format!(".rdv-bus-batch-{}-{stamp}-{i}",std::process::id()));
  match fs::create_dir(&p){Ok(())=>{stages().lock().map_err(|_|"Registro de lotes indisponível")?.insert(p.clone());return Ok(p.to_string_lossy().into_owned())},Err(e) if e.kind()==std::io::ErrorKind::AlreadyExists=>continue,Err(e)=>return Err(format!("Não foi possível criar pasta de produção no disco de destino: {e}"))}
 } Err("Falha ao criar pasta única".into())
}
pub fn stage_cleanup(stage:String)->Result<(),String>{let p=stage_path(&stage)?;fs::remove_dir_all(&p).map_err(|e|format!("Falha ao limpar vídeos temporários: {e}"))?;stages().lock().map_err(|_|"Registro de lotes indisponível")?.remove(&p);Ok(())}
type Io<T>=std::io::Result<T>;
fn le16(f:&mut impl Write,n:u16)->Io<()>{f.write_all(&n.to_le_bytes())}
fn le32(f:&mut impl Write,n:u32)->Io<()>{f.write_all(&n.to_le_bytes())}
fn le64(f:&mut impl Write,n:u64)->Io<()>{f.write_all(&n.to_le_bytes())}
fn big(n:u64)->bool{n>=u32::MAX as u64}
fn narrow(n:u64)->u32{if big(n){u32::MAX}else{n as u32}}
fn crc_table()->[u32;256]{let mut t=[0;256];for (i,c) in t.iter_mut().enumerate(){let mut x=i as u32;for _ in 0..8{x=(x>>1)^if x&1!=0{0xedb88320}else{0};}*c=x;}t}
fn copy_crc(src:&mut File,out:&mut File)->Io<(u32,u64)>{
 let t=crc_table();let mut c=0xffffffff;let mut size=0u64;let mut buf=vec![0u8;1024*1024];
 loop{let n=src.read(&mut buf)?;if n==0{break}out.write_all(&buf[..n])?;size+=n as u64;for &b in &buf[..n]{c=(c>>8)^t[((c^b as u32)&255) as usize];}}
 Ok((!c,size))
}
struct Member{name:String,src:PathBuf,crc:u32,size:u64,offset:u64}
fn local(out:&mut File,m:&Member)->Io<()>{
 let name=m.name.as_bytes();let large=big(m.size);
 le32(out,0x04034b50)?;le16(out,if large{45}else{20})?;le16(out,0x0800)?;le16(out,0)?;le16(out,0)?;le16(out,0x21)?;
 le32(out,m.crc)?;le32(out,narrow(m.size))?;le32(out,narrow(m.size))?;le16(out,name.len() as u16)?;le16(out,if large{20}else{0})?;out.write_all(name)?;
 if large{le16(out,1)?;le16(out,16)?;le64(out,m.size)?;le64(out,m.size)?;} Ok(())
}
fn central(out:&mut impl Write,m:&Member)->Io<()>{
 let name=m.name.as_bytes();let large=big(m.size);let off=big(m.offset);let extra=(if large{16}else{0})+(if off{8}else{0});
 le32(out,0x02014b50)?;le16(out,45)?;le16(out,if large||off{45}else{20})?;le16(out,0x0800)?;le16(out,0)?;le16(out,0)?;le16(out,0x21)?;
 le32(out,m.crc)?;le32(out,narrow(m.size))?;le32(out,narrow(m.size))?;le16(out,name.len() as u16)?;le16(out,if extra>0{extra+4}else{0})?;
 for _ in 0..3{le16(out,0)?;}le32(out,0)?;le32(out,narrow(m.offset))?;out.write_all(name)?;
 if extra>0{le16(out,1)?;le16(out,extra)?;if large{le64(out,m.size)?;le64(out,m.size)?;}if off{le64(out,m.offset)?;}}Ok(())
}
fn end_records(out:&mut impl Write,start:u64,size:u64,count:u64,needs64:bool)->Io<()>{
 if needs64||big(start)||big(size)||count>=65535{
  let pos=start+size;le32(out,0x06064b50)?;le64(out,44)?;le16(out,45)?;le16(out,45)?;le32(out,0)?;le32(out,0)?;le64(out,count)?;le64(out,count)?;le64(out,size)?;le64(out,start)?;
  le32(out,0x07064b50)?;le32(out,0)?;le64(out,pos)?;le32(out,1)?;
 }
 le32(out,0x06054b50)?;le16(out,0)?;le16(out,0)?;le16(out,count.min(65535) as u16)?;le16(out,count.min(65535) as u16)?;le32(out,narrow(size))?;le32(out,narrow(start))?;le16(out,0)
}
pub fn archive(stage:String,output:String,names:Vec<String>)->Result<String,String>{
 if names.is_empty()||names.len()>24{return Err("Selecione de 1 a 24 vídeos".into())}
 let stage=stage_path(&stage)?;let output=output_path(&output)?;
 let mut seen=HashSet::new();let mut members=Vec::new();
 for name in names{
  if !valid_name(&name)||!seen.insert(name.clone()){return Err("Nome de vídeo inválido ou repetido".into())}
  let source=stage.join(&name);let canonical=fs::canonicalize(&source).map_err(|e|format!("Vídeo {name} indisponível: {e}"))?;
  if canonical.parent()!=Some(stage.as_path()){return Err("O arquivo está fora da pasta temporária".into())}
  let meta=fs::metadata(&canonical).map_err(|e|e.to_string())?;
  if !meta.is_file()||meta.len()==0{return Err(format!("Vídeo vazio ou incompleto: {name}"))}
  members.push(Member{name:format!("RDV_Bus_Studio/{name}"),src:canonical,crc:0,size:meta.len(),offset:0});
 }
 let mut out=OpenOptions::new().create_new(true).write(true).open(&output).map_err(|e|format!("Não foi possível criar ZIP: {e}"))?;
 let result=(||->Io<()>{
  for m in &mut members{
   m.offset=out.stream_position()?;local(&mut out,m)?;
   let (crc,n)=copy_crc(&mut File::open(&m.src)?,&mut out)?;
   if n!=m.size{return Err(std::io::Error::new(std::io::ErrorKind::InvalidData,"Tamanho do vídeo mudou durante compactação"))}
   m.crc=crc;let end=out.stream_position()?;out.seek(SeekFrom::Start(m.offset+14))?;le32(&mut out,crc)?;out.seek(SeekFrom::Start(end))?;
  }
  let start=out.stream_position()?;for m in &members{central(&mut out,m)?;}
  let size=out.stream_position()?-start;end_records(&mut out,start,size,members.len() as u64,members.iter().any(|m|big(m.size)||big(m.offset)))?;out.flush()?;out.sync_all()
 })();
 drop(out);if let Err(e)=result{let _=fs::remove_file(&output);return Err(format!("Falha ao gravar ZIP: {e}"))}Ok(output.to_string_lossy().into_owned())
}
#[cfg(test)]mod tests{
 use super::*;
 #[test]fn safe_names(){assert!(valid_name("01_Ficha.mkv"));assert!(!valid_name("../secret.mkv"));assert!(!valid_name("a.zip"));}
 #[test]fn archive_roundtrip_headers(){
  let target=std::env::temp_dir().join(format!("rdv-zip-{}.zip",SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));
  let path=target.to_string_lossy().into_owned();let stage=stage_create(Some(path.clone())).unwrap();
  for name in ["01_Ficha.mkv","02_Local.mkv"]{fs::write(Path::new(&stage).join(name),b"123456789").unwrap();}
  archive(stage.clone(),path.clone(),vec!["01_Ficha.mkv".into(),"02_Local.mkv".into()]).unwrap();
  let bytes=fs::read(&target).unwrap();assert!(bytes.starts_with(b"PK\x03\x04"));assert_eq!(&bytes[14..18],&0xcbf43926u32.to_le_bytes());assert!(bytes.windows(4).any(|v|v==b"PK\x05\x06"));
  assert!(stage_create(Some(path.clone())).is_err());assert!(archive(stage.clone(),path,vec!["01_Ficha.mkv".into()]).is_err());
  if let Ok(dest)=std::env::var("RDV_ZIP_TEST_OUTPUT"){fs::copy(&target,dest).unwrap();}
  stage_cleanup(stage).unwrap();fs::remove_file(target).unwrap();
 }
 #[test]fn zip64_offsets_and_sizes(){
  let mut b=vec![];let m=Member{name:"big.mkv".into(),src:PathBuf::new(),crc:0,size:5_000_000_000,offset:6_000_000_000};central(&mut b,&m).unwrap();
  assert_eq!(&b[20..28],&[255;8]);assert_eq!(&b[42..46],&[255;4]);assert_eq!(&b[53..57],&[1,0,24,0]);assert_eq!(&b[57..65],&m.size.to_le_bytes());assert_eq!(&b[73..81],&m.offset.to_le_bytes());
  b.clear();end_records(&mut b,6_000_000_000,123,2,true).unwrap();assert_eq!(&b[..4],b"PK\x06\x06");assert_eq!(&b[56..60],b"PK\x06\x07");assert_eq!(&b[76..80],b"PK\x05\x06");
 }
}
