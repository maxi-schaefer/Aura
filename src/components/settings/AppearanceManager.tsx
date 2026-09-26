import { Check } from "lucide-react";
import { Section, WindowModeSelector } from "../commands/SettingsView";
import { THEMES, useTheme } from "../../hooks/useTheme";
import { invoke } from "@tauri-apps/api/core";

interface AppearanceManagerProps {
  config: any;
  setConfig: (config: any) => void;
}

export const AppearanceManager = ({ config, setConfig }: AppearanceManagerProps) => {
  const { theme, changeTheme } = useTheme(config, setConfig);

  const handleWindowModeChange = async (mode: 'compact' | 'expanded') => {
    const newConfig = { ...config, window_mode: mode };
    setConfig(newConfig);
    await invoke("save_config", { config: newConfig });
  };

  return (
    <div className="space-y-8">
      {/* 1. Window Mode Section */}
      <Section label="Layout">
        <WindowModeSelector 
          value={config.window_mode || 'expanded'} 
          onChange={handleWindowModeChange} 
        />
      </Section>

      {/* 2. Enhanced Theme Section */}
      <Section label="Theme">
        <div className="p-4 grid grid-cols-2 gap-3">
          {THEMES.map((t) => {
            const isActive = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={(e) => changeTheme(t.id, e)}
                className={`relative flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer group overflow-hidden
                  ${isActive 
                    ? "bg-primary/8 border-primary/20 shadow-lg" 
                    : "bg-white/2 border-white/5 hover:bg-white/5 hover:border-white/10"
                  }`}
              >
                {/* Visual Swatch */}
                <div 
                  className="relative z-10 size-8 rounded-full border-2 border-white/10 flex items-center justify-center shrink-0"
                  style={{ backgroundColor: t.primary }}
                >
                  {isActive && <Check size={14} className="text-black" />}
                </div>

                <div className="relative z-10 flex flex-col items-start text-left">
                  <span className={`text-[13px] font-medium transition-colors ${isActive ? 'text-fg' : 'text-fg/50 group-hover:text-fg/80'}`}>
                    {t.label}
                  </span>
                  <span className="text-[10px] text-fg/20 font-mono tracking-tighter uppercase">
                    {t.primary}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
};