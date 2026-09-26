pub mod providers;
pub mod secrets;

use reqwest::header::{HeaderMap, HeaderName, HeaderValue, CONTENT_TYPE};
use serde::Serialize;
use serde_json::Value;
use std::time::Duration;
use tauri::{command, AppHandle};

use providers::{Connector, ModelOption};

/// How long to wait on a provider before giving up.
const TIMEOUT: Duration = Duration::from_secs(90);

/// A connector as the settings UI sees it: never includes the key itself.
#[derive(Serialize, Clone, Debug)]
pub struct ProviderStatus {
    pub id: String,
    pub label: String,
    pub keys_url: String,
    pub key_hint: String,
    pub models: Vec<ModelOption>,
    pub default_model: String,
    pub connected: bool,
    /// A few characters of the stored key, enough to tell which one it is.
    pub masked_key: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
pub struct AiReply {
    pub provider: String,
    pub model: String,
    pub text: String,
}

/// Every connector, annotated with whether a key is stored for it.
#[command]
pub fn ai_providers(app: AppHandle) -> Result<Vec<ProviderStatus>, String> {
    // A broken store must not hide the provider list; it just means no keys.
    let stored = secrets::load_all(&app).unwrap_or_default();

    Ok(providers::all()
        .into_iter()
        .map(|connector| {
            let spec = connector.spec();
            let key = stored.get(&spec.id);

            ProviderStatus {
                connected: key.is_some(),
                masked_key: key.map(|k| secrets::mask(k)),
                id: spec.id,
                label: spec.label,
                keys_url: spec.keys_url,
                key_hint: spec.key_hint,
                models: spec.models,
                default_model: spec.default_model,
            }
        })
        .collect())
}

#[command]
pub fn ai_set_key(app: AppHandle, provider: String, key: String) -> Result<(), String> {
    if providers::find(&provider).is_none() {
        return Err(format!("Unknown provider: {provider}"));
    }
    secrets::set(&app, &provider, &key)
}

#[command]
pub fn ai_clear_key(app: AppHandle, provider: String) -> Result<(), String> {
    secrets::clear(&app, &provider)
}

/// Builds the header map for one call.
///
/// Uses insert rather than append: reqwest's `RequestBuilder::header` appends,
/// so setting a header that a previous call already set sends it twice. A
/// duplicated Content-Type makes providers reject the body as unparseable,
/// which surfaces as a confusing complaint about a missing field.
fn build_headers(headers: &[(String, String)]) -> Result<HeaderMap, String> {
    let mut map = HeaderMap::new();
    map.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

    for (name, value) in headers {
        let name = HeaderName::from_bytes(name.as_bytes())
            .map_err(|_| format!("Invalid header name: {name}"))?;

        let mut header = HeaderValue::from_str(value)
            .map_err(|_| format!("Invalid value for header {name}"))?;

        // Keeps API keys out of reqwest's debug output.
        header.set_sensitive(true);

        map.insert(name, header);
    }

    Ok(map)
}

async fn send(
    connector: &dyn Connector,
    api_key: &str,
    model: &str,
    system: &str,
    prompt: &str,
) -> Result<String, String> {
    let call = connector.request(api_key, model, system, prompt);

    let client = reqwest::Client::builder()
        .timeout(TIMEOUT)
        .build()
        .map_err(|e| format!("Could not start the request: {e}"))?;

    let body = serde_json::to_vec(&call.body)
        .map_err(|e| format!("Could not encode the request: {e}"))?;

    let response = client
        .post(&call.url)
        .headers(build_headers(&call.headers)?)
        .body(body)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "The provider did not respond in time".to_string()
            } else if e.is_connect() {
                "Could not reach the provider - check your connection".to_string()
            } else {
                format!("Request failed: {e}")
            }
        })?;

    let status = response.status().as_u16();
    let raw = response
        .text()
        .await
        .map_err(|e| format!("Could not read the response: {e}"))?;

    // A provider can fail with a non-JSON body (a proxy or gateway page).
    let body: Value = serde_json::from_str(&raw).unwrap_or(Value::Null);

    if !(200..300).contains(&status) {
        return Err(connector.parse_error(status, &body));
    }

    if body.is_null() {
        return Err("The provider returned a response that was not JSON".into());
    }

    connector.parse_reply(&body)
}

/// Sends a prompt to the chosen provider and returns its reply.
///
/// The key is read here and never crosses back into the frontend.
#[command]
pub async fn ai_complete(
    app: AppHandle,
    provider: String,
    model: Option<String>,
    prompt: String,
    system: Option<String>,
) -> Result<AiReply, String> {
    let prompt = prompt.trim().to_string();
    if prompt.is_empty() {
        return Err("Ask something first".into());
    }

    let connector =
        providers::find(&provider).ok_or_else(|| format!("Unknown provider: {provider}"))?;
    let spec = connector.spec();

    let api_key = secrets::get(&app, &provider)?.ok_or_else(|| {
        format!("No API key saved for {}. Add one in Settings.", spec.label)
    })?;

    let model = model
        .map(|m| m.trim().to_string())
        .filter(|m| !m.is_empty())
        .unwrap_or_else(|| spec.default_model.clone());

    let text = send(
        connector.as_ref(),
        &api_key,
        &model,
        system.as_deref().unwrap_or_default(),
        &prompt,
    )
    .await?;

    Ok(AiReply {
        provider: spec.id,
        model,
        text,
    })
}


#[cfg(test)]
mod tests {
    use super::build_headers;
    use reqwest::header::CONTENT_TYPE;

    fn pairs(items: &[(&str, &str)]) -> Vec<(String, String)> {
        items
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect()
    }

    #[test]
    fn content_type_is_sent_exactly_once() {
        // Every connector's own content-type must collapse into the one the
        // transport sets - a duplicate is what broke the OpenAI request.
        let headers = build_headers(&pairs(&[
            ("content-type", "application/json"),
            ("authorization", "Bearer KEY"),
        ]))
        .unwrap();

        assert_eq!(headers.get_all(CONTENT_TYPE).iter().count(), 1);
        assert_eq!(headers.get(CONTENT_TYPE).unwrap(), "application/json");
    }

    #[test]
    fn no_header_is_ever_duplicated() {
        let headers = build_headers(&pairs(&[
            ("x-api-key", "first"),
            ("x-api-key", "second"),
        ]))
        .unwrap();

        assert_eq!(headers.get_all("x-api-key").iter().count(), 1);
        assert_eq!(headers.get("x-api-key").unwrap(), "second");
    }

    #[test]
    fn credentials_are_marked_sensitive() {
        let headers = build_headers(&pairs(&[("x-api-key", "sk-secret")])).unwrap();
        assert!(
            headers.get("x-api-key").unwrap().is_sensitive(),
            "the key would show up in debug output"
        );
    }

    #[test]
    fn every_connector_builds_valid_headers() {
        for connector in super::providers::all() {
            let call = connector.request("KEY", "some-model", "", "hi");
            let headers = build_headers(&call.headers)
                .unwrap_or_else(|e| panic!("{}: {e}", connector.spec().id));

            assert_eq!(
                headers.get_all(CONTENT_TYPE).iter().count(),
                1,
                "{} sends content-type more than once",
                connector.spec().id
            );
        }
    }

    #[test]
    fn a_malformed_header_name_is_reported_not_panicked() {
        assert!(build_headers(&pairs(&[("bad header", "v")])).is_err());
        assert!(build_headers(&pairs(&[("x", "bad\nvalue")])).is_err());
    }
}
