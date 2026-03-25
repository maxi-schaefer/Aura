import { invoke } from "@tauri-apps/api/core";
import { Plus, Trash2, Globe } from "lucide-react";
import { useEffect, useState } from "react";

type AliasMap = { [key: string]: string };

export default function AliasSettings() {
    const [aliases, setAliases] = useState<AliasMap>({});
    const [newKey, setNewKey] = useState("");
    const [newValue, setNewValue] = useState("");

    useEffect(() => {
        invoke<AliasMap>("get_aliases").then(setAliases);
    }, []);

    const addAlias = () => {
        if (!newKey || !newValue) return;
        const updated = { ...aliases, [newKey.toLowerCase()]: newValue };
        setAliases(updated);
        invoke("save_aliases", { aliases: updated });
        setNewKey(""); setNewValue("");
    };

    const deleteAlias = (key: string) => {
        const updated = { ...aliases };
        delete updated[key];
        setAliases(updated);
        invoke("save_aliases", { aliases: updated });
    };

    return (
        <div className="flex flex-col h-full">
            <header className="mb-6">
                <p className="text-xs text-gray-500 mb-4">
                    Create shortcuts for your favorite sites. Type <span className="text-blue-400 font-mono">@alias</span> in the search bar to trigger.
                </p>
                
                {/* Input Group */}
                <div className="flex items-center gap-2 p-2 bg-white/5 rounded-2xl border border-white/10 focus-within:border-blue-500/50 transition-all">
                    <div className="flex items-center gap-1 pl-3 text-blue-400 font-mono font-bold">
                        <span>@</span>
                        <input 
                            value={newKey} 
                            onChange={e => setNewKey(e.target.value.replace('@', ''))}
                            placeholder="gh" 
                            className="bg-transparent w-16 outline-none text-white placeholder:text-gray-600"
                        />
                    </div>
                    <div className="h-4 w-[1px] bg-white/10 mx-2" />
                    <input 
                        value={newValue} 
                        onChange={e => setNewValue(e.target.value)}
                        placeholder="https://github.com" 
                        className="bg-transparent flex-1 outline-none text-sm text-white placeholder:text-gray-600"
                    />
                    <button 
                        onClick={addAlias}
                        className="cursor-pointer bg-blue-600 hover:bg-blue-500 p-2 rounded-xl transition-colors"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </header>

            {/* List Area */}
            <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar max-h-55">
                {Object.entries(aliases).length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-3xl">
                        <Globe className="mx-auto mb-2 text-gray-700" size={32} />
                        <p className="text-gray-600 text-sm">No aliases created yet</p>
                    </div>
                ) : (
                    Object.entries(aliases).map(([key, val]) => (
                        <div key={key} className="group flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl transition-all">
                            <div className="flex items-center gap-4">
                                <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 font-mono text-xs font-bold">
                                    @{key}
                                </div>
                                <span className="text-gray-400 text-xs truncate max-w-[250px] font-medium">
                                    {val}
                                </span>
                            </div>
                            <button 
                                onClick={() => deleteAlias(key)}
                                className="cursor-pointer p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}