use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Transaction {
    pub id: String,
    pub date: String, // ISO YYYY-MM-DD
    pub amount: f64,
    pub description: String,
    pub r#type: String, // "income" | "expense"
    pub category: String,
    pub original_line: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CategoryRule {
    pub id: String,
    pub keyword: String,
    pub category: String,
    #[serde(default = "default_rule_type")]
    pub rule_type: String, // "income", "expense", "any"
}

fn default_rule_type() -> String {
    "any".to_string()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppData {
    pub transactions: Vec<Transaction>,
    pub last_updated: String,
    pub initial_capital: f64,
    pub category_rules: Vec<CategoryRule>,
    pub active_year: i32,
}

impl Default for AppData {
    fn default() -> Self {
        Self {
            transactions: vec![],
            last_updated: chrono::Utc::now().to_rfc3339(),
            initial_capital: 0.0,
            category_rules: vec![],
            active_year: chrono::Utc::now()
                .format("%Y")
                .to_string()
                .parse()
                .unwrap_or(2025),
        }
    }
}
