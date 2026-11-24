//! Launch host tools independently of AppImage's private dynamic libraries.
use std::{env,ffi::OsStr,path::{Path,PathBuf},process::Command};

pub fn host_command(program:impl AsRef<OsStr>)->Command{
    let mut cmd=Command::new(program);
    #[cfg(target_os="linux")]
    {
        // Never alter the application's own environment: GTK/WebKit still needs it.
        for key in ["LD_LIBRARY_PATH","LD_PRELOAD","LD_AUDIT"]{cmd.env_remove(key);}
        if let Some(path)=env::var_os("PATH"){
            let appdir=env::var_os("APPDIR").map(PathBuf::from);
            let dirs:Vec<_>=env::split_paths(&path).filter(|p|!p.as_os_str().is_empty()&&!appdir.as_ref().is_some_and(|root|p.starts_with(root))).collect();
            if let Ok(clean)=env::join_paths(if dirs.is_empty(){vec![PathBuf::from("/usr/local/bin"),PathBuf::from("/usr/bin"),PathBuf::from("/bin")]}else{dirs}){cmd.env("PATH",clean);}
        }
    }
    cmd
}

pub fn system_ffmpeg()->PathBuf{
    #[cfg(target_os="linux")]
    if Path::new("/usr/bin/ffmpeg").is_file(){return PathBuf::from("/usr/bin/ffmpeg");}
    PathBuf::from(if cfg!(windows){"ffmpeg.exe"}else{"ffmpeg"})
}

#[cfg(all(test,target_os="linux"))]
mod tests{
    use super::*;
    use std::fs;
    #[test]
    fn appimage_pollution_does_not_reach_host_ffmpeg(){
        let root=env::temp_dir().join(format!("rdv-ffmpeg-env-{}",std::process::id()));
        fs::create_dir_all(root.join("usr/lib")).unwrap();
        fs::create_dir_all(root.join("usr/bin")).unwrap();
        // An invalid library reproduces the dynamic loader failure without
        // modifying any system file or depending on a specific ngtcp2 version.
        fs::write(root.join("usr/lib/libc.so.6"),b"invalid private library").unwrap();
        env::set_var("APPDIR",&root);
        env::set_var("LD_LIBRARY_PATH",root.join("usr/lib"));
        env::set_var("LD_PRELOAD","");
        env::set_var("LD_AUDIT","");
        env::set_var("PATH",env::join_paths([root.join("usr/bin"),PathBuf::from("/usr/bin"),PathBuf::from("/bin")]).unwrap());
        let ffmpeg=system_ffmpeg();
        let dirty=Command::new(&ffmpeg).arg("-version").output().unwrap();
        assert!(!dirty.status.success(),"polluted loader must fail");
        let mut clean=host_command(&ffmpeg);
        for name in ["LD_LIBRARY_PATH","LD_PRELOAD","LD_AUDIT"]{
            assert!(clean.get_envs().any(|(k,v)|k==name&&v.is_none()));
        }
        assert!(!env::split_paths(clean.get_envs().find(|(k,_)|*k=="PATH").unwrap().1.unwrap()).any(|p|p.starts_with(&root)));
        let result=clean.arg("-version").output().unwrap();
        assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stderr));
        assert_eq!(env::var_os("LD_LIBRARY_PATH").unwrap(),root.join("usr/lib").into_os_string());
        let file=root.join("test.mkv");
        let result=host_command(&ffmpeg).args(["-v","error","-f","lavfi","-i","color=red@0.5:s=64x64:r=30:d=1,format=bgra","-c:v","ffv1","-pix_fmt","bgra","-threads","2"]).arg(&file).output().unwrap();
        assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stderr));
        assert!(fs::metadata(file).unwrap().len()>0);
        fs::remove_dir_all(root).unwrap();
    }
}
