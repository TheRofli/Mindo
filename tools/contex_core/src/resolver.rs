use crate::fuzzy::{compact, normalize_search_value, text_similarity, tokenize};

#[derive(Debug, Clone, PartialEq)]
pub struct ResolvedPath {
    pub path: String,
    pub score: i32,
}

pub fn resolve_paths(query: &str, paths: &[String], limit: usize) -> Vec<ResolvedPath> {
    let query_parts = parse_query_parts(query);
    let mut scored: Vec<ResolvedPath> = paths
        .iter()
        .map(|path| {
            ResolvedPath {
                path: path.clone(),
                score: score_path_candidate(path, &query_parts.file_query, query_parts.folder_query.as_deref()),
            }
        })
        .filter(|item| item.score > 0)
        .collect();

    scored.sort_by(|left, right| {
        right
            .score
            .cmp(&left.score)
            .then(compare_specificity(&left.path, &right.path))
            .then(left.path.cmp(&right.path))
    });
    scored.truncate(limit);
    scored
}

#[derive(Debug, Clone)]
struct QueryParts {
    file_query: String,
    folder_query: Option<String>,
}

fn parse_query_parts(query: &str) -> QueryParts {
    let cleaned = normalize_voice_noise(query);
    let folder_query = extract_folder_query(&cleaned);
    let file_query = folder_query
        .as_deref()
        .map(|folder| strip_folder_clause(&cleaned, folder))
        .unwrap_or_else(|| cleaned.clone());
    let file_query = clean_open_query(&file_query);

    QueryParts {
        file_query: if file_query.is_empty() {
            clean_open_query(&cleaned)
        } else {
            file_query
        },
        folder_query: folder_query.map(|folder| clean_open_query(&folder)),
    }
}

fn score_path_candidate(path: &str, query: &str, folder_query: Option<&str>) -> i32 {
    let normalized_query = normalize_search_value(query);
    let tokens = tokenize(query);

    if normalized_query.is_empty() || tokens.is_empty() {
        return 0;
    }

    let basename = basename(path);
    let folder = folder(path);
    let normalized_basename = normalize_search_value(&basename);
    let normalized_folder = normalize_search_value(&folder);
    let normalized_path = normalize_search_value(path);
    let compact_query = compact(&normalized_query);
    let compact_basename = compact(&normalized_basename);
    let mut score = 0;

    if let Some(folder_query) = folder_query {
        let folder_score = score_folder_candidate(&folder, folder_query);

        if folder_score <= 0 {
            return 0;
        }

        score += folder_score * 3;
    }

    if normalized_path == normalized_query {
        score += 500;
    } else if normalized_path.contains(&normalized_query) {
        score += 260;
    }

    if normalized_basename == normalized_query {
        score += 320;
    } else if normalized_basename.contains(&normalized_query) {
        score += 190;
    }

    let basename_similarity = text_similarity(&normalized_query, &normalized_basename);
    let compact_similarity = if !compact_query.is_empty() && !compact_basename.is_empty() {
        text_similarity(&compact_query, &compact_basename)
    } else {
        0.0
    };
    let best_token_similarity = tokens
        .iter()
        .map(|token| text_similarity(token, &normalized_basename))
        .fold(0.0, f64::max);
    let best_similarity = basename_similarity
        .max(compact_similarity)
        .max(best_token_similarity);

    if best_similarity >= 0.72 {
        score += (best_similarity * 450.0).round() as i32;
    } else if best_similarity >= 0.58 {
        score += (best_similarity * 170.0).round() as i32;
    }

    if folder_query.is_some() && best_similarity >= 0.7 {
        score += (best_similarity * 540.0).round() as i32;
    }

    for (index, token) in tokens.iter().enumerate() {
        let first = index == 0;

        if normalized_basename == *token {
            score += if first { 220 } else { 90 };
        } else if normalized_basename.contains(token) {
            score += if first { 140 } else { 45 };
        } else {
            let token_similarity = text_similarity(token, &normalized_basename);

            if token_similarity >= 0.72 {
                score += (token_similarity * if first { 120.0 } else { 50.0 }).round() as i32;
            }
        }

        if normalized_folder.split_whitespace().any(|folder_token| folder_token == token) {
            score += 45;
        } else if normalized_folder.contains(token) {
            score += 25;
        }

        if normalized_path.contains(token) {
            score += 25;
        }
    }

    let covered = tokens
        .iter()
        .filter(|token| normalized_path.contains(token.as_str()))
        .count();

    if covered < tokens.len() {
        score -= ((tokens.len() - covered) as i32) * 25;
    }

    score.max(0)
}

fn score_folder_candidate(folder: &str, query: &str) -> i32 {
    let normalized_folder = normalize_search_value(folder);
    let folder_name = normalize_search_value(folder.rsplit('/').next().unwrap_or(folder));
    let normalized_query = normalize_search_value(query);
    let tokens = tokenize(query);
    let mut score = 0;

    if folder_name == normalized_query {
        score += 520;
    } else if normalized_folder == normalized_query {
        score += 440;
    } else if normalized_folder.ends_with(&format!(" {}", normalized_query)) {
        score += 270;
    } else if normalized_folder.contains(&normalized_query) {
        score += 170;
    }

    for token in tokens {
        if folder_name == token {
            score += 145;
        } else if folder_name.contains(&token) {
            score += 75;
        } else if normalized_folder.contains(&token) {
            score += 35;
        } else {
            let similarity = text_similarity(&token, &folder_name).max(text_similarity(&token, &normalized_folder));

            if similarity >= 0.62 {
                score += (similarity * 75.0).round() as i32;
            }
        }
    }

    let best_similarity = text_similarity(&normalized_query, &folder_name)
        .max(text_similarity(&normalized_query, &normalized_folder));

    if best_similarity >= 0.56 {
        score += (best_similarity * 150.0).round() as i32;
    }

    score
}

fn normalize_voice_noise(query: &str) -> String {
    normalize_search_value(query)
        .replace("vapke", "papke")
        .replace("vapki", "papke")
        .replace("parke", "papke")
        .replace("parki", "papke")
}

fn extract_folder_query(query: &str) -> Option<String> {
    for marker in [" v papke ", " iz papke ", " in folder ", " inside folder "] {
        if let Some(index) = query.find(marker) {
            let start = index + marker.len();
            let rest = query[start..].trim();
            let folder = rest
                .split_whitespace()
                .take_while(|token| {
                    !matches!(
                        *token,
                        "create" | "make" | "draft" | "new" | "note" | "file" | "plan" | "sozdai"
                            | "sdelai" | "zaved" | "zametka" | "zametku"
                    )
                })
                .collect::<Vec<&str>>()
                .join(" ");

            if !folder.trim().is_empty() {
                return Some(folder);
            }
        }
    }

    None
}

fn strip_folder_clause(query: &str, folder_query: &str) -> String {
    let mut output = query.to_string();

    for marker in [" v papke ", " iz papke ", " in folder ", " inside folder "] {
        let clause = format!("{}{}", marker, folder_query);
        output = output.replace(&clause, " ");
    }

    output
}

fn clean_open_query(query: &str) -> String {
    let command_words = [
        "open",
        "show",
        "please",
        "file",
        "note",
        "folder",
        "otkroy",
        "otkroyu",
        "otkryvay",
        "otkryvaem",
        "pokazhi",
        "mne",
        "ne",
        "pozhaluysta",
        "fail",
        "zametka",
        "zametku",
        "nouts",
        "papke",
        "papka",
    ];

    normalize_search_value(query)
        .split_whitespace()
        .filter(|token| !command_words.contains(token))
        .collect::<Vec<&str>>()
        .join(" ")
}

fn basename(path: &str) -> String {
    path.rsplit('/')
        .next()
        .unwrap_or(path)
        .trim_end_matches(".md")
        .to_string()
}

fn folder(path: &str) -> String {
    path.rsplit_once('/')
        .map(|(folder, _)| folder.to_string())
        .unwrap_or_default()
}

fn compare_specificity(left: &str, right: &str) -> std::cmp::Ordering {
    let left_basename = normalize_search_value(&basename(left));
    let right_basename = normalize_search_value(&basename(right));
    let left_folder_path = folder(left);
    let right_folder_path = folder(right);
    let left_folder = normalize_search_value(left_folder_path.rsplit('/').next().unwrap_or(""));
    let right_folder = normalize_search_value(right_folder_path.rsplit('/').next().unwrap_or(""));
    let left_repeats_folder = !left_folder.is_empty() && left_basename == left_folder;
    let right_repeats_folder = !right_folder.is_empty() && right_basename == right_folder;

    match (left_repeats_folder, right_repeats_folder) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => left.len().cmp(&right.len()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_test_folder_before_unrelated_stat_file() {
        let paths = vec!["lumiq/stat1.md".to_string(), "Test/Test.md".to_string()];
        let results = resolve_paths("open test in folder test", &paths, 3);
        assert_eq!(results[0].path, "Test/Test.md");
    }

    #[test]
    fn resolves_phonetic_split_filename() {
        let paths = vec![
            "Obsidian/Milanote.md".to_string(),
            "Obsidian/Contex_Agent_for_Obsidian_Full_Project_Spec_v3_FINAL_BRANDING.md"
                .to_string(),
            "Proton/LLM Engineering.md".to_string(),
        ];
        let results = resolve_paths("мила ноут", &paths, 3);
        assert_eq!(results[0].path, "Obsidian/Milanote.md");
    }

    #[test]
    fn resolves_folder_and_filename_together() {
        let paths = vec![
            "lumiq/stat1.md".to_string(),
            "lumiq/lumiq.md".to_string(),
            "Test/Test.md".to_string(),
        ];
        let results = resolve_paths("open LUMIK in folder LUMIK", &paths, 3);
        assert_eq!(results[0].path, "lumiq/lumiq.md");
    }
}
