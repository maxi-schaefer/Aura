import "./App.css";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState, useCallback } from "react";
import { getCurrentWindow } from '@tauri-apps/api/window';
import { scrollToActive } from "./lib/utils";
import { LoadingState } from "./components/LoadingState";
import Footer from "./components/Footer";
import { ResultList } from "./components/ResultList";
import { useSearchLogic } from "./hooks/useSearchLogic";
import { useWindowShadow } from "./hooks/useWindowShadow";

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

    const handleExecute = useCallback(async () => {
        if (activeCommand) {
            if (activeCommand.action) {
                const args = query.split(" ");
                const result = await activeCommand.action(args);
                
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
    }, [results, selectedIndex, handleExecute, query, activeCommand]);

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

    return (
        <div ref={containerRef} className="bg-transparent overflow-hidden">
            <motion.div className="glass p-4 shadow-2xl flex flex-col">
                <div className="relative flex items-center mb-4 border-b border-white/5 pb-2 pr-15">
                    {activeCommand && (
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex items-center gap-1.5 mr-2 px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/20"
                        >
                            {activeCommand.title}
                        </motion.div>
                    )}
                    
                    <input
                        ref={inputRef}
                        autoFocus
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={activeCommand ? `Type arguments...` : "Search anything..."}
                        className="w-full bg-transparent outline-none text-base text-white placeholder:text-white/20"
                    />
                    <p className="absolute right-3 text-gray-500/50 font-mono text-xs">{time}</p>
                </div>

                <div ref={scrollContainerRef} className="max-h-120 overflow-y-auto custom-scrollbar pr-1">
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