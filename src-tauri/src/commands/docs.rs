use crate::application::vault::open_database_from_input;
use crate::persistence::doc_repository::DocRepository;
use crate::persistence::models::Doc;

#[tauri::command]
pub fn list_docs(path: &str) -> Result<Vec<Doc>, String> {
    let db = open_database_from_input(path)?;
    DocRepository::new(&db).list()
}

#[tauri::command]
pub fn create_doc(path: &str, doc: Doc) -> Result<Doc, String> {
    let db = open_database_from_input(path)?;
    DocRepository::new(&db).create(doc.clone())?;
    Ok(doc)
}

#[tauri::command]
pub fn update_doc(path: &str, doc: Doc) -> Result<Doc, String> {
    let db = open_database_from_input(path)?;
    DocRepository::new(&db).update(doc.clone())?;
    Ok(doc)
}

#[tauri::command]
pub fn delete_doc(path: &str, id: &str) -> Result<(), String> {
    let db = open_database_from_input(path)?;
    DocRepository::new(&db).delete(id)
}
