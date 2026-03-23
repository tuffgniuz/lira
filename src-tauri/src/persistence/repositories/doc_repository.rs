use crate::persistence::database::Database;
use crate::persistence::models::Doc;
use crate::persistence::support::option_string;
use rusqlite::params;
use rusqlite::OptionalExtension;

pub struct DocRepository<'a> {
    db: &'a Database,
}

impl<'a> DocRepository<'a> {
    pub fn new(db: &'a Database) -> Self {
        Self { db }
    }

    pub fn create(&self, doc: Doc) -> Result<(), String> {
        self.db
            .connection()
            .execute(
                "
                INSERT INTO docs (id, title, body, project_id, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                ",
                params![
                    doc.id,
                    doc.title,
                    doc.body,
                    doc.project_id,
                    doc.created_at,
                    doc.updated_at
                ],
            )
            .map(|_| ())
            .map_err(|error| error.to_string())
    }

    pub fn update(&self, doc: Doc) -> Result<(), String> {
        let rows_updated = self
            .db
            .connection()
            .execute(
                "
                UPDATE docs
                SET title = ?2,
                    body = ?3,
                    project_id = ?4,
                    created_at = ?5,
                    updated_at = ?6
                WHERE id = ?1
                  AND updated_at <= ?6
                ",
                params![
                    doc.id,
                    doc.title,
                    doc.body,
                    doc.project_id,
                    doc.created_at,
                    doc.updated_at
                ],
            )
            .map_err(|error| error.to_string())?;

        if rows_updated > 0 {
            return Ok(());
        }

        let current_updated_at = self
            .db
            .connection()
            .query_row(
                "SELECT updated_at FROM docs WHERE id = ?1",
                params![doc.id],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|error| error.to_string())?;

        match current_updated_at {
            Some(existing_updated_at) if existing_updated_at > doc.updated_at => {
                Err("doc update rejected because a newer version already exists".into())
            }
            Some(_) => Err("doc update failed without applying changes".into()),
            None => Err("doc not found".into()),
        }
    }

    #[cfg(test)]
    pub fn get(&self, id: &str) -> Result<Option<Doc>, String> {
        self.db
            .connection()
            .query_row(
                "
                SELECT id, title, body, project_id, created_at, updated_at
                FROM docs
                WHERE id = ?1
                ",
                params![id],
                map_doc,
            )
            .optional()
            .map_err(|error| error.to_string())
    }

    pub fn list(&self) -> Result<Vec<Doc>, String> {
        let mut statement = self
            .db
            .connection()
            .prepare(
                "
                SELECT id, title, body, project_id, created_at, updated_at
                FROM docs
                ORDER BY created_at DESC
                ",
            )
            .map_err(|error| error.to_string())?;

        let rows = statement
            .query_map([], map_doc)
            .map_err(|error| error.to_string())?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())
    }

    pub fn delete(&self, id: &str) -> Result<(), String> {
        self.db
            .connection()
            .execute("DELETE FROM docs WHERE id = ?1", params![id])
            .map(|_| ())
            .map_err(|error| error.to_string())
    }
}

fn map_doc(row: &rusqlite::Row<'_>) -> rusqlite::Result<Doc> {
    Ok(Doc {
        id: row.get(0)?,
        title: row.get(1)?,
        body: row.get(2)?,
        project_id: option_string(row, 3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}
