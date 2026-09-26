/** How much of the window is shown when Aura opens. */
export type WindowMode = "compact" | "expanded";

/**
 * User configuration as persisted by the backend.
 *
 * Mirrors the `Config` struct in src-tauri/src/commands/system.rs — the
 * nullable fields are its `Option<T>` members, which serde emits as null.
 */
export interface Config {
    search_engine: string;
    first_run_complete: boolean;
    username?: string | null;
    theme?: string | null;
    window_mode?: WindowMode | null;
    main_shortcut?: string | null;
}

export type SetConfig = (config: Config) => void;
