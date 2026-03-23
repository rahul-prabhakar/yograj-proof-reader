/// Try to load a `.env` file from several candidate locations.
/// This is needed because the working directory varies between
/// `cargo run`, `tauri dev` (cwd = frontend/), and installed bundle.
fn load_dotenv() {
    // Try common paths relative to the cwd and the binary location
    let candidates = [
        ".env",               // cwd (e.g. workspace root or frontend/)
        "backend/.env",       // from workspace root
        "../backend/.env",    // from frontend/
        "../../backend/.env", // from frontend/src-tauri/
    ];
    for path in &candidates {
        if dotenvy::from_path(path).is_ok() {
            eprintln!("[kalash] Loaded env from {path}");
            return;
        }
    }
    // Fallback: standard dotenv lookup
    dotenvy::dotenv().ok();
}

/// Spawn the Axum backend in a background Tokio thread.
fn spawn_backend() {
    std::thread::spawn(|| {
        load_dotenv();
        let rt = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");
        rt.block_on(async {
            if let Err(e) = kalash_backend::run_server().await {
                eprintln!("Kalash backend error: {e}");
            }
        });
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    spawn_backend();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
