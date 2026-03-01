use std::env;
use std::fs;
use std::path::Path;

fn main() {
    // Tauri's build script validates that sidecar binaries declared in
    // tauri.conf.json exist on disk.  In CI and during initial development the
    // real compiled binary is not yet present, so we create an empty placeholder
    // to satisfy the build system.  The real binary replaces this at runtime.
    create_sidecar_stub();

    tauri_build::build()
}

/// Create an empty placeholder for the epik-sidecar binary if it does not yet
/// exist.  The file must be present for the Tauri build to succeed; the actual
/// binary is produced by `pnpm build:sidecar` and placed here by the bundle
/// script.
fn create_sidecar_stub() {
    let target_triple = env::var("TAURI_ENV_TARGET_TRIPLE")
        .or_else(|_| env::var("TARGET"))
        .unwrap_or_else(|_| "unknown".to_string());

    let extension = if target_triple.contains("windows") {
        ".exe"
    } else {
        ""
    };

    let binary_name = format!("epik-sidecar-{target_triple}{extension}");
    let binaries_dir = Path::new("binaries");
    let binary_path = binaries_dir.join(&binary_name);

    if !binary_path.exists() {
        fs::create_dir_all(binaries_dir).expect("Failed to create binaries directory");
        fs::write(&binary_path, b"").expect("Failed to create sidecar stub binary");
        println!(
            "cargo:warning=Created sidecar stub at {}",
            binary_path.display()
        );
    }

    println!("cargo:rerun-if-changed=binaries/{binary_name}");
}
