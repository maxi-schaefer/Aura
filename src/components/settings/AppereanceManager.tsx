import { Check } from "lucide-react";
import { Section } from "../commands/SettingsView";
import { useTheme } from "../../hooks/useTheme";

const THEMES = [
  { id: "default", label: "Aura Dark" },
  { id: "gruvbox", label: "Gruvbox Retro" },
  { id: "catppuccin", label: "Catppuccin Mocha" },
];

interface AppearanceManagerProps {
  config: any;
  setConfig: (config: any) => void;
}

export const AppearanceManager = ({ config, setConfig }: AppearanceManagerProps) => {
  const { theme, changeTheme } = useTheme(config, setConfig);

  return (
    <div className="space-y-6">
      <Section label="Theme">
        <div className="p-4 grid grid-cols-1 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => changeTheme(t.id)}
              className="flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full ${
                    t.id === "gruvbox"
                      ? "bg-[#458588]"
                      : t.id === "catppuccin"
                      ? "bg-[#ca9ee6]"
                      : "bg-white"
                  }`}
                />

                <span className="text-[13px] text-fg">{t.label}</span>
              </div>

              {theme === t.id && (
                <Check size={16} className="text-fg/60" />
              )}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
};