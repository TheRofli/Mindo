#[derive(Debug, Clone, PartialEq)]
pub struct DiffLine {
    pub kind: &'static str,
    pub text: String,
}

pub fn line_diff(original: &str, suggested: &str) -> Vec<DiffLine> {
    if original == suggested {
        return vec![DiffLine {
            kind: "same",
            text: original.to_string(),
        }];
    }

    vec![
        DiffLine {
            kind: "remove",
            text: original.to_string(),
        },
        DiffLine {
            kind: "add",
            text: suggested.to_string(),
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_simple_replace_diff() {
        let diff = line_diff("old", "new");
        assert_eq!(diff[0].kind, "remove");
        assert_eq!(diff[1].kind, "add");
    }
}
