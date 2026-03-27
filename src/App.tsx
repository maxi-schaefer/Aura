import "./App.css";
import { AnimatePresence, motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { getCurrentWindow } from '@tauri-apps/api/window';
import { scrollToActive } from "./lib/utils";
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
        if (scrollContainerRef.current) {
            scrollToActive(scrollContainerRef.current, selectedIndex);
        }
    }, [selectedIndex]);

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
        <div ref={containerRef} className="bg-transparent overflow-hidden">
            <motion.div className="glass p-4 shadow-2xl flex flex-col">
                <div className="relative flex items-center mb-4 border-b border-white/5 pb-3">
                    <div className="flex items-center w-full relative">
                        {/* Command Tag (Breadcrumb) */}
                        <AnimatePresence mode="wait">
                            {activeCommand && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.1 }}
                                className="flex items-center gap-2 mr-3 pl-1 pr-2 py-1 rounded-md bg-primary/10 border border-primary/20"
                            >
                                {/* Subtle Icon or Dot for the command */}
                                <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
                                <span className="text-primary text-[11px] uppercase tracking-wider">
                                    {activeCommand.title}
                                </span>
                                {/* Breadcrumb Separator */}
                                <span className="text-white/10 text-xs font-light">/</span>
                            </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="relative flex-1 flex items-center h-10">
                            {/* The Invisible Base Input */}
                            <input
                            ref={inputRef}
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={activeCommand ? "" : "Search apps and commands..."}
                            className="z-10 w-full bg-transparent outline-none text-[17px] text-white placeholder:text-white/10 font-medium tracking-tight"
                            />

                            {/* The Ghost Suggestion Text */}
                            {!activeCommand && query && (
                            <div className="absolute left-0 text-[17px] font-medium pointer-events-none flex tracking-tight">
                                <span className="opacity-0">{query}</span>
                                <span className="text-white/20">{suggestion}</span>
                            </div>
                            )}
                            
                            {/* Dynamic Placeholder for Command Mode */}
                            {activeCommand && !query && (
                            <div className="absolute left-0 text-[17px] font-medium pointer-events-none text-white/10 tracking-tight">
                                Type arguments...
                            </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Clock / Time */}
                    <div className="flex items-center gap-3 ml-4">
                         <div className="w-px h-4 bg-white/10" />
                         <p className="text-gray-500/50 font-mono text-[11px] tabular-nums tracking-tighter">{time}</p>
                    </div>
                </div>

                <div ref={scrollContainerRef} className="max-h-120 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                    {isLoading ? (
                        <LoadingState />
                    ) : activeCommand ? (
                        <div className="mt-2">
                            {/* We pass the query and the showCopied state to the render function */}
                            {activeCommand.render ? activeCommand.render(query, showCopied) : activeCommand.view}
                        </div>
                    ) : (
                        <ResultList
                            results={results}
                            selectedIndex={selectedIndex}
                            setSelectedIndex={setSelectedIndex}
                            onExecute={handleExecute}
                        />
                    )}
                </div>

                <Footer selectedIndex={selectedIndex} query={query} results={results.length} />
            </motion.div>
        </div>
    );
}