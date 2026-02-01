use crate::models::{CategoryRule, Transaction};
use rusqlite::{Connection, Result, params};
use std::path::Path;

pub fn init_db<P: AsRef<Path>>(path: P) -> Result<Connection> {
    let conn = Connection::open(path)?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT NOT NULL,
            type TEXT NOT NULL,
            category TEXT NOT NULL,
            original_line TEXT
        )",
        [],
    )?;

    // Check if column exists, if not add it (simple migration)
    // Rusqlite's `pragma_table_info` is handy but let's just try to add it and ignore error if it exists
    // Duplicate column error is strictly safe to ignore for "add if not exists" logic in sqlite?
    // Actually, explicit check is cleaner.

    conn.execute(
        "CREATE TABLE IF NOT EXISTS category_rules (
            id TEXT PRIMARY KEY,
            keyword TEXT NOT NULL,
            category TEXT NOT NULL,
            rule_type TEXT DEFAULT 'any'
        )",
        [],
    )?;

    // Lazy migration for existing tables: Try to add column
    let _ = conn.execute(
        "ALTER TABLE category_rules ADD COLUMN rule_type TEXT DEFAULT 'any'",
        [],
    );

    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )?;

    Ok(conn)
}

pub fn get_all_transactions(conn: &Connection) -> Result<Vec<Transaction>> {
    let mut stmt = conn.prepare(
        "SELECT id, date, amount, description, type, category, original_line FROM transactions",
    )?;
    let transaction_iter = stmt.query_map([], |row| {
        Ok(Transaction {
            id: row.get(0)?,
            date: row.get(1)?,
            amount: row.get(2)?,
            description: row.get(3)?,
            r#type: row.get(4)?,
            category: row.get(5)?,
            original_line: row.get(6)?,
        })
    })?;

    let mut transactions = Vec::new();
    for transaction in transaction_iter {
        transactions.push(transaction?);
    }
    Ok(transactions)
}

pub fn get_all_rules(conn: &Connection) -> Result<Vec<CategoryRule>> {
    // We check if table *has* the column first? No, we just select * or check schema.
    // If migration above worked, it should have the column.

    // Fallback: If migration failed for some reason, we might panic on column access.
    // We assume the strict migration above works.

    let mut stmt = conn.prepare("SELECT id, keyword, category, rule_type FROM category_rules")?;
    let rules_iter = stmt.query_map([], |row| {
        Ok(CategoryRule {
            id: row.get(0)?,
            keyword: row.get(1)?,
            category: row.get(2)?,
            rule_type: row.get(3).unwrap_or("any".to_string()),
        })
    })?;

    let mut rules = Vec::new();
    for rule in rules_iter {
        rules.push(rule?);
    }
    Ok(rules)
}

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>> {
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
    let mut rows = stmt.query(params![key])?;

    if let Some(row) = rows.next()? {
        Ok(Some(row.get(0)?))
    } else {
        Ok(None)
    }
}

pub fn save_setting(conn: &Connection, key: &str, value: &str) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    )?;
    Ok(())
}
