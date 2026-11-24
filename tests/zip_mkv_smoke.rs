#[path="../src-tauri/src/production_zip.rs"]
mod production_zip;
fn main(){
 let args:Vec<String>=std::env::args().collect();
 let stage=production_zip::stage_create(Some(args[2].clone())).unwrap();
 let mut files=Vec::new();
 for name in ["01_Ficha_Tecnica.mkv","02_Local.mkv"]{
  std::fs::copy(&args[1],std::path::Path::new(&stage).join(name)).unwrap();
  files.push(name.to_owned());
 }
 production_zip::archive(stage.clone(),args[2].clone(),files).unwrap();
 production_zip::stage_cleanup(stage).unwrap();
}
