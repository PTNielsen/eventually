use crate::error::AppError;
use crate::models::{build_task_tree, CreateTaskInput, Task, TaskTree, UpdateTaskInput};
use sqlx::SqlitePool;
use tauri::State;

// Validation function for task input
fn validate_task_title(title: &str) -> Result<(), AppError> {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        return Err(AppError::ValidationError("Title cannot be empty".to_string()));
    }
    if trimmed.len() > 500 {
        return Err(AppError::ValidationError(
            "Title is too long (max 500 characters)".to_string(),
        ));
    }
    Ok(())
}

// Helper function to get the next position for a task
async fn get_next_position(
    pool: &SqlitePool,
    parent_id: Option<i64>,
    category_id: Option<i64>,
) -> Result<i32, AppError> {
    let result: Option<(i32,)> = sqlx::query_as(
        r#"
        SELECT COALESCE(MAX(position), -1) + 1 as next_pos
        FROM tasks
        WHERE parent_id IS ? AND category_id IS ?
        "#,
    )
    .bind(parent_id)
    .bind(category_id)
    .fetch_optional(pool)
    .await?;

    Ok(result.map(|r| r.0).unwrap_or(0))
}

#[tauri::command]
pub async fn create_task(
    pool: State<'_, SqlitePool>,
    input: CreateTaskInput,
) -> Result<Task, AppError> {
    // Validate input
    validate_task_title(&input.title)?;

    let now = chrono::Utc::now().timestamp();
    let position = get_next_position(&pool, input.parent_id, input.category_id).await?;
    let title_trimmed = input.title.trim();

    let task = sqlx::query_as::<_, Task>(
        r#"
        INSERT INTO tasks (title, description, category_id, priority, parent_id, position, due_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
        "#,
    )
    .bind(title_trimmed)
    .bind(&input.description)
    .bind(input.category_id)
    .bind(&input.priority)
    .bind(input.parent_id)
    .bind(position)
    .bind(input.due_date)
    .bind(now)
    .bind(now)
    .fetch_one(pool.inner())
    .await?;

    Ok(task)
}

#[tauri::command]
pub async fn get_all_tasks(pool: State<'_, SqlitePool>) -> Result<Vec<Task>, AppError> {
    let tasks = sqlx::query_as::<_, Task>("SELECT * FROM tasks ORDER BY position ASC")
        .fetch_all(pool.inner())
        .await?;

    Ok(tasks)
}

#[tauri::command]
pub async fn get_task_tree(pool: State<'_, SqlitePool>) -> Result<Vec<TaskTree>, AppError> {
    let tasks = get_all_tasks(pool).await?;
    Ok(build_task_tree(tasks))
}

#[tauri::command]
pub async fn update_task(
    pool: State<'_, SqlitePool>,
    id: i64,
    input: UpdateTaskInput,
) -> Result<Task, AppError> {
    // Validate title if provided
    if let Some(ref title) = input.title {
        validate_task_title(title)?;
    }

    let now = chrono::Utc::now().timestamp();

    // Use QueryBuilder for safe dynamic query construction
    let mut builder = sqlx::QueryBuilder::new("UPDATE tasks SET updated_at = ");
    builder.push_bind(now);

    if let Some(title) = input.title {
        builder.push(", title = ");
        builder.push_bind(title);
    }
    if let Some(description) = input.description {
        builder.push(", description = ");
        builder.push_bind(description);
    }
    if let Some(category_id) = input.category_id {
        builder.push(", category_id = ");
        builder.push_bind(category_id);
    }
    if let Some(priority) = input.priority {
        builder.push(", priority = ");
        builder.push_bind(priority);
    }
    if let Some(parent_id) = input.parent_id {
        builder.push(", parent_id = ");
        builder.push_bind(parent_id);
    }
    if let Some(position) = input.position {
        builder.push(", position = ");
        builder.push_bind(position);
    }
    if let Some(due_date) = input.due_date {
        builder.push(", due_date = ");
        builder.push_bind(due_date);
    }
    if let Some(is_done) = input.is_done {
        builder.push(", is_done = ");
        builder.push_bind(is_done);
        if is_done {
            builder.push(", completed_at = ");
            builder.push_bind(now);
        } else {
            builder.push(", completed_at = NULL");
        }
    }

    builder.push(" WHERE id = ");
    builder.push_bind(id);
    builder.push(" RETURNING *");

    let task = builder
        .build_query_as::<Task>()
        .fetch_one(pool.inner())
        .await?;

    Ok(task)
}

#[tauri::command]
pub async fn delete_task(pool: State<'_, SqlitePool>, id: i64) -> Result<(), AppError> {
    sqlx::query("DELETE FROM tasks WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await?;

    Ok(())
}

#[tauri::command]
pub async fn reorder_task(
    pool: State<'_, SqlitePool>,
    id: i64,
    new_position: i32,
) -> Result<(), AppError> {
    // Get the task to know its parent and category
    let task: Task = sqlx::query_as("SELECT * FROM tasks WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await?;

    let old_position = task.position;

    if old_position == new_position {
        return Ok(());
    }

    // Shift other tasks in the same group
    if old_position < new_position {
        // Moving down: shift tasks between old and new position up
        sqlx::query(
            r#"
            UPDATE tasks
            SET position = position - 1
            WHERE parent_id IS ?
            AND category_id IS ?
            AND position > ?
            AND position <= ?
            "#,
        )
        .bind(task.parent_id)
        .bind(task.category_id)
        .bind(old_position)
        .bind(new_position)
        .execute(pool.inner())
        .await?;
    } else {
        // Moving up: shift tasks between new and old position down
        sqlx::query(
            r#"
            UPDATE tasks
            SET position = position + 1
            WHERE parent_id IS ?
            AND category_id IS ?
            AND position >= ?
            AND position < ?
            "#,
        )
        .bind(task.parent_id)
        .bind(task.category_id)
        .bind(new_position)
        .bind(old_position)
        .execute(pool.inner())
        .await?;
    }

    // Update the task's position
    sqlx::query("UPDATE tasks SET position = ? WHERE id = ?")
        .bind(new_position)
        .bind(id)
        .execute(pool.inner())
        .await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_task_title_valid() {
        assert!(validate_task_title("Valid title").is_ok());
        assert!(validate_task_title("  Valid title with spaces  ").is_ok());
        assert!(validate_task_title("A").is_ok()); // Single character is valid
    }

    #[test]
    fn test_validate_task_title_empty() {
        let result = validate_task_title("");
        assert!(result.is_err());
        if let Err(AppError::ValidationError(msg)) = result {
            assert_eq!(msg, "Title cannot be empty");
        } else {
            panic!("Expected ValidationError");
        }
    }

    #[test]
    fn test_validate_task_title_whitespace_only() {
        let result = validate_task_title("   ");
        assert!(result.is_err());
        if let Err(AppError::ValidationError(msg)) = result {
            assert_eq!(msg, "Title cannot be empty");
        } else {
            panic!("Expected ValidationError");
        }
    }

    #[test]
    fn test_validate_task_title_too_long() {
        let long_title = "a".repeat(501);
        let result = validate_task_title(&long_title);
        assert!(result.is_err());
        if let Err(AppError::ValidationError(msg)) = result {
            assert_eq!(msg, "Title is too long (max 500 characters)");
        } else {
            panic!("Expected ValidationError");
        }
    }

    #[test]
    fn test_validate_task_title_max_length() {
        // Exactly 500 characters should be valid
        let max_title = "a".repeat(500);
        assert!(validate_task_title(&max_title).is_ok());
    }
}
