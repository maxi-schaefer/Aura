import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Palette, Cpu, Keyboard, Info, Command as CmdIcon } from "lucide-react";

// Engine Assets (Assuming paths from previous context)
import googleIcon from "../../assets/engines/google.png";
import ddgIcon from "../../assets/engines/duckduckgo.png";
import braveIcon from "../../assets/engines/brave.png";
import bingIcon from "../../assets/engines/bing.png";

const ENGINES = [
  { id: "google", name: "Google", icon: googleIcon },
  { id: "duckduckgo", name: "DuckDuckGo", icon: ddgIcon },
  { id: "brave", name: "Brave", icon: braveIcon },
  { id: "bing", name: "Bing", icon: bingIcon },
];

const CATEGORIES = [
  { id: "general", label: "General", icon: <Settings size={14} /> },
  { id: "appearance", label: "Appearance", icon: <Palette size={14} /> },
  { id: "shortcuts", label: "Shortcuts", icon: <Keyboard size={14} /> },
  { id: "extensions", label: "Extensions", icon: <Cpu size={14} /> },
  { id: "about", label: "About", icon: <Info size={14} /> },
];

export const SettingsView = ({ query = "" }: { query?: string }) => {
  const [activeTab, setActiveTab] = useState("general");
  const [currentEngine, setCurrentEngine] = useState("google");

  // Filter logic for settings search
  const filteredCategories = useMemo(() => {
    if (!query) return CATEGORIES;
    return CATEGORIES.filter(cat => 
        cat.label.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  return (
    <div className="flex h-122 w-full gap-0 antialiased">
      {/* Sidebar */}
      <div className="w-56 flex flex-col gap-0.5 border-r border-white/5 p-2">
        {filteredCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`cursor-pointer flex items-center justify-between px-3 py-2 rounded-md transition-all group ${
              activeTab === cat.id 
                ? "bg-white/10 text-white shadow-sm" 
                : "text-white/40 hover:bg-white/3 hover:text-white/60"
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

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="p-6 space-y-8"
          >
            {activeTab === "general" && (
              <>
                <Section label="Search Engine">
                  <div className="p-1 grid grid-cols-1 gap-1">
                    {ENGINES.map((eng) => (
                      <button
                        key={eng.id}
                        onClick={() => setCurrentEngine(eng.id)}
                        className={`flex items-center cursor-pointer justify-between px-3 py-2 rounded-lg transition-colors group ${
                          currentEngine === eng.id ? "bg-white/10" : "hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img src={eng.icon} className={`size-4 ${currentEngine === eng.id ? 'opacity-100' : 'opacity-40 grayscale group-hover:grayscale-0'}`} alt="" />
                          <span className={`text-[13px] ${currentEngine === eng.id ? 'text-white' : 'text-white/40'}`}>{eng.name}</span>
                        </div>
                        {currentEngine === eng.id && (
                            <div className="size-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                        )}
                      </button>
                    ))}
                  </div>
                </Section>

                <Section label="Application">
                  <ToggleItem label="Launch at login" description="Start Aura when you log in." defaultChecked />
                  <ToggleItem label="Check for Updates" description="Keep the app updated." defaultChecked />
                </Section>
              </>
            )}

            {activeTab === "appearance" && (
              <Section label="Visual Preferences">
                <SelectItem label="Theme" description="Choose your preferred color scheme." options={["Glass Morphic", "Midnight", "Light Bloom"]} />
                <RangeItem label="Window Radius" description="Adjust corner roundness." />
                <ToggleItem label="Vibrant Colors" description="Allow accent colors to bleed through." defaultChecked />
              </Section>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- Refined Sub-components ---

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h3 className="text-[11px] font-semibold text-white/20 uppercase tracking-widest ml-1">{label}</h3>
    <div className="space-y-px rounded-xl overflow-hidden border border-white/5 bg-white/1">
        {children}
    </div>
  </div>
);

const ToggleItem = ({ label, description, defaultChecked = false }: any) => {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div 
        onClick={() => setChecked(!checked)}
        className="flex items-center justify-between p-4 bg-transparent hover:bg-white/3 transition-colors cursor-pointer group border-b border-white/5 last:border-0"
    >
      <div className="max-w-[70%]">
        <div className="text-[13.5px] text-white/90 font-medium group-hover:text-white">{label}</div>
        <div className="text-[12px] text-white/30 leading-snug mt-0.5">{description}</div>
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

const SelectItem = ({ label, description, options }: any) => (
    <div className="flex items-center justify-between p-4 bg-transparent hover:bg-white/3 transition-colors border-b border-white/5 last:border-0">
      <div>
        <div className="text-[13.5px] text-white/90 font-medium">{label}</div>
        <div className="text-[12px] text-white/30">{description}</div>
      </div>
      <select className="bg-white/5 border border-white/10 text-[12px] text-white/70 rounded-md px-3 py-1.5 outline-none hover:bg-white/10 transition-colors cursor-pointer appearance-none">
        {options.map((o: string) => <option className="bg-white/10 cursor-pointer" key={o} value={o}>{o}</option>)}
      </select>
    </div>
);

const ShortcutItem = ({ label, keys }: { label: string; keys: string[] }) => (
    <div className="flex items-center justify-between p-4 bg-transparent hover:bg-white/3 transition-colors border-b border-white/5 last:border-0">
      <span className="text-[13.5px] text-white/90 font-medium">{label}</span>
      <div className="flex gap-1.5">
        {keys.map(key => (
            <kbd key={key} className="min-w-6 h-6 flex items-center justify-center px-1.5 rounded bg-white/10 border-b-2 border-white/10 text-[10px] text-white/60 font-sans font-bold">
                {key === "Cmd" ? <CmdIcon size={10} /> : key}
            </kbd>
        ))}
      </div>
    </div>
);

const RangeItem = ({ label, description }: any) => (
    <div className="flex items-center justify-between p-4 bg-transparent hover:bg-white/3 transition-colors border-b border-white/5 last:border-0">
      <div>
        <div className="text-[13.5px] text-white/90 font-medium">{label}</div>
        <div className="text-[12px] text-white/30">{description}</div>
      </div>
      <input type="range" className="accent-white/40 w-32 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" />
    </div>
);