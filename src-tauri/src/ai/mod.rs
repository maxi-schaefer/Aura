pub mod providers;
pub mod secrets;

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

    let mut request = client.post(&call.url).json(&call.body);
    for (name, value) in &call.headers {
        request = request.header(name, value);
    }

    let response = request.send().await.map_err(|e| {
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
