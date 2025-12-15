use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    DatabaseError(String),
    NotFound(String),
    ValidationError(String),
    InvalidInput(String),
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => AppError::NotFound("Record not found".to_string()),
            _ => AppError::DatabaseError(err.to_string()),
        }
    }
}

impl From<String> for AppError {
    fn from(message: String) -> Self {
        AppError::InvalidInput(message)
    }
}

impl From<&str> for AppError {
    fn from(message: &str) -> Self {
        AppError::InvalidInput(message.to_string())
    }
}
