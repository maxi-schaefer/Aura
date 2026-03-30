import "./App.css";
import { AnimatePresence, motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LoadingState } from "./components/LoadingState";
import Footer from "./components/Footer";
import { ResultList } from "./components/ResultList";
import { useSearchLogic } from "./hooks/useSearchLogic";
import { useWindowShadow } from "./hooks/useWindowShadow";
import { playSuccess, playTick } from "./lib/sound";

export default function App() {
    const [query, setQuery] = useState("");
    const [allApps, setAllApps] = useState<any[]>([]);
    const [aliases, setAliases] = useState<{ [key: string]: string }>({});
    const [activeCommand, setActiveCommand] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [time, setTime] = useState("");
    
    // UI State for the "Copied" animation
    const [showCopied, setShowCopied] = useState(false);

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // If activeCommand is set, we pass true to pause background file searching
    const { results } = useSearchLogic(activeCommand !== null, query, allApps, aliases);
    useWindowShadow(containerRef, [results, isLoading]);

    // Initial Data Fetch
    useEffect(() => {
        const init = async () => {
            const [apps, aliasMap] = await Promise.all([
                invoke("get_installed_apps"),
                invoke("get_aliases")
            ]);
            setAllApps(apps as any[]);
            setAliases(aliasMap as { [key: string]: string });
            setTimeout(() => setIsLoading(false), 300);
        };
        init();
    }, []);

    // Scroll to active item
    useEffect(() => {
    if (!isLoading) {
        const activeElement = scrollContainerRef.current?.querySelector('[data-active="true"]');
        if (activeElement) {
        activeElement.scrollIntoView({
            block: 'nearest',
            behavior: 'auto'
        });
        }
    }
    }, [selectedIndex, results, isLoading]);

    // Suggestion Logic
    const suggestion = useMemo(() => {
        if (!query || results.length === 0 || activeCommand) return "";
        const topResult = results[0].title;
        if (topResult.toLowerCase().startsWith(query.toLowerCase())) {
            return topResult.slice(query.length);
        }
        return "";
    }, [query, results, activeCommand]);

    const handleExecute = useCallback(async () => {
        if (activeCommand) {
            if (activeCommand.action) {
                const result = await activeCommand.action([query]);
                
                if (result?.success) {
                    setShowCopied(true);
                    setTimeout(() => setShowCopied(false), 2000);
                }
            }
            return;
        }

        // 2. Handle Main List Selection
        const currentSelected = results[selectedIndex];
        if (!currentSelected || !currentSelected.action) return;

        if (currentSelected.type === "command") {
            const result = await currentSelected.action();
            
            setActiveCommand(currentSelected);
            setQuery(""); 
            
            if (result?.success) {
                setShowCopied(true);
                setTimeout(() => setShowCopied(false), 2000);
            }
            return;
        }

        // 3. Standard App/File execution
        await currentSelected.action();
        setQuery("");
        getCurrentWindow().hide();
    }, [results, selectedIndex, activeCommand, query]);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const maxIndex = Math.max(0, results.length - 1);

            if ((e.key === "Tab" || e.key === "ArrowRight") && suggestion && !activeCommand) {
                e.preventDefault();
                setQuery(query + suggestion);
                return;
            }

            // Backspace out of command mode
            if (e.key === "Backspace" && query === "" && activeCommand) {
                setActiveCommand(null);
                setQuery(activeCommand.title.toLowerCase());
                return;
            }

            switch (e.key) {
                case "Escape":
                    e.preventDefault();
                    if (activeCommand) {
                        setActiveCommand(null);
                    } else {
                        setQuery("");
                        query === "" && getCurrentWindow().hide();
                    }
                    break;

                case "Enter":
                    e.preventDefault();
                    handleExecute();
                    break;

                case "ArrowDown":
                    e.preventDefault();
                    setSelectedIndex(prev => (prev < maxIndex ? prev + 1 : prev));
                    break;

                case "ArrowUp":
                    e.preventDefault();
                    setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
                    break;

                case "Alt":
                    e.preventDefault();
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [results, selectedIndex, handleExecute, query, activeCommand, suggestion]);

    // Reset selection on query change
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Clock
    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Sounds
    useEffect(() => {
        if (!isLoading && results.length > 0) {
            playTick();
        }
    }, [selectedIndex]);

    useEffect(() => {
        if (showCopied) {
            playSuccess();
        }
    }, [showCopied]);

    return (
        <div ref={containerRef} className="bg-transparent overflow-hidden antialiased select-none">
            <motion.div className="glass flex flex-col overflow-hidden">
                {/* Search Header */}
                <header className="relative flex items-center px-4 py-3 border-b border-white/[0.04]">
                    <AnimatePresence mode="popLayout">
                        {activeCommand && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex items-center gap-2 mr-3 px-2 py-0.5 rounded bg-white/5 border border-white/10"
                            >
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">
                                    {activeCommand.title}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="relative flex-1 flex items-center">
                        <input
                            ref={inputRef}
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search..."
                            className="w-full bg-transparent outline-none text-lg text-white/90 placeholder:text-white/10 font-light tracking-tight h-8"
                        />
                        
                        {!activeCommand && query && (
                            <div className="absolute left-0 text-lg font-light pointer-events-none flex tracking-tight">
                                <span className="opacity-0">{query}</span>
                                <span className="text-white/10">{suggestion}</span>
                            </div>
                        )}
                    </div>
                    
                    {/* Minimalist Clock */}
                    <div className="ml-4 tabular-nums text-[11px] text-white/20 font-medium">
                        {time}
                    </div>
                </header>

                {/* Content Area */}
                <main 
                    ref={scrollContainerRef} 
                    className="max-h-110 overflow-y-auto custom-scrollbar p-2"
                >
                    {isLoading ? (
                        <LoadingState />
                    ) : activeCommand ? (
                        <motion.div 
                            initial={{ opacity: 0, y: 4 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            className="p-2"
                        >
                            {activeCommand.render ? activeCommand.render(query, showCopied) : activeCommand.view}
                        </motion.div>
                    ) : (
                        <ResultList
                            results={results}
                            selectedIndex={selectedIndex}
                            setSelectedIndex={setSelectedIndex}
                            onExecute={handleExecute}
                        />
                    )}
                </main>

                <Footer 
                    selectedIndex={selectedIndex} 
                    query={query} 
                    results={results.length} 
                    selectedType={results[selectedIndex]?.type || ""} 
                />
            </motion.div>
        </div>
    );
}