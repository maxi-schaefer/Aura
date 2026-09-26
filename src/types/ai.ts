/** A model a connector can talk to. */
export interface ModelOption {
    id: string;
    label: string;
}

/**
 * A connector as the UI sees it.
 *
 * Deliberately never carries the API key: the backend reads it only inside
 * the command that calls the provider, and sends back a masked hint.
 */
export interface ProviderStatus {
    id: string;
    label: string;
    /** Where the user gets an API key. */
    keys_url: string;
    /** What a key from this provider tends to look like. */
    key_hint: string;
    models: ModelOption[];
    default_model: string;
    connected: boolean;
    masked_key?: string | null;
}

export interface AiReply {
    provider: string;
    model: string;
    text: string;
}
