use crate::db::{get_all_rules, get_all_transactions, get_setting, init_db};
use crate::models::{AppData, Transaction};
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
            .prepare("INSERT INTO category_rules (id, keyword, category, rule_type) VALUES (?1, ?2, ?3, ?4)")
            .map_err(|e| e.to_string())?;
        for r in data.category_rules {
            stmt.execute(params![r.id, r.keyword, r.category, r.rule_type])
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

use crate::ai::classifier::CategoryCandidate;

const AI_INCOME_CATEGORIES: &[CategoryCandidate] = &[
    CategoryCandidate {
        name: "Salary",
        prompt: "salary wages payroll employer payg income earnings monthly pay direct credit bonus commission work payment group certificate",
    },
    CategoryCandidate {
        name: "Refunds",
        prompt: "refund return reversal credit reimbursement transaction voided money back merchant credit adjustment rectified",
    },
    CategoryCandidate {
        name: "Selling Items",
        prompt: "selling items online marketplace gumtree ebay depop facebook market sales second hand garage sale sold item proceeds",
    },
    CategoryCandidate {
        name: "Government & Tax",
        prompt: "ato tax return centrelink medicare rebate government benefits family assistance pension subsidy",
    },
    CategoryCandidate {
        name: "Investment Income",
        prompt: "interest paid dividend distribution bank interest staking rewards crypto earnings commsec returns",
    },
    CategoryCandidate {
        name: "Transfers In",
        prompt: "incoming transfer deposit payid osko payment from friend family split bill receive money",
    },
    CategoryCandidate {
        name: "Family Transfer",
        prompt: "Transfer To Tkachuk",
    },
    CategoryCandidate {
        name: "Other Income",
        prompt: "general deposit unknown income cash deposit miscellaneous credit",
    },
];

const AI_EXPENSE_CATEGORIES: &[CategoryCandidate] = &[
    CategoryCandidate {
        name: "Groceries",
        prompt: "supermarket grocery store food market bakery butcher fruit veg woolworths coles aldi iga harris farm 7-eleven convenience store",
    },
    CategoryCandidate {
        name: "Eating Out",
        prompt: "restaurant cafe coffee shop bar pub bistro fast food takeaway mcdonalds kfc hungry jacks uber eats menulog doordash starbucks domino's",
    },
    CategoryCandidate {
        name: "Housing",
        prompt: "rent mortgage payment lease strata council rates body corporate real estate agency accommodation housing repair maintenance",
    },
    CategoryCandidate {
        name: "Utilities",
        prompt: "electricity gas water bill power internet nbn mobile phone plan telstra optus vodafone tpg origin agl aurora energy taswater",
    },
    CategoryCandidate {
        name: "Transportation",
        prompt: "petrol station fuel gas servo car wash parking public transport train bus ferry tram taxi uber didi ola rego vicroads service nsw",
    },
    CategoryCandidate {
        name: "Shopping",
        prompt: "clothing shoes electronics hardware department store online shopping amazon ebay kmart big w target myer david jones bunnings jb hi-fi officeworks",
    },
    CategoryCandidate {
        name: "Health",
        prompt: "pharmacy chemist warehouse drug store doctor gp medical centre dentist dental clinic hospital pathology optometrist specsavers medibank bupa",
    },
    CategoryCandidate {
        name: "Entertainment",
        prompt: "movies cinema theatre concert tickets events gaming video games steam playstation xbox bowling fun park hoyts event cinemas ticketek betting",
    },
    CategoryCandidate {
        name: "Subscriptions",
        prompt: "monthly subscription recurring payment streaming service netflix spotify apple icloud youtube premium stan kayo binge foxtel disney plus patreon",
    },
    CategoryCandidate {
        name: "Education",
        prompt: "school fees university college tafe tuition course training books stationery library udemy coursera text books learning",
    },
    CategoryCandidate {
        name: "Gifts & Donations",
        prompt: "charity donation fundraising non-profit gift present florist flowers red cross salvation army vinnies birthday christmas wedding",
    },
    CategoryCandidate {
        name: "Travel",
        prompt: "airline flight plane ticket hotel motel accommodation airbnb booking.com expedia qantas jetstar virgin australia travel agency holiday tourism",
    },
    CategoryCandidate {
        name: "Investments",
        prompt: "savings deposit investment share trading stock market crypto currency bitcoin exchange brokerage commsec raiz stake superannuation vanguard",
    },
    CategoryCandidate {
        name: "Hobby",
        prompt: "hobbies arts crafts sewing sports equipment outdoor camping fishing music instrument spotlight anaconda bcf rebel sport camera photography",
    },
    CategoryCandidate {
        name: "General",
        prompt: "general miscellaneous unknown service bank fee transaction atm withdrawal cash postage post office",
    },
    CategoryCandidate {
        name: "Family Transfer",
        prompt: "transfer to wife husband partner joint account family",
    },
];

// Helper to clean description for AI
fn preprocess_description(text: &str) -> String {
    let mut cleaned = text.to_lowercase();

    // Remove specific Australian geo terms commonly found in bank statements
    let geo_terms = [
        "sydney",
        "melbourne",
        "brisbane",
        "perth",
        "adelaide",
        "hobart",
        "canberra",
        "darwin",
        "nsw",
        "vic",
        "qld",
        "wa",
        "sa",
        "tas",
        "act",
        "nt",
        "australia",
        "au",
        "aus",
        "balmain",
        "dural",
        "sandy bay",
        "sorell",
        "kingston",
        "wisemans", // User specific likely locations
    ];

    for term in geo_terms {
        cleaned = cleaned.replace(term, "");
    }

    cleaned
        .chars()
        .map(|c| {
            if c.is_alphabetic() || c.is_whitespace() {
                c
            } else {
                ' '
            }
        }) // Keep only letters and spaces (replace others with space)
        .collect::<String>()
        .split_whitespace() // Split by whitespace to handle multiple spaces
        .collect::<Vec<&str>>()
        .join(" ") // Join back with single space
}

#[derive(serde::Serialize)]
pub struct Summary {
    pub total_income: f64,
    pub total_expense: f64,
    pub net_balance: f64,
}

#[tauri::command]
pub fn calculate_summary(transactions: Vec<Transaction>) -> Summary {
    let mut total_income = 0.0;
    let mut total_expense = 0.0;

    for t in transactions {
        if t.category == "Family Transfer" {
            continue;
        }

        if t.amount > 0.0 {
            total_income += t.amount;
        } else {
            total_expense += t.amount.abs();
        }
    }

    Summary {
        total_income,
        total_expense,
        net_balance: total_income - total_expense,
    }
}

#[tauri::command]
pub fn parse_csv(
    content: String,
    app_handle: AppHandle,
    state: tauri::State<'_, crate::AiState>,
) -> Result<Vec<Transaction>, String> {
    let conn = get_db_connection(&app_handle)?;
    // Content is passed directly now
    let rules = get_all_rules(&conn).map_err(|e| e.to_string())?;

    let mut rdr = csv::ReaderBuilder::new()
        .has_headers(false)
        .from_reader(content.as_bytes());

    let mut transactions = Vec::new();

    // Lock AI once around the loop
    let mut classifier_guard = state.0.lock().map_err(|e| e.to_string())?;

    for (index, result) in rdr.records().enumerate() {
        let record = result.map_err(|e| e.to_string())?;

        // Basic validation
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

        // 1. Parse Date (DD/MM/YYYY -> YYYY-MM-DD)
        let parts: Vec<&str> = date_str.split('/').collect();
        let iso_date = if parts.len() == 3 {
            // Basic zero padding helper
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
            if date_str.contains('-') {
                date_str.to_string()
            } else {
                chrono::Utc::now().format("%Y-%m-%d").to_string()
            }
        };

        let amount: f64 = amount_str.parse().unwrap_or(0.0);
        let transaction_type = if amount >= 0.0 { "income" } else { "expense" };

        let mut category = "Uncategorized".to_string();
        let lower_desc = description.to_lowercase();

        // 2. Rule Matching
        for rule in &rules {
            // Check Rule Type Compatibility
            let rule_applies = match rule.rule_type.as_str() {
                "income" => amount >= 0.0,
                "expense" => amount < 0.0,
                _ => true, // "any" or default
            };

            if rule_applies && lower_desc.contains(&rule.keyword.to_lowercase()) {
                category = rule.category.clone();
                break;
            }
        }

        // 3. AI Classification (if no rule matched)
        if category == "Uncategorized" {
            // Check if AI is loaded
            if let Some(classifier) = &mut *classifier_guard {
                // Preprocess for clean input
                let clean_desc = preprocess_description(&description);

                // Pass defined categories based on type
                let categories_to_use = if amount >= 0.0 {
                    AI_INCOME_CATEGORIES
                } else {
                    AI_EXPENSE_CATEGORIES
                };

                let (pred_cat, score) = classifier.classify(&clean_desc, categories_to_use);

                // Apply if confident enough
                if score > 0.4 {
                    category = pred_cat;
                }
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
    _categories: Vec<String>, // Unused now
    state: tauri::State<'_, crate::AiState>,
) -> Result<(String, f32), String> {
    let mut classifier_guard = state.0.lock().map_err(|e| e.to_string())?;

    if let Some(classifier) = &mut *classifier_guard {
        // Default to expense categories for manual test, or could accept type param
        Ok(classifier.classify(&description, AI_EXPENSE_CATEGORIES))
    } else {
        Err("AI Model not loaded".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::Transaction;

    #[test]
    fn test_calculate_summary() {
        let transactions = vec![
            Transaction {
                id: "1".to_string(),
                date: "2023-01-01".to_string(),
                amount: 1000.0,
                description: "Salary".to_string(),
                r#type: "income".to_string(),
                category: "Salary".to_string(),
                original_line: None,
            },
            Transaction {
                id: "2".to_string(),
                date: "2023-01-02".to_string(),
                amount: -200.0,
                description: "Groceries".to_string(),
                r#type: "expense".to_string(),
                category: "Groceries".to_string(),
                original_line: None,
            },
            Transaction {
                id: "3".to_string(),
                date: "2023-01-03".to_string(),
                amount: -500.0,
                description: "Transfer to Wife".to_string(),
                r#type: "expense".to_string(),
                category: "Family Transfer".to_string(),
                original_line: None,
            },
            Transaction {
                id: "4".to_string(),
                date: "2023-01-04".to_string(),
                amount: 500.0,
                description: "Transfer from Husband".to_string(),
                r#type: "income".to_string(),
                category: "Family Transfer".to_string(),
                original_line: None,
            },
        ];

        let summary = calculate_summary(transactions);

        // Income should be 1000 (Salary) - 500 (Transfer In excluded)
        assert_eq!(summary.total_income, 1000.0);

        // Expense should be 200 (Groceries) - 500 (Transfer Out excluded)
        assert_eq!(summary.total_expense, 200.0);

        // Net balance should be 1000 - 200 = 800
        assert_eq!(summary.net_balance, 800.0);
    }
}
