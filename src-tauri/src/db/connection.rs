use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous};
use sqlx::SqlitePool;
use std::path::PathBuf;
use std::str::FromStr;

pub async fn create_pool(db_path: PathBuf) -> Result<SqlitePool, sqlx::Error> {
    let db_url = format!("sqlite://{}", db_path.display());

    let options = SqliteConnectOptions::from_str(&db_url)?
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal) // Write-Ahead Logging for better concurrency
        .synchronous(SqliteSynchronous::Normal) // Balance between safety and performance
        .foreign_keys(true); // Enable foreign key constraints

    SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
}
