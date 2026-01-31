mod ai;
mod commands;
mod db;
mod models;

use commands::{classify_transaction, load_data, parse_csv, save_data};

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
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            parse_csv,
            save_data,
            load_data,
            classify_transaction
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
