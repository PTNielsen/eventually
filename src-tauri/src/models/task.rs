use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub category_id: Option<i64>,
    pub priority: String,
    pub parent_id: Option<i64>,
    pub is_done: bool,
    pub position: i32,
    pub due_date: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
    pub completed_at: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTaskInput {
    pub title: String,
    pub description: Option<String>,
    pub category_id: Option<i64>,
    pub priority: String,
    pub parent_id: Option<i64>,
    pub due_date: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTaskInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub category_id: Option<i64>,
    pub priority: Option<String>,
    pub parent_id: Option<i64>,
    pub is_done: Option<bool>,
    pub position: Option<i32>,
    pub due_date: Option<i64>,
}

/// Tree structure for frontend consumption with hierarchical subtasks.
///
/// Uses `#[serde(flatten)]` to expose task fields at the top level in JSON,
/// producing cleaner API responses where task properties and subtasks are siblings.
#[derive(Debug, Clone, Serialize)]
pub struct TaskTree {
    #[serde(flatten)]
    pub task: Task,
    pub subtasks: Vec<TaskTree>,
}

// Helper function to build recursive task tree
pub fn build_task_tree(tasks: Vec<Task>) -> Vec<TaskTree> {
    // Build map of task_id -> TaskTree nodes
    let mut nodes: HashMap<i64, TaskTree> = tasks
        .into_iter()
        .map(|task| {
            let id = task.id;
            (id, TaskTree { task, subtasks: Vec::new() })
        })
        .collect();

    // Build parent -> children mapping (just IDs, not cloning tasks)
    let parent_map: HashMap<i64, Vec<i64>> = {
        let mut map: HashMap<i64, Vec<i64>> = HashMap::new();
        for node in nodes.values() {
            if let Some(parent_id) = node.task.parent_id {
                map.entry(parent_id).or_insert_with(Vec::new).push(node.task.id);
            }
        }
        map
    };

    // Collect root IDs (tasks with no parent)
    let root_ids: Vec<i64> = nodes
        .values()
        .filter(|node| node.task.parent_id.is_none())
        .map(|node| node.task.id)
        .collect();

    // Recursive function to build tree by MOVING nodes (not cloning)
    fn build_subtree(
        task_id: i64,
        nodes: &mut HashMap<i64, TaskTree>,
        parent_map: &HashMap<i64, Vec<i64>>,
    ) -> Option<TaskTree> {
        // Remove node from map (transfer ownership)
        let mut node = nodes.remove(&task_id)?;

        // Get children IDs for this task
        if let Some(child_ids) = parent_map.get(&task_id) {
            // Recursively build and MOVE each child
            for child_id in child_ids {
                if let Some(child_tree) = build_subtree(*child_id, nodes, parent_map) {
                    node.subtasks.push(child_tree);
                }
            }
        }

        Some(node)
    }

    // Build tree for each root, moving nodes from the map
    root_ids
        .into_iter()
        .filter_map(|root_id| build_subtree(root_id, &mut nodes, &parent_map))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_task(id: i64, title: &str, parent_id: Option<i64>) -> Task {
        Task {
            id,
            title: title.to_string(),
            description: None,
            category_id: None,
            priority: "Medium".to_string(),
            parent_id,
            is_done: false,
            position: 0,
            due_date: None,
            created_at: 0,
            updated_at: 0,
            completed_at: None,
        }
    }

    #[test]
    fn test_build_task_tree_empty() {
        let tasks = vec![];
        let tree = build_task_tree(tasks);
        assert_eq!(tree.len(), 0);
    }

    #[test]
    fn test_build_task_tree_single_root() {
        let tasks = vec![create_test_task(1, "Task 1", None)];
        let tree = build_task_tree(tasks);

        assert_eq!(tree.len(), 1);
        assert_eq!(tree[0].task.id, 1);
        assert_eq!(tree[0].task.title, "Task 1");
        assert_eq!(tree[0].subtasks.len(), 0);
    }

    #[test]
    fn test_build_task_tree_multiple_roots() {
        let tasks = vec![
            create_test_task(1, "Task 1", None),
            create_test_task(2, "Task 2", None),
            create_test_task(3, "Task 3", None),
        ];
        let tree = build_task_tree(tasks);

        assert_eq!(tree.len(), 3);

        // Check that all three roots are present (order not guaranteed)
        let ids: Vec<i64> = tree.iter().map(|t| t.task.id).collect();
        assert!(ids.contains(&1));
        assert!(ids.contains(&2));
        assert!(ids.contains(&3));
    }

    #[test]
    fn test_build_task_tree_simple_hierarchy() {
        let tasks = vec![
            create_test_task(1, "Parent", None),
            create_test_task(2, "Child 1", Some(1)),
            create_test_task(3, "Child 2", Some(1)),
        ];
        let tree = build_task_tree(tasks);

        assert_eq!(tree.len(), 1, "Should have 1 root");
        assert_eq!(tree[0].task.id, 1);
        assert_eq!(tree[0].subtasks.len(), 2, "Parent should have 2 children");

        // Check children
        let subtask_ids: Vec<i64> = tree[0].subtasks.iter().map(|t| t.task.id).collect();
        assert!(subtask_ids.contains(&2));
        assert!(subtask_ids.contains(&3));
    }

    #[test]
    fn test_build_task_tree_deep_nesting() {
        // Create a chain: 1 -> 2 -> 3 -> 4 -> 5
        let tasks = vec![
            create_test_task(1, "Level 1", None),
            create_test_task(2, "Level 2", Some(1)),
            create_test_task(3, "Level 3", Some(2)),
            create_test_task(4, "Level 4", Some(3)),
            create_test_task(5, "Level 5", Some(4)),
        ];
        let tree = build_task_tree(tasks);

        assert_eq!(tree.len(), 1, "Should have 1 root");

        // Navigate down the tree
        let level1 = &tree[0];
        assert_eq!(level1.task.id, 1);
        assert_eq!(level1.subtasks.len(), 1);

        let level2 = &level1.subtasks[0];
        assert_eq!(level2.task.id, 2);
        assert_eq!(level2.subtasks.len(), 1);

        let level3 = &level2.subtasks[0];
        assert_eq!(level3.task.id, 3);
        assert_eq!(level3.subtasks.len(), 1);

        let level4 = &level3.subtasks[0];
        assert_eq!(level4.task.id, 4);
        assert_eq!(level4.subtasks.len(), 1);

        let level5 = &level4.subtasks[0];
        assert_eq!(level5.task.id, 5);
        assert_eq!(level5.subtasks.len(), 0);
    }

    #[test]
    fn test_build_task_tree_complex_hierarchy() {
        // Multiple roots with multiple levels
        let tasks = vec![
            create_test_task(1, "Root 1", None),
            create_test_task(2, "Root 1 - Child 1", Some(1)),
            create_test_task(3, "Root 1 - Child 2", Some(1)),
            create_test_task(4, "Root 1 - Child 1 - Grandchild", Some(2)),
            create_test_task(5, "Root 2", None),
            create_test_task(6, "Root 2 - Child 1", Some(5)),
        ];
        let tree = build_task_tree(tasks);

        assert_eq!(tree.len(), 2, "Should have 2 roots");

        // Find Root 1 and Root 2 (order not guaranteed)
        let root1 = tree.iter().find(|t| t.task.id == 1).expect("Root 1 not found");
        let root2 = tree.iter().find(|t| t.task.id == 5).expect("Root 2 not found");

        // Check Root 1
        assert_eq!(root1.subtasks.len(), 2);

        // Check Root 1's first child has a grandchild
        let child1 = root1.subtasks.iter().find(|t| t.task.id == 2).unwrap();
        assert_eq!(child1.subtasks.len(), 1);
        assert_eq!(child1.subtasks[0].task.id, 4);

        // Check Root 2
        assert_eq!(root2.subtasks.len(), 1);
        assert_eq!(root2.subtasks[0].task.id, 6);
    }

    #[test]
    fn test_build_task_tree_orphaned_child() {
        // Child with non-existent parent should be treated as root
        let tasks = vec![
            create_test_task(1, "Root", None),
            create_test_task(2, "Orphan", Some(999)), // Parent doesn't exist
        ];
        let tree = build_task_tree(tasks);

        assert_eq!(tree.len(), 1, "Only valid root should appear");
        assert_eq!(tree[0].task.id, 1);
    }
}
