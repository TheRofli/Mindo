pub fn normalize_search_value(value: &str) -> String {
    transliterate_cyrillic_to_latin(&value.to_lowercase().replace('ё', "е"))
        .replace('\\', "/")
        .replace(".md", "")
        .replace(|character: char| {
            !(character.is_alphanumeric() || character == '/' || character == '_' || character == '-')
        }, " ")
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join(" ")
        .trim()
        .to_string()
}

#[cfg(test)]
pub fn token_overlap_score(query: &str, target: &str) -> i32 {
    let query_tokens = tokenize(query);
    let target_tokens = tokenize(target);

    query_tokens
        .iter()
        .filter(|token| target_tokens.iter().any(|target_token| target_token == *token))
        .count() as i32
        * 10
}

pub fn tokenize(value: &str) -> Vec<String> {
    normalize_search_value(value)
        .split(|character: char| !character.is_alphanumeric())
        .filter(|value| value.chars().count() >= 2)
        .map(|value| value.to_string())
        .collect()
}

pub fn compact(value: &str) -> String {
    normalize_search_value(value)
        .chars()
        .filter(|character| character.is_alphanumeric())
        .collect()
}

pub fn text_similarity(left: &str, right: &str) -> f64 {
    let first = normalize_search_value(left);
    let second = normalize_search_value(right);

    if first.is_empty() || second.is_empty() {
        return 0.0;
    }

    if first == second {
        return 1.0;
    }

    let direct = normalized_levenshtein_similarity(&first, &second);
    let compact_first = compact(&first);
    let compact_second = compact(&second);
    let compact_score = if compact_first.chars().count() >= 2 && compact_second.chars().count() >= 2 {
        normalized_levenshtein_similarity(&compact_first, &compact_second)
    } else {
        0.0
    };
    let first_skeleton = consonant_skeleton(&first);
    let second_skeleton = consonant_skeleton(&second);
    let skeleton = if first_skeleton.chars().count() >= 2 && second_skeleton.chars().count() >= 2 {
        normalized_levenshtein_similarity(&first_skeleton, &second_skeleton)
    } else {
        0.0
    };

    direct.max(compact_score).max(skeleton)
}

pub fn normalized_levenshtein_similarity(left: &str, right: &str) -> f64 {
    let max_length = left.chars().count().max(right.chars().count());

    if max_length == 0 {
        return 1.0;
    }

    1.0 - levenshtein_distance(left, right) as f64 / max_length as f64
}

pub fn levenshtein_distance(left: &str, right: &str) -> usize {
    let left_chars: Vec<char> = left.chars().collect();
    let right_chars: Vec<char> = right.chars().collect();
    let mut previous: Vec<usize> = (0..=right_chars.len()).collect();
    let mut current = vec![0; right_chars.len() + 1];

    for (left_index, left_char) in left_chars.iter().enumerate() {
        current[0] = left_index + 1;

        for (right_index, right_char) in right_chars.iter().enumerate() {
            let cost = if left_char == right_char { 0 } else { 1 };
            current[right_index + 1] = (current[right_index] + 1)
                .min(previous[right_index + 1] + 1)
                .min(previous[right_index] + cost);
        }

        previous.clone_from(&current);
    }

    previous[right_chars.len()]
}

pub fn transliterate_cyrillic_to_latin(value: &str) -> String {
    let mut output = String::new();

    for character in value.chars() {
        let mapped = match character {
            'а' | 'А' => "a",
            'б' | 'Б' => "b",
            'в' | 'В' => "v",
            'г' | 'Г' => "g",
            'д' | 'Д' => "d",
            'е' | 'Е' | 'ё' | 'Ё' => "e",
            'ж' | 'Ж' => "zh",
            'з' | 'З' => "z",
            'и' | 'И' => "i",
            'й' | 'Й' => "y",
            'к' | 'К' => "k",
            'л' | 'Л' => "l",
            'м' | 'М' => "m",
            'н' | 'Н' => "n",
            'о' | 'О' => "o",
            'п' | 'П' => "p",
            'р' | 'Р' => "r",
            'с' | 'С' => "s",
            'т' | 'Т' => "t",
            'у' | 'У' => "u",
            'ф' | 'Ф' => "f",
            'х' | 'Х' => "h",
            'ц' | 'Ц' => "ts",
            'ч' | 'Ч' => "ch",
            'ш' | 'Ш' => "sh",
            'щ' | 'Щ' => "sch",
            'ъ' | 'Ъ' | 'ь' | 'Ь' => "",
            'ы' | 'Ы' => "y",
            'э' | 'Э' => "e",
            'ю' | 'Ю' => "yu",
            'я' | 'Я' => "ya",
            _ => {
                output.push(character);
                continue;
            }
        };

        output.push_str(mapped);
    }

    output
}

fn consonant_skeleton(value: &str) -> String {
    normalize_search_value(value)
        .chars()
        .filter(|character| {
            character.is_alphanumeric()
                && !"aeiouyаеёиоуыэюя".contains(*character)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn overlap_scores_matching_folder_and_file() {
        assert!(token_overlap_score("open test in folder test", "Test/Test.md") >= 20);
    }

    #[test]
    fn transliteration_keeps_phonetic_file_names_close() {
        assert!(text_similarity("мила ноут", "Milanote") >= 0.7);
        assert!(text_similarity("LUMIK", "lumiq") >= 0.7);
    }
}
