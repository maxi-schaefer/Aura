import { useState, useEffect } from "react";
import { Section } from "../commands/SettingsView"; // Adjust path as needed
import { invoke } from "@tauri-apps/api/core";
import { RotateCcw } from "lucide-react";

export const ShortcutsManager = ({ config, setConfig, isSetup = false }: any) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState(config.main_shortcut || "Alt+Space");
  const [heldModifiers, setHeldModifiers] = useState<string[]>([]);

  const saveShortcut = (shortcutString: string) => {
    const newConfig = { ...config, main_shortcut: shortcutString };
    setRecordedKeys(shortcutString);
    setConfig(newConfig);
    invoke("save_config", { config: newConfig });
  };

  const handleReset = () => {
    saveShortcut("Alt+Space");
    setIsRecording(false);
  };

  useEffect(() => {
    if (!isRecording) {
      setHeldModifiers([]);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      
      const mods = [];
      if (e.ctrlKey) mods.push("Ctrl");
      if (e.altKey) mods.push("Alt");
      if (e.shiftKey) mods.push("Shift");
      if (e.metaKey) mods.push("Command");

      // If it's just a modifier, update the live view
      if (["Control", "Shift", "Alt", "Meta", "AltGraph"].includes(e.key)) {
        setHeldModifiers(mods);
        return;
      }

      if(e.key === "Escape") {
        e.preventDefault();
        setIsRecording(false);
        return;
      }

      // Final key pressed
      const keyName = e.key === " " ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key;
      const finalKeys = [...mods, keyName];
      
      saveShortcut(finalKeys.join("+"));
      setIsRecording(false);
      setHeldModifiers([]);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isRecording) return;
      // Update held modifiers when user lets go of a key
      const mods = [];
      if (e.ctrlKey) mods.push("Ctrl");
      if (e.altKey) mods.push("Alt");
      if (e.shiftKey) mods.push("Shift");
      if (e.metaKey) mods.push("Command");
      setHeldModifiers(mods);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isRecording, config]);

  const displayKeys = isRecording && heldModifiers.length > 0 
    ? heldModifiers 
    : recordedKeys.split("+");

  return (
    <Section label={isSetup ? "" : "Global Shortcuts"}>
      <div className={`flex items-center justify-between transition-colors group rounded-lg ${isSetup ? 'p-0' : 'p-4 bg-transparent hover:bg-white/2'}`}>
        {!isSetup && (
          <div>
            <div className="text-[13.5px] text-white/90 font-medium">Toggle Aura</div>
            <div className="text-[12px] text-white/30">Global shortcut to show/hide the window</div>
          </div>
        )}
        
        <div className={`flex items-center gap-3 ${isSetup ? 'w-full' : ''}`}>
          {!isSetup && config.main_shortcut !== "Alt+Space" && (
            <button onClick={handleReset} className="cursor-pointer p-1.5 rounded-md hover:bg-white/10 text-white/20 hover:text-white/60 transition-all opacity-0 group-hover:opacity-100">
              <RotateCcw size={14} />
            </button>
          )}

          <button 
            onClick={() => setIsRecording(true)}
            className={`flex items-center gap-1.5 p-1 rounded-lg border transition-all cursor-pointer ${isSetup ? 'w-full justify-center py-4' : ''}
              ${isRecording 
                ? 'bg-primary/10 border-primary/50 ring-2 ring-primary/20' 
                : 'bg-white/3 border-white/10 hover:border-white/20 hover:bg-white/5'}`}
          >
            <div className="flex items-center gap-1">
              {displayKeys.map((key: string, i: number) => (
                <div key={i} className="flex items-center gap-1">
                  <kbd className="min-w-6 h-6 px-2 flex items-center justify-center bg-white/10 border-b-2 border-white/5 rounded text-[10px] font-bold text-white/70 shadow-sm uppercase">
                    {key}
                  </kbd>
                  {i < displayKeys.length - 1 && <span className="text-[10px] text-white/20 font-bold">+</span>}
                </div>
              ))}
              {isRecording && heldModifiers.length === 0 && (
                <span className="text-[10px] text-primary/60 font-medium px-2 animate-pulse uppercase">Press keys...</span>
              )}
            </div>
          </button>
        </div>
      </div>
    </Section>
  );
};