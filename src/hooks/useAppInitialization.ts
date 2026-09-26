import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Config } from "../types/config";
import { AppItem } from "../types/system";

export function useAppInitialization(applyTheme: (theme: string) => void) {
    const [allApps, setAllApps] = useState<AppItem[]>([]);
    const [aliases, setAliases] = useState<Record<string, string>>({});
    const [config, setConfig] = useState<Config | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [firstRun, setFirstRun] = useState<boolean | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const [apps, aliasMap, cfg] = await Promise.all([
                    invoke<AppItem[]>("get_installed_apps"),
                    invoke<Record<string, string>>("get_aliases"),
                    invoke<Config>("get_config"),
                ]);

                setAllApps(apps);
                setAliases(aliasMap);
                setConfig(cfg);

                setFirstRun(cfg.first_run_complete === false);

                applyTheme(cfg.theme || "default");

                setTimeout(() => setIsLoading(false), 300);
            } catch (e) {
                console.error("Initialization failed", e);
                setIsLoading(false);
            }
        };

        init();
    }, []);

    return { allApps, aliases, config, setConfig, isLoading, firstRun, setFirstRun };
}
