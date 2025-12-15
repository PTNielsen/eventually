use crate::error::AppError;
use crate::models::{Category, CreateCategoryInput, UpdateCategoryInput};
use sqlx::SqlitePool;
use tauri::State;

#[tauri::command]
pub async fn create_category(
    pool: State<'_, SqlitePool>,
    input: CreateCategoryInput,
) -> Result<Category, AppError> {
    let now = chrono::Utc::now().timestamp();

    let category = sqlx::query_as::<_, Category>(
        r#"
        INSERT INTO categories (name, color, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        RETURNING *
        "#,
    )
    .bind(&input.name)
    .bind(&input.color)
    .bind(now)
    .bind(now)
    .fetch_one(pool.inner())
    .await?;

    Ok(category)
}

#[tauri::command]
pub async fn get_all_categories(pool: State<'_, SqlitePool>) -> Result<Vec<Category>, AppError> {
    let categories = sqlx::query_as::<_, Category>("SELECT * FROM categories ORDER BY name ASC")
        .fetch_all(pool.inner())
        .await?;

    Ok(categories)
}

#[tauri::command]
pub async fn update_category(
    pool: State<'_, SqlitePool>,
    id: i64,
    input: UpdateCategoryInput,
) -> Result<Category, AppError> {
    let now = chrono::Utc::now().timestamp();

    // Use QueryBuilder for safe dynamic query construction
    let mut builder = sqlx::QueryBuilder::new("UPDATE categories SET updated_at = ");
    builder.push_bind(now);

    if let Some(name) = input.name {
        builder.push(", name = ");
        builder.push_bind(name);
    }
    if let Some(color) = input.color {
        builder.push(", color = ");
        builder.push_bind(color);
    }

    builder.push(" WHERE id = ");
    builder.push_bind(id);
    builder.push(" RETURNING *");

    let category = builder
        .build_query_as::<Category>()
        .fetch_one(pool.inner())
        .await?;

    Ok(category)
}

#[tauri::command]
pub async fn delete_category(pool: State<'_, SqlitePool>, id: i64) -> Result<(), AppError> {
    sqlx::query("DELETE FROM categories WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await?;

    Ok(())
}
