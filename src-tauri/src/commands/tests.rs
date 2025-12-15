use crate::db::run_migrations;
use crate::models::{build_task_tree, CreateTaskInput, Task, UpdateTaskInput};
use sqlx::SqlitePool;

async fn setup_test_db() -> SqlitePool {
    // Create in-memory database for testing
    let pool = SqlitePool::connect(":memory:")
        .await
        .expect("Failed to create test database");

    run_migrations(&pool)
        .await
        .expect("Failed to run migrations");

    pool
}

// Helper function to create a task directly (mimicking the command logic)
async fn create_task_helper(
    pool: &SqlitePool,
    input: CreateTaskInput,
) -> Result<Task, Box<dyn std::error::Error>> {
    let now = chrono::Utc::now().timestamp();

    // Get next position
    let result: Option<(i32,)> = sqlx::query_as(
        r#"
        SELECT COALESCE(MAX(position), -1) + 1 as next_pos
        FROM tasks
        WHERE parent_id IS ? AND category_id IS ?
        "#,
    )
    .bind(input.parent_id)
    .bind(input.category_id)
    .fetch_optional(pool)
    .await?;

    let position = result.map(|r| r.0).unwrap_or(0);
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
    .fetch_one(pool)
    .await?;

    Ok(task)
}

async fn get_all_tasks_helper(pool: &SqlitePool) -> Result<Vec<Task>, Box<dyn std::error::Error>> {
    let tasks = sqlx::query_as::<_, Task>("SELECT * FROM tasks ORDER BY position ASC")
        .fetch_all(pool)
        .await?;
    Ok(tasks)
}

async fn delete_task_helper(pool: &SqlitePool, id: i64) -> Result<(), Box<dyn std::error::Error>> {
    sqlx::query("DELETE FROM tasks WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

async fn update_task_helper(
    pool: &SqlitePool,
    id: i64,
    input: UpdateTaskInput,
) -> Result<Task, Box<dyn std::error::Error>> {
    let now = chrono::Utc::now().timestamp();

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

    let task = builder.build_query_as::<Task>().fetch_one(pool).await?;

    Ok(task)
}

#[tokio::test]
async fn test_create_task_success() {
    let pool = setup_test_db().await;

    let input = CreateTaskInput {
        title: "Test Task".to_string(),
        description: Some("Test description".to_string()),
        category_id: None,
        priority: "High".to_string(),
        parent_id: None,
        due_date: None,
    };

    let result = create_task_helper(&pool, input).await;

    assert!(result.is_ok());
    let task = result.unwrap();
    assert_eq!(task.title, "Test Task");
    assert_eq!(task.description, Some("Test description".to_string()));
    assert_eq!(task.priority, "High");
    assert_eq!(task.is_done, false);
    assert_eq!(task.position, 0);
}

#[tokio::test]
async fn test_create_task_empty_title_creates_empty_task() {
    let pool = setup_test_db().await;

    let input = CreateTaskInput {
        title: "   ".to_string(), // Only whitespace - trimming makes it empty
        description: None,
        category_id: None,
        priority: "Medium".to_string(),
        parent_id: None,
        due_date: None,
    };

    // Without validation in helper, this will create a task with empty title
    // The real validation happens in the Tauri command
    let result = create_task_helper(&pool, input).await;

    // This test just ensures the DB operation works
    assert!(result.is_ok());
    assert_eq!(result.unwrap().title, "");
}

#[tokio::test]
async fn test_create_task_long_title() {
    let pool = setup_test_db().await;

    let long_title = "a".repeat(501);
    let input = CreateTaskInput {
        title: long_title.clone(),
        description: None,
        category_id: None,
        priority: "Medium".to_string(),
        parent_id: None,
        due_date: None,
    };

    // DB will accept this; validation happens at command level
    let result = create_task_helper(&pool, input).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_create_task_trims_whitespace() {
    let pool = setup_test_db().await;

    let input = CreateTaskInput {
        title: "  Task with spaces  ".to_string(),
        description: None,
        category_id: None,
        priority: "Low".to_string(),
        parent_id: None,
        due_date: None,
    };

    let result = create_task_helper(&pool, input).await;

    assert!(result.is_ok());
    let task = result.unwrap();
    assert_eq!(task.title, "Task with spaces");
}

#[tokio::test]
async fn test_get_all_tasks() {
    let pool = setup_test_db().await;

    // Create two tasks
    let input1 = CreateTaskInput {
        title: "Task 1".to_string(),
        description: None,
        category_id: None,
        priority: "High".to_string(),
        parent_id: None,
        due_date: None,
    };
    create_task_helper(&pool, input1)
        .await
        .unwrap();

    let input2 = CreateTaskInput {
        title: "Task 2".to_string(),
        description: None,
        category_id: None,
        priority: "Low".to_string(),
        parent_id: None,
        due_date: None,
    };
    create_task_helper(&pool, input2)
        .await
        .unwrap();

    let tasks = get_all_tasks_helper(&pool).await.unwrap();

    assert_eq!(tasks.len(), 2);
    assert_eq!(tasks[0].title, "Task 1");
    assert_eq!(tasks[1].title, "Task 2");
}

#[tokio::test]
async fn test_update_task() {
    let pool = setup_test_db().await;

    // Create task
    let input = CreateTaskInput {
        title: "Original Title".to_string(),
        description: None,
        category_id: None,
        priority: "Medium".to_string(),
        parent_id: None,
        due_date: None,
    };
    let task = create_task_helper(&pool, input).await.unwrap();

    // Update task
    let update_input = UpdateTaskInput {
        title: Some("Updated Title".to_string()),
        description: Some("New description".to_string()),
        category_id: None,
        priority: Some("Urgent".to_string()),
        parent_id: None,
        is_done: Some(true),
        position: None,
        due_date: None,
    };

    let updated = update_task_helper(&pool, task.id, update_input)
        .await
        .unwrap();

    assert_eq!(updated.title, "Updated Title");
    assert_eq!(updated.description, Some("New description".to_string()));
    assert_eq!(updated.priority, "Urgent");
    assert_eq!(updated.is_done, true);
    assert!(updated.completed_at.is_some());
}

#[tokio::test]
async fn test_update_task_mark_undone() {
    let pool = setup_test_db().await;

    // Create task
    let input = CreateTaskInput {
        title: "Task".to_string(),
        description: None,
        category_id: None,
        priority: "Medium".to_string(),
        parent_id: None,
        due_date: None,
    };
    let task = create_task_helper(&pool, input).await.unwrap();

    // Mark as done
    let mark_done = UpdateTaskInput {
        title: None,
        description: None,
        category_id: None,
        priority: None,
        parent_id: None,
        is_done: Some(true),
        position: None,
        due_date: None,
    };
    update_task_helper(&pool, task.id, mark_done)
        .await
        .unwrap();

    // Mark as undone
    let mark_undone = UpdateTaskInput {
        title: None,
        description: None,
        category_id: None,
        priority: None,
        parent_id: None,
        is_done: Some(false),
        position: None,
        due_date: None,
    };
    let updated = update_task_helper(&pool, task.id, mark_undone)
        .await
        .unwrap();

    assert_eq!(updated.is_done, false);
    assert!(updated.completed_at.is_none());
}

#[tokio::test]
async fn test_delete_task() {
    let pool = setup_test_db().await;

    // Create task
    let input = CreateTaskInput {
        title: "Task to delete".to_string(),
        description: None,
        category_id: None,
        priority: "Medium".to_string(),
        parent_id: None,
        due_date: None,
    };
    let task = create_task_helper(&pool, input).await.unwrap();

    // Delete task
    delete_task_helper(&pool, task.id)
        .await
        .unwrap();

    // Verify it's deleted
    let tasks = get_all_tasks_helper(&pool).await.unwrap();
    assert_eq!(tasks.len(), 0);
}

#[tokio::test]
async fn test_delete_task_cascades_to_children() {
    let pool = setup_test_db().await;

    // Create parent task
    let parent_input = CreateTaskInput {
        title: "Parent".to_string(),
        description: None,
        category_id: None,
        priority: "Medium".to_string(),
        parent_id: None,
        due_date: None,
    };
    let parent = create_task_helper(&pool, parent_input)
        .await
        .unwrap();

    // Create child task
    let child_input = CreateTaskInput {
        title: "Child".to_string(),
        description: None,
        category_id: None,
        priority: "Medium".to_string(),
        parent_id: Some(parent.id),
        due_date: None,
    };
    create_task_helper(&pool, child_input)
        .await
        .unwrap();

    // Delete parent
    delete_task_helper(&pool, parent.id)
        .await
        .unwrap();

    // Verify both are deleted
    let tasks = get_all_tasks_helper(&pool).await.unwrap();
    assert_eq!(tasks.len(), 0, "Child should be deleted via CASCADE");
}

#[tokio::test]
async fn test_get_task_tree_simple() {
    let pool = setup_test_db().await;

    // Create parent
    let parent_input = CreateTaskInput {
        title: "Parent".to_string(),
        description: None,
        category_id: None,
        priority: "High".to_string(),
        parent_id: None,
        due_date: None,
    };
    let parent = create_task_helper(&pool, parent_input)
        .await
        .unwrap();

    // Create children
    let child1_input = CreateTaskInput {
        title: "Child 1".to_string(),
        description: None,
        category_id: None,
        priority: "Medium".to_string(),
        parent_id: Some(parent.id),
        due_date: None,
    };
    create_task_helper(&pool, child1_input)
        .await
        .unwrap();

    let child2_input = CreateTaskInput {
        title: "Child 2".to_string(),
        description: None,
        category_id: None,
        priority: "Low".to_string(),
        parent_id: Some(parent.id),
        due_date: None,
    };
    create_task_helper(&pool, child2_input)
        .await
        .unwrap();

    // Get tree
    let tasks = get_all_tasks_helper(&pool).await.unwrap();
    let tree = build_task_tree(tasks);

    assert_eq!(tree.len(), 1, "Should have 1 root");
    assert_eq!(tree[0].task.title, "Parent");
    assert_eq!(tree[0].subtasks.len(), 2, "Parent should have 2 children");
}

#[tokio::test]
async fn test_reorder_task() {
    let pool = setup_test_db().await;

    // Create 3 tasks in order
    let task1 = create_task_helper(
        &pool,
        CreateTaskInput {
            title: "Task 1".to_string(),
            description: None,
            category_id: None,
            priority: "Medium".to_string(),
            parent_id: None,
            due_date: None,
        },
    )
    .await
    .unwrap();

    let task2 = create_task_helper(
        &pool,
        CreateTaskInput {
            title: "Task 2".to_string(),
            description: None,
            category_id: None,
            priority: "Medium".to_string(),
            parent_id: None,
            due_date: None,
        },
    )
    .await
    .unwrap();

    let task3 = create_task_helper(
        &pool,
        CreateTaskInput {
            title: "Task 3".to_string(),
            description: None,
            category_id: None,
            priority: "Medium".to_string(),
            parent_id: None,
            due_date: None,
        },
    )
    .await
    .unwrap();

    // Move task1 to position 2 manually (testing DB behavior)
    // Shift tasks between old (0) and new (2) position
    sqlx::query("UPDATE tasks SET position = position - 1 WHERE parent_id IS NULL AND position > 0 AND position <= 2")
        .execute(&pool)
        .await
        .unwrap();

    // Update task1's position
    sqlx::query("UPDATE tasks SET position = 2 WHERE id = ?")
        .bind(task1.id)
        .execute(&pool)
        .await
        .unwrap();

    let tasks = get_all_tasks_helper(&pool).await.unwrap();

    // Find each task and check positions
    let task1_updated = tasks.iter().find(|t| t.id == task1.id).unwrap();
    let task2_updated = tasks.iter().find(|t| t.id == task2.id).unwrap();
    let task3_updated = tasks.iter().find(|t| t.id == task3.id).unwrap();

    assert_eq!(task2_updated.position, 0);
    assert_eq!(task3_updated.position, 1);
    assert_eq!(task1_updated.position, 2);
}
