import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

// Icon Imports
import googleIcon from "../../assets/engines/google.png";
import ddgIcon from "../../assets/engines/duckduckgo.png";
import bingIcon from "../../assets/engines/bing.png";
import yahooIcon from "../../assets/engines/yahoo.png";
import braveIcon from "../../assets/engines/brave.png";
import ecosiaIcon from "../../assets/engines/ecosia.png";

const ENGINES = [
    { id: "google", name: "Google", url: "https://google.com/search?q=", icon: googleIcon },
    { id: "duckduckgo", name: "DuckDuckGo", url: "https://duckduckgo.com/?q=", icon: ddgIcon },
    { id: "bing", name: "Bing", url: "https://www.bing.com/search?q=", icon: bingIcon },
    { id: "yahoo", name: "Yahoo", url: "https://search.yahoo.com/search?p=", icon: yahooIcon },
    { id: "brave", name: "Brave", url: "https://search.brave.com/search?q=", icon: braveIcon },
    { id: "ecosia", name: "Ecosia", url: "https://www.ecosia.org/search?q=", icon: ecosiaIcon },
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
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-gray-500 ">Search Engine</h2>
            <p className="text-xs text-gray-500">
                Select the default Search Engine you want to use
            </p>
            
            <div className="relative -mt-2">
                {/* --- Trigger --- */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.06] hover:border-white/20 transition-all duration-200 group"
                >
                    <div className="flex items-center gap-3">
                        <img 
                            src={currentEngine.icon} 
                            alt="" 
                            className="w-4 h-4 object-contain opacity-60 group-hover:opacity-100 transition-opacity" 
                        />
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
                                            <img 
                                                src={engine.icon} 
                                                alt="" 
                                                className={`w-3.5 h-3.5 object-contain transition-all ${
                                                    selectedUrl === engine.url ? 'opacity-100' : 'opacity-30 group-hover:opacity-60'
                                                }`} 
                                            />
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