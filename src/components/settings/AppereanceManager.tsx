import { Check } from "lucide-react";
import { Section } from "../commands/SettingsView";
import { THEMES, useTheme } from "../../hooks/useTheme";

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
                <div className={`rounded-full size-3 border-2 border-white/30`} style={{ backgroundColor: t.primary }}/>
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