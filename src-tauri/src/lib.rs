mod ai;
mod commands;
mod db;
mod models;

use commands::{calculate_summary, classify_transaction, load_data, parse_csv, save_data, export_sync_file};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

use crate::ai::classifier::SemanticClassifier;
use std::sync::Mutex;
use tauri::Manager;

// Wrapper for state to be potentially uninitialized or failed
pub struct AiState(pub Mutex<Option<SemanticClassifier>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AiState(Mutex::new(None)))
        .setup(|app| {
            let handle = app.handle().clone();

            let is_thin = option_env!("VITE_APP_MODE") == Some("thin")
                || std::env::var("VITE_APP_MODE").map(|v| v == "thin").unwrap_or(false);

            if !is_thin {
                // Programmatically set ORT_DYLIB_PATH if not already set in environment
                if std::env::var("ORT_DYLIB_PATH").is_err() {
                    #[cfg(target_os = "windows")]
                    let dylib_filename = "onnxruntime.dll";
                    #[cfg(target_os = "macos")]
                    let dylib_filename = "libonnxruntime.dylib";
                    #[cfg(target_os = "linux")]
                    let dylib_filename = "libonnxruntime.so";

                    let dylib_path = handle
                        .path()
                        .resolve(dylib_filename, tauri::path::BaseDirectory::Resource);

                    match dylib_path {
                        Ok(path) if path.exists() => {
                            unsafe { std::env::set_var("ORT_DYLIB_PATH", &path); }
                            println!("AI Init: Set ORT_DYLIB_PATH from resource path to {:?}", path);
                        }
                        _ => {
                            if let Ok(mut exe_dir) = std::env::current_exe() {
                                exe_dir.pop();
                                let local_path = exe_dir.join(dylib_filename);
                                if local_path.exists() {
                                    unsafe { std::env::set_var("ORT_DYLIB_PATH", &local_path); }
                                    println!("AI Init: Set ORT_DYLIB_PATH from executable dir to {:?}", local_path);
                                } else {
                                    let dev_path = std::path::PathBuf::from(dylib_filename);
                                    if dev_path.exists() {
                                        if let Ok(abs_dev_path) = dev_path.canonicalize() {
                                            unsafe { std::env::set_var("ORT_DYLIB_PATH", &abs_dev_path); }
                                            println!("AI Init: Set ORT_DYLIB_PATH from CWD to {:?}", abs_dev_path);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                tauri::async_runtime::spawn(async move {
                    // Resolve resource path for models
                    let resource_path = handle
                        .path()
                        .resolve("assets", tauri::path::BaseDirectory::Resource);

                    match resource_path {
                        Ok(path) => {
                            // println!("Loading AI model from {:?}", path);
                            match SemanticClassifier::new(path) {
                                Ok(classifier) => {
                                    let state = handle.state::<AiState>();
                                    *state.0.lock().unwrap() = Some(classifier);
                                    println!("AI Model loaded successfully");
                                }
                                Err(e) => eprintln!("Failed to load AI model: {}", e),
                            }
                        }
                        Err(e) => eprintln!("Failed to resolve asset path: {}", e),
                    }
                });
            } else {
                println!("AI Loading skipped: VITE_APP_MODE is set to 'thin'");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            parse_csv,
            save_data,
            load_data,
            classify_transaction,
            calculate_summary,
            export_sync_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
