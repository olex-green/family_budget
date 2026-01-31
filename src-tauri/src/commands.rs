use crate::db::{get_all_rules, get_all_transactions, get_setting, init_db, save_setting};
use crate::models::{AppData, CategoryRule, Transaction};
use tauri::{AppHandle, Manager};
// use tauri_plugin_fs::FilePath; // Not needed if we parse content in JS
use rusqlite::{Connection, params};
use std::fs;

fn get_db_connection(app_handle: &AppHandle) -> Result<Connection, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }
    let db_path = app_dir.join("family_budget.db");
    init_db(db_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_data(app_handle: AppHandle) -> Result<AppData, String> {
    let conn = get_db_connection(&app_handle)?;

    let transactions = get_all_transactions(&conn).map_err(|e| e.to_string())?;
    let rules = get_all_rules(&conn).map_err(|e| e.to_string())?;
    let initial_capital_str = get_setting(&conn, "initialCapital").map_err(|e| e.to_string())?;
    let initial_capital = initial_capital_str
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.0);

    let active_year_str = get_setting(&conn, "activeYear").map_err(|e| e.to_string())?;
    let active_year = active_year_str
        .and_then(|s| s.parse().ok())
        .unwrap_or_else(|| {
            chrono::Utc::now()
                .format("%Y")
                .to_string()
                .parse()
                .unwrap_or(2025)
        });

    Ok(AppData {
        transactions,
        last_updated: chrono::Utc::now().to_rfc3339(), // or store in DB? relying on runtime for now
        initial_capital,
        category_rules: rules,
        active_year,
    })
}

#[tauri::command]
pub fn save_data(data: AppData, app_handle: AppHandle) -> Result<(), String> {
    let mut conn = get_db_connection(&app_handle)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Strategy: Full sync (Delete all and re-insert) to match previous behavior
    // This is inefficient but safe for the "Frontend sends full state" architecture.
    // Ideally we would have specific add/update commands.

    // 1. Transactions
    tx.execute("DELETE FROM transactions", [])
        .map_err(|e| e.to_string())?;
    {
        let mut stmt = tx.prepare("INSERT INTO transactions (id, date, amount, description, type, category, original_line) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)").map_err(|e| e.to_string())?;
        for t in data.transactions {
            stmt.execute(params![
                t.id,
                t.date,
                t.amount,
                t.description,
                t.r#type,
                t.category,
                t.original_line
            ])
            .map_err(|e| e.to_string())?;
        }
    }

    // 2. Rules
    tx.execute("DELETE FROM category_rules", [])
        .map_err(|e| e.to_string())?;
    {
        let mut stmt = tx
            .prepare("INSERT INTO category_rules (id, keyword, category) VALUES (?1, ?2, ?3)")
            .map_err(|e| e.to_string())?;
        for r in data.category_rules {
            stmt.execute(params![r.id, r.keyword, r.category])
                .map_err(|e| e.to_string())?;
        }
    }

    // 3. Settings
    tx.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params!["initialCapital", data.initial_capital.to_string()],
    )
    .map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params!["activeYear", data.active_year.to_string()],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn parse_csv(content: String, rules: Vec<CategoryRule>) -> Result<Vec<Transaction>, String> {
    let mut transactions = Vec::new();
    let mut rdr = csv::ReaderBuilder::new()
        .has_headers(false)
        .from_reader(content.as_bytes());

    for (index, result) in rdr.records().enumerate() {
        let record = result.map_err(|e| e.to_string())?;

        if record.len() < 3 {
            continue;
        }

        let date_str = record.get(0).unwrap_or("").trim();
        let amount_str = record
            .get(1)
            .unwrap_or("0")
            .trim()
            .replace("\"", "")
            .replace(",", "");
        let description = record.get(2).unwrap_or("").trim().to_string();

        // Parse date DD/MM/YYYY -> YYYY-MM-DD
        let parts: Vec<&str> = date_str.split('/').collect();
        let iso_date = if parts.len() == 3 {
            // Basic zero padding
            let day = if parts[0].len() == 1 {
                format!("0{}", parts[0])
            } else {
                parts[0].to_string()
            };
            let month = if parts[1].len() == 1 {
                format!("0{}", parts[1])
            } else {
                parts[1].to_string()
            };
            format!("{}-{}-{}", parts[2], month, day)
        } else {
            chrono::Utc::now().format("%Y-%m-%d").to_string()
        };

        let amount: f64 = amount_str.parse().unwrap_or(0.0);
        let transaction_type = if amount >= 0.0 { "income" } else { "expense" };

        let mut category = "Uncategorized".to_string();
        let lower_desc = description.to_lowercase();
        for rule in &rules {
            if lower_desc.contains(&rule.keyword.to_lowercase()) {
                category = rule.category.clone();
                break;
            }
        }

        transactions.push(Transaction {
            id: format!("tx-{}-{}", chrono::Utc::now().timestamp_millis(), index),
            date: iso_date,
            amount,
            description,
            r#type: transaction_type.to_string(),
            category,
            original_line: Some(format!("{:?}", record)),
        });
    }

    Ok(transactions)
}

#[tauri::command]
pub fn classify_transaction(
    description: String,
    categories: Vec<String>,
    state: tauri::State<'_, crate::AiState>,
) -> Result<(String, f32), String> {
    let classifier_guard = state.0.lock().map_err(|e| e.to_string())?;

    if let Some(classifier) = &*classifier_guard {
        Ok(classifier.classify(&description, &categories))
    } else {
        // AI not loaded yet or failed
        // Fallback or error? Logic says return "Uncategorized" or error.
        // Let's return error so frontend can decide (or retry).
        Err("AI Model not loaded".to_string())
    }
}
