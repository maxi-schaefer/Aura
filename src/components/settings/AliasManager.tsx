import { invoke } from "@tauri-apps/api/core";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Section } from "../commands/SettingsView";

export const AliasManager = () => {
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  useEffect(() => {
    invoke("get_aliases").then((res: any) => setAliases(res));
  }, []);

  // --- KEY CHANGE: Added the event parameter and preventDefault ---
  const addAlias = async (e: React.FormEvent) => {
    if (e) e.preventDefault(); // Prevent page reload!

    if (!newKey || !newVal) return;
    
    // Normalize key to lowercase
    const normalizedKey = newKey.toLowerCase().replace('@', ''); // Also strip @ if they typed it
    const updated = { ...aliases, [normalizedKey]: newVal };
    
    setAliases(updated);
    await invoke("save_aliases", { aliases: updated });
    
    // Reset inputs
    setNewKey(""); setNewVal("");
  };

  const removeAlias = async (key: string) => {
    const updated = { ...aliases };
    delete updated[key];
    setAliases(updated);
    await invoke("save_aliases", { aliases: updated });
  };

  return (
    <div className="space-y-6">
      <Section label="Add New Alias">
        {/* onSubmit is handled here */}
        <form onSubmit={addAlias} className="p-4 flex gap-2">
          <input 
            value={newKey} 
            onChange={e => setNewKey(e.target.value)}
            placeholder="Shortcut (e.g. gh)" 
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-white/20"
          />
          <input 
            value={newVal} 
            onChange={e => setNewVal(e.target.value)}
            placeholder="URL (e.g. github.com)" 
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-white/20"
          />

          <button type="submit" className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer">
            <Plus size={18} />
          </button>
        </form>
      </Section>

      <Section label="Active Aliases">
        <div className="divide-y divide-white/5">
          {Object.entries(aliases).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between p-4 bg-transparent hover:bg-white/2 group transition-colors">
              <div className="flex items-center gap-4">
                <div className="px-2 py-1 rounded bg-white/10 text-[11px] font-bold text-white/70">@{key}</div>
                <div className="text-[13px] text-white/40 truncate max-w-[200px]">{val}</div>
              </div>
              <button onClick={() => removeAlias(key)} className="opacity-0 group-hover:opacity-100 p-2 text-white/20 hover:text-red-400 transition-all cursor-pointer">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {Object.keys(aliases).length === 0 && (
            <div className="p-8 text-center text-[12px] text-white/20">No aliases configured yet.</div>
          )}
        </div>
      </Section>
    </div>
  );
};