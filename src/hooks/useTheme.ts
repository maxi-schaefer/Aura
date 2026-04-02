import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";

const THEMES = ["default", "gruvbox", "catppuccin"];

export function useTheme(config: any, setConfig: (c: any) => void) {
  const theme = config?.theme || "default";

  const applyTheme = useCallback((themeName: string) => {
    const root = document.documentElement;
    root.classList.remove(...THEMES);
    if (themeName !== "default") {
      root.classList.add(themeName);
    }
  }, []);

  const changeTheme = useCallback(
    async (themeName: string, event?: React.MouseEvent) => {
      if (!document.startViewTransition) {
        applyTheme(themeName);
        return;
      }

      const x = event?.clientX ?? window.innerWidth / 2;
      const y = event?.clientY ?? window.innerHeight / 2;

      document.documentElement.style.setProperty("--reveal-x", `${x}px`);
      document.documentElement.style.setProperty("--reveal-y", `${y}px`);

      document.startViewTransition(() => {
        applyTheme(themeName);
      });

      const newConfig = { ...config, theme: themeName };
      setConfig(newConfig);

      try {
        await invoke("save_config", { config: newConfig });
      } catch (e) {
        console.error("Failed to save config:", e);
      }
    },
    [config, setConfig, applyTheme]
  );

  return { theme, applyTheme, changeTheme };
}