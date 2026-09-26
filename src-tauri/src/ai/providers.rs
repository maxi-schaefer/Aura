use serde::Serialize;
use serde_json::{json, Value};

/// A model a connector can talk to.
#[derive(Serialize, Clone, Debug)]
pub struct ModelOption {
    pub id: String,
    pub label: String,
}

fn model(id: &str, label: &str) -> ModelOption {
    ModelOption {
        id: id.into(),
        label: label.into(),
    }
}

/// Everything the UI needs to describe a connector, without any secret.
#[derive(Serialize, Clone, Debug)]
pub struct ProviderSpec {
    pub id: String,
    pub label: String,
    /// Where the user gets an API key.
    pub keys_url: String,
    /// What a key from this provider tends to look like.
    pub key_hint: String,
    pub models: Vec<ModelOption>,
    /// Used when the user has not chosen one.
    pub default_model: String,
}

/// A prepared HTTP call, so the transport stays in one place and each
/// connector only describes its own wire format.
pub struct HttpCall {
    pub url: String,
    pub headers: Vec<(String, String)>,
    pub body: Value,
}

/// One AI backend.
///
/// Adding a provider means implementing this and adding it to `all()` -
/// nothing else in the app needs to change.
pub trait Connector: Send + Sync {
    fn spec(&self) -> ProviderSpec;

    /// Builds the completion request for this provider's own wire format.
    fn request(&self, api_key: &str, model: &str, system: &str, prompt: &str) -> HttpCall;

    /// Pulls the reply text out of a 2xx response body.
    fn parse_reply(&self, body: &Value) -> Result<String, String>;

    /// Turns a non-2xx body into something worth showing a user.
    fn parse_error(&self, status: u16, body: &Value) -> String {
        let message = body
            .pointer("/error/message")
            .and_then(Value::as_str)
            .or_else(|| body.get("message").and_then(Value::as_str))
            .unwrap_or("no details");

        match status {
            401 | 403 => format!("Authentication failed - check the API key ({message})"),
            429 => format!("Rate limited by the provider ({message})"),
            500..=599 => format!("The provider had a server error ({message})"),
            _ => format!("Request failed with HTTP {status} ({message})"),
        }
    }
}

// ---------------------------------------------------------------- Anthropic

pub struct Anthropic;

impl Connector for Anthropic {
    fn spec(&self) -> ProviderSpec {
        ProviderSpec {
            id: "anthropic".into(),
            label: "Claude".into(),
            keys_url: "https://console.anthropic.com/settings/keys".into(),
            key_hint: "sk-ant-...".into(),
            models: vec![
                model("claude-opus-5", "Claude Opus 5"),
                model("claude-sonnet-5", "Claude Sonnet 5"),
                model("claude-haiku-4-5", "Claude Haiku 4.5"),
                model("claude-fable-5-1", "Claude Fable 5.1"),
                model("claude-opus-4-8", "Claude Opus 4.8"),
            ],
            default_model: "claude-opus-5".into(),
        }
    }

    fn request(&self, api_key: &str, model: &str, system: &str, prompt: &str) -> HttpCall {
        let mut body = json!({
            "model": model,
            "max_tokens": 4096,
            "messages": [{ "role": "user", "content": prompt }],
        });

        if !system.is_empty() {
            body["system"] = json!(system);
        }

        HttpCall {
            url: "https://api.anthropic.com/v1/messages".into(),
            headers: vec![
                ("x-api-key".into(), api_key.into()),
                ("anthropic-version".into(), "2023-06-01".into()),
                ("content-type".into(), "application/json".into()),
            ],
            body,
        }
    }

    fn parse_reply(&self, body: &Value) -> Result<String, String> {
        // A policy decline is an HTTP 200, so it has to be checked here.
        if body.get("stop_reason").and_then(Value::as_str) == Some("refusal") {
            return Err("Claude declined to answer this request.".into());
        }

        // content is a list of blocks; only the text ones are displayable.
        let text: String = body
            .get("content")
            .and_then(Value::as_array)
            .map(|blocks| {
                blocks
                    .iter()
                    .filter(|b| b.get("type").and_then(Value::as_str) == Some("text"))
                    .filter_map(|b| b.get("text").and_then(Value::as_str))
                    .collect::<Vec<_>>()
                    .join("")
            })
            .unwrap_or_default();

        if text.is_empty() {
            return Err("The response contained no text".into());
        }
        Ok(text)
    }
}

// ------------------------------------------------------------------ OpenAI

pub struct OpenAi;

impl Connector for OpenAi {
    fn spec(&self) -> ProviderSpec {
        ProviderSpec {
            id: "openai".into(),
            label: "OpenAI".into(),
            keys_url: "https://platform.openai.com/api-keys".into(),
            key_hint: "sk-...".into(),
            models: vec![
                model("gpt-4o", "GPT-4o"),
                model("gpt-4o-mini", "GPT-4o mini"),
                model("gpt-4.1", "GPT-4.1"),
                model("gpt-4.1-mini", "GPT-4.1 mini"),
                model("o4-mini", "o4-mini"),
            ],
            default_model: "gpt-4o".into(),
        }
    }

    fn request(&self, api_key: &str, model: &str, system: &str, prompt: &str) -> HttpCall {
        let mut messages = Vec::new();
        if !system.is_empty() {
            messages.push(json!({ "role": "system", "content": system }));
        }
        messages.push(json!({ "role": "user", "content": prompt }));

        HttpCall {
            url: "https://api.openai.com/v1/chat/completions".into(),
            headers: vec![
                ("authorization".into(), format!("Bearer {api_key}")),
                ("content-type".into(), "application/json".into()),
            ],
            body: json!({ "model": model, "messages": messages }),
        }
    }

    fn parse_reply(&self, body: &Value) -> Result<String, String> {
        body.pointer("/choices/0/message/content")
            .and_then(Value::as_str)
            .map(str::to_string)
            .filter(|t| !t.is_empty())
            .ok_or_else(|| "The response contained no text".into())
    }
}

// ------------------------------------------------------------------ Gemini

pub struct Gemini;

impl Connector for Gemini {
    fn spec(&self) -> ProviderSpec {
        ProviderSpec {
            id: "gemini".into(),
            label: "Gemini".into(),
            keys_url: "https://aistudio.google.com/apikey".into(),
            key_hint: "AIza...".into(),
            models: vec![
                model("gemini-2.5-pro", "Gemini 2.5 Pro"),
                model("gemini-2.5-flash", "Gemini 2.5 Flash"),
                model("gemini-2.0-flash", "Gemini 2.0 Flash"),
            ],
            default_model: "gemini-2.5-flash".into(),
        }
    }

    fn request(&self, api_key: &str, model: &str, system: &str, prompt: &str) -> HttpCall {
        let mut body = json!({
            "contents": [{ "role": "user", "parts": [{ "text": prompt }] }],
        });

        if !system.is_empty() {
            body["systemInstruction"] = json!({ "parts": [{ "text": system }] });
        }

        HttpCall {
            // The key goes in a header rather than the query string, so it
            // cannot end up in a proxy or server access log.
            url: format!("https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"),
            headers: vec![
                ("x-goog-api-key".into(), api_key.into()),
                ("content-type".into(), "application/json".into()),
            ],
            body,
        }
    }

    fn parse_reply(&self, body: &Value) -> Result<String, String> {
        if let Some(reason) = body
            .pointer("/candidates/0/finishReason")
            .and_then(Value::as_str)
        {
            if reason == "SAFETY" || reason == "PROHIBITED_CONTENT" {
                return Err("Gemini blocked this request.".into());
            }
        }

        let text: String = body
            .pointer("/candidates/0/content/parts")
            .and_then(Value::as_array)
            .map(|parts| {
                parts
                    .iter()
                    .filter_map(|p| p.get("text").and_then(Value::as_str))
                    .collect::<Vec<_>>()
                    .join("")
            })
            .unwrap_or_default();

        if text.is_empty() {
            return Err("The response contained no text".into());
        }
        Ok(text)
    }
}

/// Every connector the app knows about. Add new providers here.
pub fn all() -> Vec<Box<dyn Connector>> {
    vec![Box::new(Anthropic), Box::new(OpenAi), Box::new(Gemini)]
}

pub fn find(id: &str) -> Option<Box<dyn Connector>> {
    all().into_iter().find(|c| c.spec().id == id)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn connector(id: &str) -> Box<dyn Connector> {
        find(id).unwrap_or_else(|| panic!("no connector {id}"))
    }

    #[test]
    fn every_connector_is_self_consistent() {
        let mut ids = std::collections::HashSet::new();

        for c in all() {
            let spec = c.spec();
            assert!(ids.insert(spec.id.clone()), "duplicate id {}", spec.id);
            assert!(!spec.label.is_empty());
            assert!(!spec.models.is_empty(), "{} has no models", spec.id);
            assert!(
                spec.models.iter().any(|m| m.id == spec.default_model),
                "{}: default {} is not in its model list",
                spec.id,
                spec.default_model
            );
            assert!(spec.keys_url.starts_with("https://"));
        }
    }

    #[test]
    fn anthropic_request_matches_the_documented_wire_format() {
        let call = connector("anthropic").request("KEY", "claude-opus-5", "be terse", "hi");

        assert_eq!(call.url, "https://api.anthropic.com/v1/messages");
        // The key is a header, never the body or the URL.
        assert!(call.headers.contains(&("x-api-key".into(), "KEY".into())));
        assert!(call
            .headers
            .contains(&("anthropic-version".into(), "2023-06-01".into())));
        assert!(!call.url.contains("KEY"));
        assert!(!call.body.to_string().contains("KEY"));

        assert_eq!(call.body["model"], "claude-opus-5");
        assert_eq!(call.body["system"], "be terse");
        assert_eq!(call.body["messages"][0]["role"], "user");
        assert_eq!(call.body["messages"][0]["content"], "hi");
        assert!(call.body["max_tokens"].is_number());
    }

    #[test]
    fn anthropic_omits_system_when_there_is_none() {
        let call = connector("anthropic").request("K", "claude-opus-5", "", "hi");
        assert!(call.body.get("system").is_none());
    }

    #[test]
    fn anthropic_reads_text_blocks_and_honours_a_refusal() {
        let c = connector("anthropic");

        let ok = serde_json::json!({
            "content": [
                { "type": "thinking", "thinking": "..." },
                { "type": "text", "text": "Hello " },
                { "type": "text", "text": "world" }
            ],
            "stop_reason": "end_turn"
        });
        assert_eq!(c.parse_reply(&ok).unwrap(), "Hello world");

        let refused = serde_json::json!({
            "stop_reason": "refusal",
            "content": [{ "type": "text", "text": "..." }]
        });
        assert!(c.parse_reply(&refused).is_err(), "refusal was not caught");
    }

    #[test]
    fn openai_request_and_reply() {
        let call = connector("openai").request("KEY", "gpt-4o", "sys", "hi");

        assert_eq!(call.url, "https://api.openai.com/v1/chat/completions");
        assert!(call
            .headers
            .contains(&("authorization".into(), "Bearer KEY".into())));
        assert!(!call.url.contains("KEY"));

        assert_eq!(call.body["messages"][0]["role"], "system");
        assert_eq!(call.body["messages"][1]["role"], "user");

        let reply = serde_json::json!({
            "choices": [{ "message": { "role": "assistant", "content": "hi there" } }]
        });
        assert_eq!(connector("openai").parse_reply(&reply).unwrap(), "hi there");
    }

    #[test]
    fn gemini_keeps_the_key_out_of_the_url() {
        let call = connector("gemini").request("KEY", "gemini-2.5-flash", "sys", "hi");

        assert!(call.url.contains("gemini-2.5-flash:generateContent"));
        assert!(!call.url.contains("KEY"), "key leaked into the URL");
        assert!(call
            .headers
            .contains(&("x-goog-api-key".into(), "KEY".into())));
        assert_eq!(call.body["systemInstruction"]["parts"][0]["text"], "sys");
    }

    #[test]
    fn gemini_joins_parts_and_catches_a_block() {
        let c = connector("gemini");

        let ok = serde_json::json!({
            "candidates": [{
                "content": { "parts": [{ "text": "a" }, { "text": "b" }] },
                "finishReason": "STOP"
            }]
        });
        assert_eq!(c.parse_reply(&ok).unwrap(), "ab");

        let blocked = serde_json::json!({
            "candidates": [{ "content": { "parts": [] }, "finishReason": "SAFETY" }]
        });
        assert!(c.parse_reply(&blocked).is_err());
    }

    #[test]
    fn empty_responses_are_errors_everywhere() {
        for id in ["anthropic", "openai", "gemini"] {
            let c = connector(id);
            assert!(
                c.parse_reply(&serde_json::json!({})).is_err(),
                "{id} accepted an empty body"
            );
        }
    }

    #[test]
    fn error_bodies_become_readable_messages() {
        let c = connector("openai");
        let body = serde_json::json!({ "error": { "message": "Incorrect API key" } });

        let unauthorized = c.parse_error(401, &body);
        assert!(unauthorized.contains("Authentication failed"));
        assert!(unauthorized.contains("Incorrect API key"));

        assert!(c.parse_error(429, &body).contains("Rate limited"));
        assert!(c.parse_error(503, &body).contains("server error"));
    }
}
