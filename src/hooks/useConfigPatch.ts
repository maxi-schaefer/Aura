import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import { Config, SetConfig } from "../types/config";

/**
 * Returns a function that merges a partial update into the current config,
 * applies it optimistically and persists the result.
 *
 * No-ops while the config is still loading.
 */
export function useConfigPatch(config: Config | null, setConfig: SetConfig) {
    return useCallback(
        async (patch: Partial<Config>) => {
            if (!config) return;

            const next = { ...config, ...patch };
            setConfig(next);

            try {
                await invoke("save_config", { config: next });
            } catch (e) {
                console.error("Failed to save config:", e);
            }
        },
        [config, setConfig]
    );
}
