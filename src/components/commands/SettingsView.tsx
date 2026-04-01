import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Bell, Palette, Cpu, Shield, Globe, Keyboard, Info, Command as CmdIcon, ChevronDown } from "lucide-react";

const CATEGORIES = [
  { id: "general", label: "General", icon: <Settings size={14} /> },
  { id: "appearance", label: "Appearance", icon: <Palette size={14} /> },
  { id: "shortcuts", label: "Shortcuts", icon: <Keyboard size={14} /> },
  { id: "extensions", label: "Extensions", icon: <Cpu size={14} /> },
  { id: "about", label: "About", icon: <Info size={14} /> },
];

export const SettingsView = () => {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="flex h-[450px] w-full gap-0 antialiased">
      {/* Sidebar - Raycast uses a subtle side border */}
      <div className="w-56 flex flex-col gap-0.5 border-r border-white/5 p-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`cursor-pointer flex items-center justify-between px-3 py-2 rounded-md transition-all group ${
              activeTab === cat.id 
                ? "bg-white/10 text-white shadow-sm" 
                : "text-white/40 hover:bg-white/[0.03] hover:text-white/60"
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
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="p-6 space-y-8"
          >
            {activeTab === "general" && (
              <>
                <Section label="Application">
                  <ToggleItem label="Launch at login" description="Automatically start when you log in to your computer." defaultChecked />
                  <ToggleItem label="Check for Updates" description="Keep the app updated with the latest features." defaultChecked />
                </Section>
                <Section label="Window Behavior">
                  <ToggleItem label="On Top" description="Always keep the search window above other apps." />
                  <SelectItem label="Close Window" description="When to hide the window." options={["After Action", "Manual Only"]} />
                </Section>
              </>
            )}

            {activeTab === "appearance" && (
              <Section label="Visual Preferences">
                <SelectItem label="Theme" description="Choose your preferred color scheme." options={["Glass Morphic", "Midnight", "Light Bloom"]} />
                <RangeItem label="Window Radius" description="Adjust corner roundness." value={16} />
                <ToggleItem label="Vibrant Colors" description="Allow accent colors to bleed through background." defaultChecked />
              </Section>
            )}

            {activeTab === "shortcuts" && (
               <Section label="Global Hotkeys">
                  <ShortcutItem label="Toggle Search" keys={["Alt", "Space"]} />
                  <ShortcutItem label="Clipboard History" keys={["Cmd", "Shift", "V"]} />
                  <ShortcutItem label="System Settings" keys={["Cmd", ","]} />
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

const RangeItem = ({ label, description, value }: any) => (
    <div className="flex items-center justify-between p-4 bg-transparent hover:bg-white/3 transition-colors border-b border-white/5 last:border-0">
      <div>
        <div className="text-[13.5px] text-white/90 font-medium">{label}</div>
        <div className="text-[12px] text-white/30">{description}</div>
      </div>
      <input type="range" className="accent-white/40 w-32 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" />
    </div>
);