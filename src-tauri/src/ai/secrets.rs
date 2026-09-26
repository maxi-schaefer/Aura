use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[cfg(target_os = "windows")]
use windows_sys::Win32::Security::Cryptography::{
    CryptProtectData, CryptUnprotectData, CRYPT_INTEGER_BLOB,
};
#[cfg(target_os = "windows")]
use windows_sys::Win32::Foundation::LocalFree;

/// Ciphertext only; the plaintext map never touches disk.
const SECRETS_FILE: &str = "ai-secrets.dat";

/// Mixed into the DPAPI ciphertext so a blob taken from this file cannot be
/// decrypted by another application running as the same user.
const ENTROPY: &[u8] = b"aura.ai.credentials.v1";

fn secrets_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(SECRETS_FILE))
}

#[cfg(target_os = "windows")]
fn blob(data: &[u8]) -> CRYPT_INTEGER_BLOB {
    CRYPT_INTEGER_BLOB {
        cbData: data.len() as u32,
        pbData: data.as_ptr() as *mut u8,
    }
}

/// Copies a DPAPI output blob into owned memory and frees the original.
#[cfg(target_os = "windows")]
unsafe fn take_blob(out: CRYPT_INTEGER_BLOB) -> Vec<u8> {
    let slice = std::slice::from_raw_parts(out.pbData, out.cbData as usize);
    let owned = slice.to_vec();
    LocalFree(out.pbData as *mut core::ffi::c_void as _);
    owned
}

/// Encrypts with the Windows Data Protection API.
///
/// The key is derived from the current Windows user, so the result can only
/// be read back by that same user on that same machine. Nothing we store has
/// to hold a key of its own.
#[cfg(target_os = "windows")]
fn encrypt(plaintext: &[u8]) -> Result<Vec<u8>, String> {
    unsafe {
        let input = blob(plaintext);
        let entropy = blob(ENTROPY);
        let mut output = CRYPT_INTEGER_BLOB {
            cbData: 0,
            pbData: std::ptr::null_mut(),
        };

        let ok = CryptProtectData(
            &input,
            std::ptr::null(),
            &entropy,
            std::ptr::null(),
            std::ptr::null(),
            0,
            &mut output,
        );

        if ok == 0 {
            return Err("Windows refused to encrypt the credentials".into());
        }

        Ok(take_blob(output))
    }
}

#[cfg(target_os = "windows")]
fn decrypt(ciphertext: &[u8]) -> Result<Vec<u8>, String> {
    unsafe {
        let input = blob(ciphertext);
        let entropy = blob(ENTROPY);
        let mut output = CRYPT_INTEGER_BLOB {
            cbData: 0,
            pbData: std::ptr::null_mut(),
        };

        let ok = CryptUnprotectData(
            &input,
            std::ptr::null_mut(),
            &entropy,
            std::ptr::null(),
            std::ptr::null(),
            0,
            &mut output,
        );

        if ok == 0 {
            return Err(
                "Could not decrypt the stored credentials. They were saved by a \
                 different Windows user or on a different machine."
                    .into(),
            );
        }

        Ok(take_blob(output))
    }
}

#[cfg(not(target_os = "windows"))]
fn encrypt(_plaintext: &[u8]) -> Result<Vec<u8>, String> {
    Err("Encrypted credential storage is only implemented on Windows".into())
}

#[cfg(not(target_os = "windows"))]
fn decrypt(_ciphertext: &[u8]) -> Result<Vec<u8>, String> {
    Err("Encrypted credential storage is only implemented on Windows".into())
}

/// Reads every stored key. Returns an empty map when nothing is stored yet.
pub fn load_all(app: &AppHandle) -> Result<HashMap<String, String>, String> {
    let path = secrets_path(app)?;

    let ciphertext = match fs::read(&path) {
        Ok(bytes) => bytes,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(HashMap::new()),
        Err(e) => return Err(format!("Could not read the credential store: {e}")),
    };

    if ciphertext.is_empty() {
        return Ok(HashMap::new());
    }

    let plaintext = decrypt(&ciphertext)?;
    serde_json::from_slice(&plaintext)
        .map_err(|_| "The credential store is corrupt and will need to be re-entered".to_string())
}

fn save_all(app: &AppHandle, keys: &HashMap<String, String>) -> Result<(), String> {
    let path = secrets_path(app)?;

    if keys.is_empty() {
        // Nothing left to protect; do not leave an empty blob behind.
        let _ = fs::remove_file(&path);
        return Ok(());
    }

    let plaintext = serde_json::to_vec(keys).map_err(|e| e.to_string())?;
    let ciphertext = encrypt(&plaintext)?;

    fs::write(&path, ciphertext).map_err(|e| format!("Could not write the credential store: {e}"))
}

pub fn get(app: &AppHandle, provider: &str) -> Result<Option<String>, String> {
    Ok(load_all(app)?.get(provider).cloned())
}

pub fn set(app: &AppHandle, provider: &str, key: &str) -> Result<(), String> {
    let key = key.trim();
    if key.is_empty() {
        return Err("The API key is empty".into());
    }

    let mut all = load_all(app)?;
    all.insert(provider.to_string(), key.to_string());
    save_all(app, &all)
}

pub fn clear(app: &AppHandle, provider: &str) -> Result<(), String> {
    let mut all = load_all(app)?;
    all.remove(provider);
    save_all(app, &all)
}

/// A key rendered for display: enough to recognise, not enough to use.
pub fn mask(key: &str) -> String {
    let visible: Vec<char> = key.chars().collect();
    if visible.len() <= 8 {
        return "*".repeat(visible.len().max(4));
    }

    let head: String = visible[..4].iter().collect();
    let tail: String = visible[visible.len() - 4..].iter().collect();
    format!("{head}...{tail}")
}

#[cfg(test)]
mod tests {
    use super::mask;

    #[cfg(target_os = "windows")]
    #[test]
    fn dpapi_round_trips_and_the_blob_hides_the_secret() {
        let secret = b"sk-ant-api03-SUPERSECRETVALUE-9999";

        let blob = super::encrypt(secret).expect("encrypt failed");
        assert_ne!(blob.as_slice(), secret.as_slice(), "stored as plaintext");
        assert!(
            !String::from_utf8_lossy(&blob).contains("SUPERSECRET"),
            "the secret is readable in the ciphertext"
        );
        assert!(blob.len() > secret.len(), "no DPAPI envelope present");

        let recovered = super::decrypt(&blob).expect("decrypt failed");
        assert_eq!(recovered, secret, "round trip lost the value");
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn tampered_ciphertext_is_rejected_rather_than_returning_garbage() {
        let mut blob = super::encrypt(b"sk-ant-original").expect("encrypt failed");

        let last = blob.len() - 1;
        blob[last] ^= 0xFF;

        assert!(
            super::decrypt(&blob).is_err(),
            "a modified blob decrypted anyway"
        );
        assert!(super::decrypt(b"not a dpapi blob at all").is_err());
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn a_json_map_of_keys_survives_the_round_trip() {
        let map = serde_json::json!({
            "anthropic": "sk-ant-aaa",
            "openai": "sk-bbb",
            "gemini": "AIza-ccc"
        });

        let blob = super::encrypt(&serde_json::to_vec(&map).unwrap()).unwrap();
        let back: serde_json::Value =
            serde_json::from_slice(&super::decrypt(&blob).unwrap()).unwrap();

        assert_eq!(back, map);
    }

    #[test]
    fn masking_keeps_only_the_recognisable_ends() {
        assert_eq!(mask("sk-ant-api03-ABCDEFGH1234"), "sk-a...1234");
        assert_eq!(mask("AIzaSyExampleKeyValue99"), "AIza...ue99");
    }

    #[test]
    fn short_keys_reveal_nothing() {
        assert_eq!(mask("abcd1234"), "********");
        assert_eq!(mask("abc"), "****");
        assert_eq!(mask(""), "****");
    }

    #[test]
    fn a_masked_key_never_contains_the_middle() {
        let key = "sk-ant-SECRETMIDDLE-9999";
        let masked = mask(key);
        assert!(!masked.contains("SECRETMIDDLE"));
        assert!(masked.len() < key.len());
    }
}
