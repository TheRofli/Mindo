use crate::fuzzy::{normalized_levenshtein_similarity, tokenize};

#[derive(Debug, Clone, PartialEq)]
pub struct TextOccurrenceMatch {
    pub original: String,
    pub occurrence_index: Option<usize>,
    pub score: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct TextOccurrenceResult {
    pub matched: Option<TextOccurrenceMatch>,
    pub error: Option<String>,
}

pub fn find_unique_text_occurrence(content: &str, requested_text: &str) -> TextOccurrenceResult {
    let search = requested_text.trim();

    if search.is_empty() {
        return error("Text to replace is empty.");
    }

    let exact_matches = exact_match_indexes(content, search);
    let safe_exact_matches = exact_matches
        .iter()
        .copied()
        .filter(|(index, _)| has_safe_boundaries(content, *index, search.len()))
        .collect::<Vec<(usize, usize)>>();

    if safe_exact_matches.len() == 1 {
        return matched(search, Some(safe_exact_matches[0].1), 1.0);
    }

    if safe_exact_matches.len() > 1 || exact_matches.len() > 1 {
        return error("Text was found more than once in the current note. Select the exact passage before replacing it.");
    }

    let flexible_matches = flexible_separator_matches(content, search);

    if flexible_matches.len() == 1 {
        let original = flexible_matches[0].clone();
        return matched(
            &original,
            unique_occurrence_index(content, &original),
            normalized_similarity(&original, search),
        );
    }

    if flexible_matches.len() > 1 {
        return error("Similar text was found more than once in the current note. Select the exact passage before replacing it.");
    }

    let fuzzy_matches = fuzzy_line_matches(content, search);

    if fuzzy_matches.len() == 1 {
        let original = fuzzy_matches[0].clone();
        return matched(
            &original,
            unique_occurrence_index(content, &original),
            normalized_similarity(&original, search),
        );
    }

    if fuzzy_matches.len() > 1 {
        return error("Similar text was found more than once in the current note. Select the exact passage before replacing it.");
    }

    error(&format!("Text was not found in the current note: {search}"))
}

fn exact_match_indexes(content: &str, search: &str) -> Vec<(usize, usize)> {
    let mut matches = Vec::new();
    let mut cursor = 0;
    let mut occurrence_index = 0;

    while let Some(index) = content[cursor..].find(search) {
        let absolute_index = cursor + index;
        matches.push((absolute_index, occurrence_index));
        occurrence_index += 1;
        cursor = absolute_index + search.len();
    }

    matches
}

fn flexible_separator_matches(content: &str, requested_text: &str) -> Vec<String> {
    let requested_tokens = tokenize(requested_text);

    if requested_tokens.len() < 2 {
        return Vec::new();
    }

    unique_lines(content)
        .into_iter()
        .filter(|line| {
            let line_tokens = tokenize(line);
            line_tokens.len() == requested_tokens.len()
                && line_tokens
                    .iter()
                    .zip(requested_tokens.iter())
                    .all(|(left, right)| left == right)
        })
        .collect()
}

fn fuzzy_line_matches(content: &str, requested_text: &str) -> Vec<String> {
    let requested = normalize_loose_text(requested_text);

    if requested.chars().count() < 4 {
        return Vec::new();
    }

    unique_lines(content)
        .into_iter()
        .filter(|line| line.chars().count() <= 220)
        .filter(|line| {
            let normalized_line = normalize_loose_text(line);

            if normalized_line.is_empty() {
                return false;
            }

            if normalized_line == requested {
                return true;
            }

            if normalized_line.contains(&requested) {
                return true;
            }

            normalized_levenshtein_similarity(&normalized_line, &requested) >= 0.84
        })
        .collect()
}

fn unique_lines(content: &str) -> Vec<String> {
    let mut lines = Vec::new();

    for line in content.lines().map(str::trim).filter(|line| !line.is_empty()) {
        if !lines.iter().any(|existing| existing == line) {
            lines.push(line.to_string());
        }
    }

    lines
}

fn normalize_loose_text(value: &str) -> String {
    value
        .to_lowercase()
        .replace('ё', "е")
        .chars()
        .map(|character| {
            if character.is_alphanumeric() {
                character
            } else {
                ' '
            }
        })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join(" ")
}

fn normalized_similarity(left: &str, right: &str) -> f64 {
    normalized_levenshtein_similarity(&normalize_loose_text(left), &normalize_loose_text(right))
}

fn unique_occurrence_index(content: &str, search: &str) -> Option<usize> {
    let matches = exact_match_indexes(content, search);

    if matches.len() == 1 {
        Some(matches[0].1)
    } else {
        None
    }
}

fn has_safe_boundaries(content: &str, index: usize, length: usize) -> bool {
    let before = content[..index].chars().next_back();
    let after = content[index + length..].chars().next();

    !is_word_character(before) && !is_word_character(after)
}

fn is_word_character(value: Option<char>) -> bool {
    value
        .map(|character| character.is_alphanumeric() || character == '_')
        .unwrap_or(false)
}

fn matched(original: &str, occurrence_index: Option<usize>, score: f64) -> TextOccurrenceResult {
    TextOccurrenceResult {
        matched: Some(TextOccurrenceMatch {
            original: original.to_string(),
            occurrence_index,
            score,
        }),
        error: None,
    }
}

fn error(message: &str) -> TextOccurrenceResult {
    TextOccurrenceResult {
        matched: None,
        error: Some(message.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_hyphenated_and_typo_text() {
        let result = find_unique_text_occurrence("Я гений\nOld local LLM note.", "Я-гении");
        assert_eq!(result.error, None);
        assert_eq!(result.matched.unwrap().original, "Я гений");
    }

    #[test]
    fn keeps_ambiguous_replacements_blocked() {
        let result = find_unique_text_occurrence("Я гений\nЯ — гений", "Я-гений");
        assert!(result.error.unwrap().contains("more than once"));
    }
}
