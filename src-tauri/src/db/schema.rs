use sqlx::SqlitePool;

pub async fn run_migrations(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Create categories table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create tasks table with self-referencing FK for subtasks
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            category_id INTEGER,
            priority TEXT NOT NULL CHECK(priority IN ('Urgent', 'High', 'Medium', 'Low')),
            parent_id INTEGER,
            is_done BOOLEAN NOT NULL DEFAULT 0,
            position INTEGER NOT NULL,
            due_date INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            completed_at INTEGER,

            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
            FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes for performance
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(is_done)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(position)")
        .execute(pool)
        .await?;

    // Insert default categories if they don't exist
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM categories")
        .fetch_one(pool)
        .await?;

    if count.0 == 0 {
        let now = chrono::Utc::now().timestamp();

        sqlx::query(
            r#"
            INSERT INTO categories (name, color, created_at, updated_at) VALUES
                ('Personal', '#9ece6a', ?, ?),
                ('Tech Guild', '#7aa2f7', ?, ?),
                ('Work', '#e0af68', ?, ?),
                ('Other', '#414868', ?, ?)
            "#,
        )
        .bind(now)
        .bind(now)
        .bind(now)
        .bind(now)
        .bind(now)
        .bind(now)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await?;
    }

    Ok(())
}
