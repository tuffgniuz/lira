use rusqlite::Row;

pub fn decode_enum<T>(value: String) -> Result<T, String>
where
    T: serde::de::DeserializeOwned,
{
    serde_json::from_str(&format!("\"{}\"", value)).map_err(|error| error.to_string())
}

pub fn encode_enum<T>(value: &T) -> Result<String, String>
where
    T: serde::Serialize,
{
    serde_json::to_string(value)
        .map_err(|error| error.to_string())
        .map(|encoded| encoded.trim_matches('"').to_string())
}

pub fn option_string(row: &Row<'_>, index: usize) -> rusqlite::Result<Option<String>> {
    row.get(index)
}

pub fn to_sql_error(message: String) -> rusqlite::Error {
    rusqlite::Error::FromSqlConversionFailure(
        0,
        rusqlite::types::Type::Text,
        Box::<dyn std::error::Error + Send + Sync>::from(message),
    )
}
