import { invoke } from "@tauri-apps/api/core";
import { Section, ToggleItem } from "../commands/SettingsView"; // Adjust paths as needed
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { motion } from "framer-motion";

// Engine Assets
import googleIcon from "../../assets/engines/google.png";
import ddgIcon from "../../assets/engines/duckduckgo.png";
import bingIcon from "../../assets/engines/bing.png";
import yahooIcon from "../../assets/engines/yahoo.png";
import braveIcon from "../../assets/engines/brave.png";
import ecosiaIcon from "../../assets/engines/ecosia.png";
import { useEffect, useState } from "react";

const ENGINES = [
    { id: "bing", name: "Bing", url: "https://www.bing.com/search?q=", icon: bingIcon },
    { id: "brave", name: "Brave", url: "https://search.brave.com/search?q=", icon: braveIcon },
    { id: "duckduckgo", name: "DuckDuckGo", url: "https://duckduckgo.com/?q=", icon: ddgIcon },
    { id: "ecosia", name: "Ecosia", url: "https://www.ecosia.org/search?q=", icon: ecosiaIcon },
    { id: "google", name: "Google", url: "https://google.com/search?q=", icon: googleIcon },
    { id: "yahoo", name: "Yahoo", url: "https://search.yahoo.com/search?p=", icon: yahooIcon },
];

interface GeneralManagerProps {
  config: any;
  setConfig: (config: any) => void;
}

export const GeneralManager = ({ config, setConfig }: GeneralManagerProps) => {
  const [autoStart, setAutoStart] = useState(false);

  useEffect(() => {
      isEnabled().then(setAutoStart);
  }, [])

   const toggleAutostart = async () => {
      if (autoStart) await disable();
      else await enable();
      setAutoStart(await isEnabled());
    };
  
  const updateEngine = async (engineUrl: string) => {
    const newConfig = { ...config, search_engine: engineUrl };
    setConfig(newConfig);
    await invoke("save_config", { config: newConfig });
  };

  return (
    <div className="space-y-8">
      <Section label="Search Engine">
        <div className="p-1 grid grid-cols-1 gap-1">
          {ENGINES.map((eng) => (
            <motion.button
              key={eng.id}
              onClick={() => updateEngine(eng.url)}
              className={`flex items-center cursor-pointer justify-between px-3 py-2 rounded-lg transition-colors group ${
                config.search_engine === eng.url ? "bg-white/10" : "hover:bg-white/5"
              }`}
            > 

              <div className="flex items-center gap-3">
                <img 
                  src={eng.icon} 
                  className={`size-4 ${config.search_engine === eng.url ? 'opacity-100' : 'opacity-40 grayscale group-hover:grayscale-0'}`} 
                  alt={eng.name} 
                />
                <span className={`text-[13px] ${config.search_engine === eng.url ? 'text-fg' : 'text-fg/40'}`}>
                  {eng.name}
                </span>
              </div>
              {config.search_engine === eng.url && (
                <div className="size-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
              )}
            </motion.button>
          ))}
        </div>
      </Section>

      <Section label="Application">
        <ToggleItem 
          label="Launch at login" 
          description="Start Aura when you log in." 
          checked={autoStart}
          onChange={toggleAutostart}
        />
        <ToggleItem 
          label="Check for Updates" 
          description="Keep the app updated." 
          defaultChecked 
        />
      </Section>
    </div>
  );
};