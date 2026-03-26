import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Search, Globe, ShieldQuestion, Zap } from "lucide-react";

const ENGINES = [
    { id: "google", name: "Google", url: "https://google.com/search?q=", icon: <Search size={14} /> },
    { id: "duckduckgo", name: "DuckDuckGo", url: "https://duckduckgo.com/?q=", icon: <ShieldQuestion size={14} /> },
    { id: "bing", name: "Bing", url: "https://www.bing.com/search?q=", icon: <Globe size={14} /> },
    { id: "yahoo", name: "Yahoo", url: "https://search.yahoo.com/search?p=", icon: <Zap size={14} /> },
    { id: "brave", name: "Brave", url: "https://search.brave.com/search?q=", icon: <ShieldQuestion size={14} /> },
    { id: "ecosia", name: "Ecosia", url: "https://www.ecosia.org/search?q=", icon: <Globe size={14} /> },
];

export default function SearchSettings() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedUrl, setSelectedUrl] = useState("");

    useEffect(() => {
        invoke("get_config").then((res: any) => setSelectedUrl(res.search_engine));
    }, []);

    const currentEngine = ENGINES.find(e => e.url === selectedUrl) || ENGINES[0];

    const handleSelect = async (url: string) => {
        setSelectedUrl(url);
        setIsOpen(false);
        await invoke("save_config", { config: { search_engine: url } });
    };

    return (
        <section className="space-y-3">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold ml-1">Search Engine</h2>
            
            <div className="relative">
                {/* --- Trigger: Minimalistic Field --- */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.06] hover:border-white/20 transition-all duration-200 group"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-blue-400 opacity-80 group-hover:opacity-100 transition-opacity">
                            {currentEngine.icon}
                        </span>
                        <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                            {currentEngine.name}
                        </span>
                    </div>
                    <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        className="text-white/20 group-hover:text-white/50"
                    >
                        <ChevronDown size={16} />
                    </motion.div>
                </button>

                {/* --- Dropdown Menu --- */}
                <AnimatePresence>
                    {isOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                            
                            <motion.div
                                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                                animate={{ opacity: 1, y: 8, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                                transition={{ duration: 0.15 }}
                                className="absolute left-0 right-0 z-20 max-h-48 overflow-y-auto bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl p-1.5 custom-scrollbar"
                            >
                                {ENGINES.map((engine) => (
                                    <button
                                        key={engine.id}
                                        onClick={() => handleSelect(engine.url)}
                                        className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 transition-all group"
                                    >
                                        <div className="flex items-center gap-3 px-1">
                                            <span className={`${selectedUrl === engine.url ? 'text-blue-400' : 'text-white/20 group-hover:text-white/60'}`}>
                                                {engine.icon}
                                            </span>
                                            <span className={`text-sm ${selectedUrl === engine.url ? 'text-white font-semibold' : 'text-white/40 group-hover:text-white/80'}`}>
                                                {engine.name}
                                            </span>
                                        </div>
                                        {selectedUrl === engine.url && (
                                            <motion.div layoutId="active-check" className="mr-2">
                                                <Check size={14} className="text-blue-500" />
                                            </motion.div>
                                        )}
                                    </button>
                                ))}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}