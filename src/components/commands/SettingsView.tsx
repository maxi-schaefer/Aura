import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, Palette, Keyboard, Info, 
  Command as CmdIcon 
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { AliasManager } from "../settings/AliasManager";
import { GeneralManager } from "../settings/GeneralManager";
import About from "../settings/About";
import { AppearanceManager } from "../settings/AppereanceManager";

const CATEGORIES = [
  { id: "general", label: "General", icon: <Settings size={14} /> },
  { id: "appearance", label: "Appearance", icon: <Palette size={14} /> },
  { id: "alias", label: "Alias", icon: <CmdIcon size={14} /> },
  { id: "shortcuts", label: "Shortcuts", icon: <Keyboard size={14} /> },
  { id: "about", label: "About", icon: <Info size={14} /> },
];

export const SettingsView = ({ query = "" }: { query?: string }) => {
  const [activeTab, setActiveTab] = useState("general");
  const [config, setConfig] = useState<any>(null);

  // Load config on mount
  useEffect(() => {
    invoke("get_config").then((res) => setConfig(res));
  }, []);

  const filteredCategories = useMemo(() => {
    if (!query) return CATEGORIES;
    return CATEGORIES.filter(cat => cat.label.toLowerCase().includes(query.toLowerCase()));
  }, [query]);

  if (!config) return null;

  return (
    <div className="flex h-122 w-full gap-0 antialiased">
      {/* Sidebar */}
      <div className="w-56 flex flex-col gap-0.5 border-r border-white/5 p-2">
        {filteredCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`cursor-pointer flex items-center justify-between px-3 py-2 rounded-md transition-all group ${
              activeTab === cat.id ? "bg-white/10 text-fg" : "text-fg/40 hover:text-fg/60"
            }`}
          >
            <div className="flex items-center gap-3">
              {cat.icon}
              <span className="text-[13px] font-medium">{cat.label}</span>
            </div>
            {activeTab === cat.id && (
              <motion.div layoutId="active-pill" className="w-1 h-4 bg-white/40 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Body Component */}
      <SettingsBody 
        activeTab={activeTab} 
        config={config} 
        setConfig={setConfig} 
      />
    </div>
  );
};

// --- New Body Component ---
const SettingsBody = ({ activeTab, config, setConfig }: any) => {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className="p-6"
        >
          {activeTab === "general" && (
            <GeneralManager config={config} setConfig={setConfig} />
          )}
          
          {activeTab === "appearance" && (
            <AppearanceManager config={config} setConfig={setConfig} />
          )}

          {activeTab === "alias" && (
            <AliasManager />
          )}
          
          {activeTab === "about" && (
            <About />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// --- Refined Sub-components ---
export const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h3 className="text-[11px] font-semibold text-fg/20 uppercase tracking-widest ml-1">{label}</h3>
    <div className="space-y-px rounded-xl overflow-hidden border border-white/5 bg-white/1">
        {children}
    </div>
  </div>
);

export const ToggleItem = ({ label, description, defaultChecked = false, checked, onChange }: any) => {
  const [isChecked, setIsChecked] = useState(defaultChecked);
  return (
    <div 
        onClick={() => {
          setIsChecked(!isChecked);
          if (onChange) onChange(!isChecked);
        }}
        className="flex items-center justify-between p-4 bg-transparent hover:bg-white/3 transition-colors cursor-pointer group border-b border-white/5 last:border-0"
    >
      <div className="max-w-[70%]">
        <div className="text-[13.5px] text-fg/90 font-medium group-hover:text-fg">{label}</div>
        <div className="text-[12px] text-fg/30 leading-snug mt-0.5">{description}</div>
      </div>
      <div className={`w-9 h-5 rounded-full relative transition-all duration-200 ${checked ? 'bg-linear-to-r from-green-500 to-green-400' : 'bg-white/5'}`}>
          <motion.div 
            animate={{ x: checked ? 18 : 3 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-lg" 
          />
      </div>
    </div>
  );
};

export const SelectItem = ({ label, description, options }: any) => (
    <div className="flex items-center justify-between p-4 bg-transparent hover:bg-white/3 transition-colors border-b border-white/5 last:border-0">
      <div>
        <div className="text-[13.5px] text-fg/90 font-medium">{label}</div>
        <div className="text-[12px] text-fg/30">{description}</div>
      </div>
      <select className="bg-white/5 border border-white/10 text-[12px] text-fg/70 rounded-md px-3 py-1.5 outline-none hover:bg-white/10 transition-colors cursor-pointer appearance-none">
        {options.map((o: string) => <option className="bg-white/10 cursor-pointer" key={o} value={o}>{o}</option>)}
      </select>
    </div>
);

export const ShortcutItem = ({ label, keys }: { label: string; keys: string[] }) => (
    <div className="flex items-center justify-between p-4 bg-transparent hover:bg-white/3 transition-colors border-b border-white/5 last:border-0">
      <span className="text-[13.5px] text-fg/90 font-medium">{label}</span>
      <div className="flex gap-1.5">
        {keys.map(key => (
            <kbd key={key} className="min-w-6 h-6 flex items-center justify-center px-1.5 rounded bg-white/10 border-b-2 border-white/10 text-[10px] text-fg/60 font-sans font-bold">
                {key === "Cmd" ? <CmdIcon size={10} /> : key}
            </kbd>
        ))}
      </div>
    </div>
);

export const RangeItem = ({ label, description }: any) => (
    <div className="flex items-center justify-between p-4 bg-transparent hover:bg-white/3 transition-colors border-b border-white/5 last:border-0">
      <div>
        <div className="text-[13.5px] text-fg/90 font-medium">{label}</div>
        <div className="text-[12px] text-fg/30">{description}</div>
      </div>
      <input type="range" className="accent-white/40 w-32 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" />
    </div>
);