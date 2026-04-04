import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useAppInitialization(applyTheme: any) {
    const [allApps, setAllApps] = useState<any[]>([]);
    const [aliases, setAliases] = useState<Record<string, string>>({});
    const [config, setConfig] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [firstRun, setFirstRun] = useState<boolean | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const [apps, aliasMap, cfg] = await Promise.all([
                    invoke("get_installed_apps"),
                    invoke("get_aliases"),
                    invoke("get_config") as Promise<any>,
                ]);

                setAllApps(apps as any[]);
                setAliases(aliasMap as Record<string, string>);
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