use std::cmp::Ordering;
use std::collections::{HashMap, HashSet};
use std::io::{self, BufRead, BufReader, Read, Write};

mod diff;
mod fuzzy;
mod occurrence;
mod protocol;
mod resolver;

#[derive(Debug)]
struct SearchRequest {
    query: String,
    documents: Vec<Document>,
    limit: usize,
}

#[derive(Debug)]
struct Document {
    path: String,
    title: String,
    content: String,
}

#[derive(Debug)]
struct SearchResponse {
    results: Vec<SearchResult>,
}

#[derive(Debug, Clone)]
struct SearchResult {
    path: String,
    title: String,
    score: f64,
    snippet: String,
    heading: Option<String>,
    matches: Vec<String>,
}

#[derive(Clone)]
struct Chunk {
    path: String,
    title: String,
    heading: Option<String>,
    content: String,
    vector: Vec<f64>,
    terms: Vec<String>,
    term_set: HashSet<String>,
    title_terms: Vec<String>,
    heading_terms: Vec<String>,
    path_terms: Vec<String>,
    title_phrase: String,
    heading_phrase: String,
}

struct WireReader<'a> {
    bytes: &'a [u8],
    cursor: usize,
}

#[derive(Default)]
struct SearchIndex {
    documents: usize,
    chunks: Vec<Chunk>,
}

const WIRE_HEADER: &str = "CTXCORE_SEARCH_V1";
const DIMENSIONS: usize = 384;
const MAX_CHUNK_CHARS: usize = 1600;
const MAX_QUERY_TERMS: usize = 48;
const RAG_V2_MATCH: &str = "rag-v2";

fn main() {
    if std::env::args().any(|argument| argument == "--serve") {
        if let Err(error) = serve(io::stdin().lock(), io::stdout().lock()) {
            exit_with_error(&format!("serve error: {error}"));
        }

        return;
    }

    let mut input = Vec::new();

    if let Err(error) = io::stdin().read_to_end(&mut input) {
        exit_with_error(&format!("failed to read stdin: {error}"));
    }

    let request = match parse_wire_request(&input) {
        Ok(request) => request,
        Err(error) => exit_with_error(&format!("invalid request: {error}")),
    };
    let response = search(request);

    println!("{}", response_to_json(&response));
}

fn parse_wire_request(input: &[u8]) -> Result<SearchRequest, String> {
    let mut reader = WireReader::new(input);
    let header = reader.read_line()?;

    if header != WIRE_HEADER {
        return Err("unsupported wire header".to_string());
    }

    let limit = reader.read_usize_line()?.max(1);
    let query = reader.read_string()?;
    let document_count = reader.read_usize_line()?;
    let mut documents = Vec::with_capacity(document_count);

    for _ in 0..document_count {
        documents.push(Document {
            path: reader.read_string()?,
            title: reader.read_string()?,
            content: reader.read_string()?,
        });
    }

    Ok(SearchRequest {
        query,
        documents,
        limit,
    })
}

fn serve<R: Read, W: Write>(reader: R, mut writer: W) -> Result<(), String> {
    let mut reader = BufReader::new(reader);
    let mut index = SearchIndex::default();

    loop {
        let command = match read_stream_line(&mut reader)? {
            Some(command) => command,
            None => return Ok(()),
        };

        match command.as_str() {
            "CTXCORE_INDEX_V1" => {
                let documents = read_stream_documents(&mut reader)?;
                index.documents = documents.len();
                index.chunks = build_chunks_from_documents(&documents);
                writeln!(
                    writer,
                    "{{\"version\":1,\"status\":\"indexed\",\"documents\":{},\"chunks\":{}}}",
                    index.documents,
                    index.chunks.len()
                )
                .map_err(|error| error.to_string())?;
                writer.flush().map_err(|error| error.to_string())?;
            }
            "CTXCORE_UPSERT_V1" => {
                let documents = read_stream_documents(&mut reader)?;
                let changed_paths = documents
                    .iter()
                    .map(|document| document.path.as_str())
                    .collect::<HashSet<&str>>();
                index
                    .chunks
                    .retain(|chunk| !changed_paths.contains(chunk.path.as_str()));
                index.chunks.extend(build_chunks_from_documents(&documents));
                index.documents = count_index_documents(&index);
                writeln!(
                    writer,
                    "{{\"version\":1,\"status\":\"upserted\",\"documents\":{},\"chunks\":{}}}",
                    index.documents,
                    index.chunks.len()
                )
                .map_err(|error| error.to_string())?;
                writer.flush().map_err(|error| error.to_string())?;
            }
            "CTXCORE_REMOVE_V1" => {
                let count = read_stream_usize_line(&mut reader)?;
                let mut removed_paths = HashSet::with_capacity(count);

                for _ in 0..count {
                    let path = read_stream_string(&mut reader)?;
                    removed_paths.insert(path);
                }

                let before = index.chunks.len();
                index
                    .chunks
                    .retain(|chunk| !removed_paths.contains(chunk.path.as_str()));
                let removed = before.saturating_sub(index.chunks.len());
                index.documents = count_index_documents(&index);
                writeln!(
                    writer,
                    "{{\"version\":1,\"status\":\"removed\",\"removed\":{},\"documents\":{},\"chunks\":{}}}",
                    removed,
                    index.documents,
                    index.chunks.len()
                )
                .map_err(|error| error.to_string())?;
                writer.flush().map_err(|error| error.to_string())?;
            }
            "CTXCORE_SEARCH_INDEX_V1" => {
                let limit = read_stream_usize_line(&mut reader)?.max(1);
                let query = read_stream_string(&mut reader)?;
                let response = search_chunks(&index.chunks, &query, limit);
                writeln!(writer, "{}", response_to_json(&response))
                    .map_err(|error| error.to_string())?;
                writer.flush().map_err(|error| error.to_string())?;
            }
            "CTXCORE_RESOLVE_V1" => {
                let limit = read_stream_usize_line(&mut reader)?.max(1);
                let query = read_stream_string(&mut reader)?;
                let path_count = read_stream_usize_line(&mut reader)?;
                let mut paths = Vec::with_capacity(path_count);

                for _ in 0..path_count {
                    paths.push(read_stream_string(&mut reader)?);
                }

                let results = resolver::resolve_paths(&query, &paths, limit);
                writeln!(writer, "{}", resolve_response_to_json(&results))
                    .map_err(|error| error.to_string())?;
                writer.flush().map_err(|error| error.to_string())?;
            }
            "CTXCORE_DIFF_V1" => {
                let original = read_stream_string(&mut reader)?;
                let suggested = read_stream_string(&mut reader)?;
                let lines = diff::line_diff(&original, &suggested);
                writeln!(writer, "{}", diff_response_to_json(&lines))
                    .map_err(|error| error.to_string())?;
                writer.flush().map_err(|error| error.to_string())?;
            }
            "CTXCORE_TEXT_OCCURRENCE_V1" => {
                let content = read_stream_string(&mut reader)?;
                let requested = read_stream_string(&mut reader)?;
                let result = occurrence::find_unique_text_occurrence(&content, &requested);
                writeln!(writer, "{}", text_occurrence_response_to_json(&result))
                    .map_err(|error| error.to_string())?;
                writer.flush().map_err(|error| error.to_string())?;
            }
            "CTXCORE_STATUS_V1" => {
                writeln!(
                    writer,
                    "{{\"version\":1,\"status\":\"ready\",\"documents\":{},\"chunks\":{}}}",
                    index.documents,
                    index.chunks.len()
                )
                .map_err(|error| error.to_string())?;
                writer.flush().map_err(|error| error.to_string())?;
            }
            "CTXCORE_EXIT_V1" => {
                writeln!(writer, "{{\"version\":1,\"status\":\"bye\"}}")
                    .map_err(|error| error.to_string())?;
                writer.flush().map_err(|error| error.to_string())?;
                return Ok(());
            }
            "" => {}
            other => return Err(format!("unknown serve command: {other}")),
        }
    }
}

fn read_stream_documents<R: BufRead>(reader: &mut R) -> Result<Vec<Document>, String> {
    let document_count = read_stream_usize_line(reader)?;
    let mut documents = Vec::with_capacity(document_count);

    for _ in 0..document_count {
        documents.push(Document {
            path: read_stream_string(reader)?,
            title: read_stream_string(reader)?,
            content: read_stream_string(reader)?,
        });
    }

    Ok(documents)
}

fn read_stream_line<R: BufRead>(reader: &mut R) -> Result<Option<String>, String> {
    let mut line = String::new();
    let bytes = reader
        .read_line(&mut line)
        .map_err(|error| error.to_string())?;

    if bytes == 0 {
        return Ok(None);
    }

    Ok(Some(line.trim_end_matches(['\r', '\n']).to_string()))
}

fn read_stream_usize_line<R: BufRead>(reader: &mut R) -> Result<usize, String> {
    read_stream_line(reader)?
        .ok_or_else(|| "unexpected end of input while reading number".to_string())?
        .trim()
        .parse::<usize>()
        .map_err(|_| "expected numeric line".to_string())
}

fn read_stream_string<R: BufRead>(reader: &mut R) -> Result<String, String> {
    let length = read_stream_usize_line(reader)?;
    let mut bytes = vec![0u8; length];
    reader
        .read_exact(&mut bytes)
        .map_err(|error| error.to_string())?;
    consume_stream_newline(reader)?;
    String::from_utf8(bytes).map_err(|_| "string is not valid utf-8".to_string())
}

fn consume_stream_newline<R: BufRead>(reader: &mut R) -> Result<(), String> {
    let mut byte = [0u8; 1];
    reader
        .read_exact(&mut byte)
        .map_err(|error| error.to_string())?;

    if byte[0] == b'\r' {
        reader
            .read_exact(&mut byte)
            .map_err(|error| error.to_string())?;
    }

    if byte[0] != b'\n' {
        return Err("expected newline separator".to_string());
    }

    Ok(())
}

fn count_index_documents(index: &SearchIndex) -> usize {
    let mut paths: Vec<&str> = index
        .chunks
        .iter()
        .map(|chunk| chunk.path.as_str())
        .collect();
    paths.sort_unstable();
    paths.dedup();
    paths.len()
}

fn search(request: SearchRequest) -> SearchResponse {
    let limit = request.limit.max(1);
    let chunks = build_chunks_from_documents(&request.documents);

    search_chunks(&chunks, &request.query, limit)
}

fn build_chunks_from_documents(documents: &[Document]) -> Vec<Chunk> {
    documents.iter().flat_map(chunk_document).collect()
}

fn search_chunks(chunks: &[Chunk], query: &str, limit: usize) -> SearchResponse {
    let mut query_terms = expand_query_terms(&tokenize(query));
    query_terms.truncate(MAX_QUERY_TERMS);
    let query_vector = embed_terms(&query_terms);
    let query_phrase = normalize_search_text(query);
    let mut results: Vec<SearchResult> = chunks
        .iter()
        .map(|chunk| {
            let vector_score = dot_product(&query_vector, &chunk.vector);
            let lexical_score = lexical_overlap(&chunk, &query_terms);
            let metadata_score = metadata_score(&chunk, &query_terms, &query_phrase);
            let phrase_score = phrase_score(&chunk, &query_phrase);
            let score = vector_score * 85.0 + lexical_score + metadata_score + phrase_score;

            SearchResult {
                path: chunk.path.clone(),
                title: chunk.title.clone(),
                score: round_score(score),
                snippet: create_snippet(&chunk.content, &query_terms),
                heading: chunk.heading.clone(),
                matches: result_matches(lexical_score, metadata_score, phrase_score),
            }
        })
        .filter(|result| result.score > 0.0)
        .collect();

    results = aggregate_search_results(results);
    results.sort_by(|left, right| {
        right
            .score
            .partial_cmp(&left.score)
            .unwrap_or(Ordering::Equal)
    });
    results.truncate(limit);

    SearchResponse { results }
}

fn aggregate_search_results(results: Vec<SearchResult>) -> Vec<SearchResult> {
    let mut by_path: HashMap<String, (SearchResult, f64, usize)> = HashMap::new();

    for result in results {
        let path = result.path.clone();

        match by_path.get_mut(&path) {
            Some((best, total_score, chunks)) => {
                let merged_matches = merge_matches(&best.matches, &result.matches);

                if result.score > best.score {
                    *best = SearchResult {
                        matches: merged_matches,
                        ..result
                    };
                } else {
                    best.matches = merged_matches;
                }

                *total_score += result.score;
                *chunks += 1;
            }
            None => {
                let score = result.score;
                by_path.insert(path, (result, score, 1));
            }
        }
    }

    by_path
        .into_values()
        .map(|(mut result, total_score, chunks)| {
            if chunks > 1 {
                let additional_score = (total_score - result.score).max(0.0);
                let bonus = (additional_score * 0.18).min(18.0);
                result.score = round_score(result.score + bonus);
                push_unique(&mut result.matches, "multi-chunk");
            }

            result
        })
        .collect()
}

fn merge_matches(left: &[String], right: &[String]) -> Vec<String> {
    let mut merged = left.to_vec();

    for value in right {
        if !merged.iter().any(|item| item == value) {
            merged.push(value.clone());
        }
    }

    merged
}

fn chunk_document(document: &Document) -> Vec<Chunk> {
    let mut chunks = Vec::new();
    let mut heading: Option<String> = None;
    let mut buffer = String::new();

    for line in document.content.lines() {
        if let Some(next_heading) = parse_heading(line) {
            flush_chunk(document, &mut chunks, &mut buffer, heading.clone());
            heading = Some(next_heading);
        }

        if !buffer.is_empty() {
            buffer.push('\n');
        }

        buffer.push_str(line);

        if buffer.len() >= MAX_CHUNK_CHARS {
            flush_chunk(document, &mut chunks, &mut buffer, heading.clone());
        }
    }

    flush_chunk(document, &mut chunks, &mut buffer, heading);
    chunks
}

fn flush_chunk(
    document: &Document,
    chunks: &mut Vec<Chunk>,
    buffer: &mut String,
    heading: Option<String>,
) {
    let content = buffer.trim().to_string();

    if content.is_empty() {
        buffer.clear();
        return;
    }

    let embedding_text = format!(
        "{}\n{}\n{}\n{}",
        document.title,
        heading.clone().unwrap_or_default(),
        document.path,
        content
    );

    let terms = tokenize(&embedding_text);
    let term_set = terms.iter().cloned().collect::<HashSet<String>>();
    let title_terms = tokenize(&document.title);
    let heading_terms = tokenize(heading.as_deref().unwrap_or_default());
    let path_terms = tokenize(&document.path);
    let title_phrase = normalize_search_text(&document.title);
    let heading_phrase = normalize_search_text(heading.as_deref().unwrap_or_default());

    chunks.push(Chunk {
        path: document.path.clone(),
        title: document.title.clone(),
        heading,
        content,
        vector: embed_terms(&terms),
        terms,
        term_set,
        title_terms,
        heading_terms,
        path_terms,
        title_phrase,
        heading_phrase,
    });
    buffer.clear();
}

fn parse_heading(line: &str) -> Option<String> {
    let trimmed = line.trim_start();

    if !trimmed.starts_with('#') {
        return None;
    }

    let hashes = trimmed
        .chars()
        .take_while(|character| *character == '#')
        .count();

    if hashes == 0 || hashes > 6 {
        return None;
    }

    let rest = trimmed[hashes..].trim();

    if rest.is_empty() {
        None
    } else {
        Some(rest.to_string())
    }
}

fn embed_terms(terms: &[String]) -> Vec<f64> {
    let mut vector = vec![0.0; DIMENSIONS];

    for term in terms {
        let index = positive_hash(term) % DIMENSIONS;
        vector[index] += 1.0;

        if term.chars().count() >= 6 {
            let prefix = term.chars().take(5).collect::<String>();
            let prefix_index = positive_hash(&prefix) % DIMENSIONS;
            vector[prefix_index] += 0.35;
        }
    }

    let magnitude = vector.iter().map(|value| value * value).sum::<f64>().sqrt();

    if magnitude == 0.0 {
        return vector;
    }

    vector.iter().map(|value| value / magnitude).collect()
}

fn tokenize(text: &str) -> Vec<String> {
    let normalized = text.to_lowercase().replace('ё', "е");
    let mut terms = Vec::new();
    let mut seen = HashSet::new();

    for raw_term in normalized.split(|character: char| {
        !(character.is_alphanumeric() || character == '_' || character == '+' || character == '-')
    }) {
        let term = normalize_term(raw_term);

        if term.chars().count() >= 2 && seen.insert(term.clone()) {
            terms.push(term);
        }
    }

    terms
}

fn normalize_term(term: &str) -> String {
    let mut value = term.trim().replace('ё', "е");

    if value.is_empty() || is_stop_word(&value) {
        return String::new();
    }

    if value.is_ascii() {
        strip_first_suffix(&mut value, &["ing", "ed", "es", "s"]);
        return value;
    }

    if value.chars().any(is_cyrillic) {
        strip_first_suffix(
            &mut value,
            &[
                "иями", "ями", "ами", "ого", "ему", "ыми", "ими", "овой", "евый", "ная", "ный",
                "ная", "ное", "ные", "ого", "его", "ая", "ое", "ые", "ий", "ый", "ой", "ов", "ев",
                "ам", "ям", "ах", "ях", "ом", "ем", "ок", "а", "я", "ы", "и", "е", "у", "ю",
            ],
        );
    }

    value
}

fn lexical_overlap(chunk: &Chunk, query_terms: &[String]) -> f64 {
    if query_terms.is_empty() {
        return 0.0;
    }

    let covered = query_terms
        .iter()
        .filter(|term| {
            chunk.term_set.contains(*term)
                || chunk.terms.iter().any(|chunk_term| {
                    (term.chars().count() >= 4 && chunk_term.starts_with(term.as_str()))
                        || (chunk_term.chars().count() >= 4
                            && term.starts_with(chunk_term.as_str()))
                })
        })
        .count();

    covered as f64 / query_terms.len() as f64 * 34.0
}

fn strip_first_suffix(value: &mut String, suffixes: &[&str]) {
    for suffix in suffixes {
        if value.chars().count() > suffix.chars().count() + 2 && value.ends_with(suffix) {
            let next_len = value.len() - suffix.len();
            value.truncate(next_len);
            break;
        }
    }
}

fn is_cyrillic(character: char) -> bool {
    ('а'..='я').contains(&character) || ('А'..='Я').contains(&character)
}

fn is_stop_word(value: &str) -> bool {
    matches!(
        value,
        "the"
            | "and"
            | "for"
            | "with"
            | "from"
            | "this"
            | "that"
            | "what"
            | "where"
            | "which"
            | "about"
            | "into"
            | "your"
            | "you"
            | "are"
            | "how"
            | "что"
            | "как"
            | "это"
            | "для"
            | "или"
            | "при"
            | "где"
            | "мне"
            | "мой"
            | "моя"
            | "мои"
            | "про"
            | "об"
            | "все"
    )
}

fn expand_query_terms(terms: &[String]) -> Vec<String> {
    let mut expanded = terms.to_vec();

    for term in terms {
        for alias in aliases_for(term) {
            let normalized = normalize_term(alias);

            if normalized.chars().count() >= 2 && !expanded.contains(&normalized) {
                expanded.push(normalized);
            }
        }
    }

    if expanded.iter().any(|term| term == "speech") && expanded.iter().any(|term| term == "text") {
        push_unique(&mut expanded, "stt");
    }

    if expanded.iter().any(|term| term == "voice") && expanded.iter().any(|term| term == "output") {
        push_unique(&mut expanded, "tts");
    }

    expanded
}

fn aliases_for(term: &str) -> &'static [&'static str] {
    match term {
        "speech" => &["voice", "audio", "stt"],
        "text" => &["stt", "transcription"],
        "transcription" => &["stt", "speech"],
        "transcribe" => &["stt", "speech"],
        "output" => &["tts", "speech"],
        "speak" => &["tts", "voice"],
        "read" => &["tts", "voice"],
        "llm" => &["model", "language"],
        "rag" => &["retrieval", "search", "vault"],
        "markdown" => &["md", "note"],
        "замет" => &["note", "vault"],
        "голос" => &["voice", "speech", "audio"],
        _ => &[],
    }
}

fn push_unique(values: &mut Vec<String>, value: &str) {
    if !values.iter().any(|item| item == value) {
        values.push(value.to_string());
    }
}

fn normalize_search_text(value: &str) -> String {
    tokenize(value).join(" ")
}

fn metadata_score(chunk: &Chunk, query_terms: &[String], query_phrase: &str) -> f64 {
    let mut score = 0.0;

    if !query_phrase.is_empty() && chunk.title_phrase.contains(query_phrase) {
        score += 28.0;
    }

    if !query_phrase.is_empty() && chunk.heading_phrase.contains(query_phrase) {
        score += 24.0;
    }

    for term in query_terms {
        if chunk.title_terms.contains(term) {
            score += 8.0;
        }

        if chunk.heading_terms.contains(term) {
            score += 7.0;
        }

        if chunk.path_terms.contains(term) {
            score += 5.0;
        }
    }

    score
}

fn phrase_score(chunk: &Chunk, query_phrase: &str) -> f64 {
    if query_phrase.is_empty() {
        return 0.0;
    }

    let path_phrase = normalize_search_text(&chunk.path);
    let content_phrase = normalize_search_text(&chunk.content);
    let mut score = 0.0;

    if chunk.title_phrase == query_phrase {
        score += 86.0;
    } else if chunk.title_phrase.contains(query_phrase) {
        score += 52.0;
    }

    if chunk.heading_phrase == query_phrase {
        score += 68.0;
    } else if chunk.heading_phrase.contains(query_phrase) {
        score += 42.0;
    }

    if path_phrase.contains(query_phrase) {
        score += 30.0;
    }

    if content_phrase.contains(query_phrase) {
        score += 18.0;
    }

    score
}

fn result_matches(lexical_score: f64, metadata_score: f64, phrase_score: f64) -> Vec<String> {
    let mut matches = vec![
        RAG_V2_MATCH.to_string(),
        "rust-core".to_string(),
        "vector".to_string(),
    ];

    if phrase_score > 0.0 {
        matches.push("phrase".to_string());
    }

    if lexical_score > 0.0 {
        matches.push("lexical".to_string());
    }

    if metadata_score > 0.0 {
        matches.push("metadata".to_string());
    }

    matches
}

fn create_snippet(content: &str, query_terms: &[String]) -> String {
    let lower_content = content.to_lowercase().replace('ё', "е");
    let first_index = query_terms
        .iter()
        .filter_map(|term| lower_content.find(term))
        .min()
        .unwrap_or(0);
    let start = previous_char_boundary(content, first_index.saturating_sub(120));
    let end = previous_char_boundary(content, (start + 520).min(content.len()));
    let snippet = content[start..end].trim();

    format!(
        "{}{}{}",
        if start > 0 { "... " } else { "" },
        snippet,
        if end < content.len() { " ..." } else { "" }
    )
}

fn previous_char_boundary(text: &str, mut index: usize) -> usize {
    index = index.min(text.len());

    while index > 0 && !text.is_char_boundary(index) {
        index -= 1;
    }

    index
}

fn dot_product(left: &[f64], right: &[f64]) -> f64 {
    left.iter()
        .zip(right.iter())
        .map(|(left, right)| left * right)
        .sum()
}

fn positive_hash(value: &str) -> usize {
    let mut hash: u32 = 2166136261;

    for byte in value.bytes() {
        hash ^= byte as u32;
        hash = hash.wrapping_mul(16777619);
    }

    hash as usize
}

fn round_score(score: f64) -> f64 {
    (score * 1000.0).round() / 1000.0
}

fn response_to_json(response: &SearchResponse) -> String {
    let mut json = String::from("{\"version\":1,\"results\":[");

    for (index, result) in response.results.iter().enumerate() {
        if index > 0 {
            json.push(',');
        }

        json.push_str("{\"path\":");
        json.push_str(&json_string(&result.path));
        json.push_str(",\"title\":");
        json.push_str(&json_string(&result.title));
        json.push_str(",\"score\":");
        json.push_str(&format!("{:.3}", result.score));
        json.push_str(",\"snippet\":");
        json.push_str(&json_string(&result.snippet));
        json.push_str(",\"heading\":");

        if let Some(heading) = &result.heading {
            json.push_str(&json_string(heading));
        } else {
            json.push_str("null");
        }

        json.push_str(",\"matches\":[");
        for (match_index, match_value) in result.matches.iter().enumerate() {
            if match_index > 0 {
                json.push(',');
            }

            json.push_str(&json_string(match_value));
        }
        json.push(']');

        json.push('}');
    }

    json.push_str("]}");
    json
}

fn resolve_response_to_json(results: &[resolver::ResolvedPath]) -> String {
    let items = results
        .iter()
        .map(|item| {
            format!(
                "{{\"path\":{},\"score\":{}}}",
                json_string(&item.path),
                item.score
            )
        })
        .collect::<Vec<String>>()
        .join(",");

    format!("{{\"version\":1,\"results\":[{}]}}", items)
}

fn diff_response_to_json(lines: &[diff::DiffLine]) -> String {
    let items = lines
        .iter()
        .map(|line| {
            format!(
                "{{\"kind\":{},\"text\":{}}}",
                json_string(line.kind),
                json_string(&line.text)
            )
        })
        .collect::<Vec<String>>()
        .join(",");

    format!("{{\"version\":1,\"lines\":[{}]}}", items)
}

fn text_occurrence_response_to_json(result: &occurrence::TextOccurrenceResult) -> String {
    let match_json = match &result.matched {
        Some(item) => format!(
            "{{\"original\":{},\"occurrenceIndex\":{},\"score\":{:.3}}}",
            json_string(&item.original),
            item.occurrence_index
                .map(|index| index.to_string())
                .unwrap_or_else(|| "null".to_string()),
            round_score(item.score)
        ),
        None => "null".to_string(),
    };
    let error_json = result
        .error
        .as_deref()
        .map(json_string)
        .unwrap_or_else(|| "null".to_string());

    format!(
        "{{\"version\":1,\"match\":{},\"error\":{}}}",
        match_json, error_json
    )
}

fn json_string(value: &str) -> String {
    format!("\"{}\"", protocol::escape_json(value))
}

fn exit_with_error(message: &str) -> ! {
    eprintln!("{message}");
    std::process::exit(1);
}

impl<'a> WireReader<'a> {
    fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, cursor: 0 }
    }

    fn read_line(&mut self) -> Result<String, String> {
        let start = self.cursor;

        while self.cursor < self.bytes.len() && self.bytes[self.cursor] != b'\n' {
            self.cursor += 1;
        }

        if self.cursor >= self.bytes.len() {
            return Err("unexpected end of input while reading line".to_string());
        }

        let mut line = &self.bytes[start..self.cursor];
        self.cursor += 1;

        if line.ends_with(b"\r") {
            line = &line[..line.len() - 1];
        }

        String::from_utf8(line.to_vec()).map_err(|_| "line is not valid utf-8".to_string())
    }

    fn read_usize_line(&mut self) -> Result<usize, String> {
        self.read_line()?
            .trim()
            .parse::<usize>()
            .map_err(|_| "expected numeric line".to_string())
    }

    fn read_string(&mut self) -> Result<String, String> {
        let length = self.read_usize_line()?;
        let end = self
            .cursor
            .checked_add(length)
            .ok_or_else(|| "string length overflow".to_string())?;

        if end > self.bytes.len() {
            return Err("unexpected end of input while reading string".to_string());
        }

        let value = String::from_utf8(self.bytes[self.cursor..end].to_vec())
            .map_err(|_| "string is not valid utf-8".to_string())?;
        self.cursor = end;
        self.consume_newline()?;
        Ok(value)
    }

    fn consume_newline(&mut self) -> Result<(), String> {
        if self.cursor >= self.bytes.len() {
            return Err("expected newline separator".to_string());
        }

        if self.bytes[self.cursor] == b'\r' {
            self.cursor += 1;
        }

        if self.cursor >= self.bytes.len() || self.bytes[self.cursor] != b'\n' {
            return Err("expected newline separator".to_string());
        }

        self.cursor += 1;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn wire_string(value: &str) -> String {
        format!("{}\n{}\n", value.as_bytes().len(), value)
    }

    #[test]
    fn parses_wire_request() {
        let input = format!(
            "{}\n{}\n{}{}\n{}{}{}",
            WIRE_HEADER,
            3,
            wire_string("voice flow"),
            1,
            wire_string("Obsidian/Voice Flow.md"),
            wire_string("Voice Flow"),
            wire_string("# Voice Flow\nLocal STT and TTS command routing.")
        );
        let request = parse_wire_request(input.as_bytes()).expect("request parses");

        assert_eq!(request.limit, 3);
        assert_eq!(request.query, "voice flow");
        assert_eq!(request.documents.len(), 1);
        assert_eq!(request.documents[0].path, "Obsidian/Voice Flow.md");
    }

    #[test]
    fn search_returns_relevant_document() {
        let response = search(SearchRequest {
            query: "voice stt tts diff".to_string(),
            limit: 8,
            documents: vec![
                Document {
                    path: "Obsidian/Voice Flow.md".to_string(),
                    title: "Voice Flow".to_string(),
                    content: "# Voice Flow\nLocal STT, TTS, tool routing, and diff previews."
                        .to_string(),
                },
                Document {
                    path: "Proton/LLM Engineering.md".to_string(),
                    title: "LLM Engineering".to_string(),
                    content: "Quantization and fine tuning roadmap.".to_string(),
                },
            ],
        });

        assert_eq!(response.results[0].path, "Obsidian/Voice Flow.md");
        assert!(response.results[0].score > 20.0);
        assert!(response.results[0]
            .matches
            .contains(&RAG_V2_MATCH.to_string()));
        assert!(response.results[0]
            .matches
            .contains(&"rust-core".to_string()));
    }

    #[test]
    fn search_uses_rag_v2_aliases() {
        let response = search(SearchRequest {
            query: "speech to text voice output command routing".to_string(),
            limit: 3,
            documents: vec![
                Document {
                    path: "Obsidian/Voice Flow.md".to_string(),
                    title: "Voice Flow".to_string(),
                    content: "# Voice Flow\nThe Contex voice pipeline uses microphone recording, local STT, tool routing, diff previews, and TTS output.".to_string(),
                },
                Document {
                    path: "Proton/Model Training.md".to_string(),
                    title: "Model Training".to_string(),
                    content: "Quantization benchmark evaluation and dataset notes.".to_string(),
                },
            ],
        });

        assert_eq!(response.results[0].path, "Obsidian/Voice Flow.md");
        assert!(response.results[0]
            .matches
            .contains(&RAG_V2_MATCH.to_string()));
        assert!(response.results[0].matches.contains(&"lexical".to_string()));
    }

    #[test]
    fn search_handles_russian_query_forms() {
        let response = search(SearchRequest {
            query: "голосом режимы заметок".to_string(),
            limit: 3,
            documents: vec![
                Document {
                    path: "Obsidian/Голос.md".to_string(),
                    title: "Голос".to_string(),
                    content:
                        "# Голосовой режим\nГолосовой режим Contex управляет заметками голосом."
                            .to_string(),
                },
                Document {
                    path: "Proton/Model Training.md".to_string(),
                    title: "Model Training".to_string(),
                    content: "STT benchmark and dataset notes.".to_string(),
                },
            ],
        });

        assert_eq!(response.results[0].path, "Obsidian/Голос.md");
        assert!(response.results[0]
            .matches
            .contains(&"metadata".to_string()));
    }

    #[test]
    fn search_aggregates_duplicate_chunks_per_note() {
        let response = search(SearchRequest {
            query: "local stt tts voice".to_string(),
            limit: 4,
            documents: vec![
                Document {
                    path: "Obsidian/Voice Flow.md".to_string(),
                    title: "Voice Flow".to_string(),
                    content: [
                        "# Voice Flow",
                        "Local STT and TTS control live dialogue.",
                        "This paragraph keeps voice routing details together.",
                        "",
                        "## Runtime",
                        "Local STT and TTS should stay responsive for voice commands.",
                        "The runtime keeps dialogue quick and grounded in the vault.",
                    ]
                    .join("\n"),
                },
                Document {
                    path: "Obsidian/Other.md".to_string(),
                    title: "Other".to_string(),
                    content: "# Other\n\nLocal STT is mentioned once.".to_string(),
                },
            ],
        });

        assert_eq!(response.results[0].path, "Obsidian/Voice Flow.md");
        assert_eq!(
            response
                .results
                .iter()
                .filter(|result| result.path == "Obsidian/Voice Flow.md")
                .count(),
            1
        );
        assert!(response.results[0]
            .matches
            .contains(&"multi-chunk".to_string()));
    }

    #[test]
    fn search_prefers_exact_title_over_body_noise() {
        let response = search(SearchRequest {
            query: "Voice Flow".to_string(),
            limit: 3,
            documents: vec![
                Document {
                    path: "Obsidian/Voice Flow.md".to_string(),
                    title: "Voice Flow".to_string(),
                    content: "# Voice Flow\nShort architectural note.".to_string(),
                },
                Document {
                    path: "Research/Voice Notes.md".to_string(),
                    title: "Voice Notes".to_string(),
                    content: "Voice flow voice flow voice flow appears repeatedly in body text.".to_string(),
                },
            ],
        });

        assert_eq!(response.results[0].path, "Obsidian/Voice Flow.md");
        assert!(response.results[0]
            .matches
            .contains(&"phrase".to_string()));
    }

    #[test]
    fn json_output_escapes_strings() {
        let json = response_to_json(&SearchResponse {
            results: vec![SearchResult {
                path: "A/Quote.md".to_string(),
                title: "Quote".to_string(),
                score: 1.25,
                snippet: "hello \"world\"\nnext".to_string(),
                heading: None,
                matches: vec![RAG_V2_MATCH.to_string(), "rust-core".to_string()],
            }],
        });

        assert!(json.contains("hello \\\"world\\\"\\nnext"));
        assert!(json.contains("\"heading\":null"));
        assert!(json.contains("\"matches\":[\"rag-v2\",\"rust-core\"]"));
    }

    #[test]
    fn serve_indexes_and_searches_from_memory() {
        let input = format!(
            "{}\n{}{}{}{}{}{}\n{}\n{}\n{}\n{}\n",
            "CTXCORE_INDEX_V1",
            1,
            "\n",
            wire_string("Obsidian/Voice Flow.md"),
            wire_string("Voice Flow"),
            wire_string("# Voice Flow\nLocal STT, TTS, tool routing, and diff previews."),
            "CTXCORE_SEARCH_INDEX_V1",
            3,
            wire_string("voice stt tts diff"),
            "CTXCORE_STATUS_V1",
            "CTXCORE_EXIT_V1"
        );
        let mut output = Vec::new();

        serve(input.as_bytes(), &mut output).expect("serve protocol works");

        let text = String::from_utf8(output).expect("utf8 output");
        assert!(text.contains("\"path\":\"Obsidian/Voice Flow.md\""));
        assert!(text.contains("\"status\":\"ready\""));
        assert!(text.contains("\"status\":\"bye\""));
    }
}
