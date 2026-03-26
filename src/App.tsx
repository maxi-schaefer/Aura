import "./App.css";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
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
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [time, setTime] = useState("");

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { 
        calculation, 
        detectedColor, 
        filteredApps, 
        filteredAliases, 
        suggestion,
        commandResult,
        fileResults
    } = useSearchLogic(query, allApps, aliases);

    const isAliasMode = query.startsWith("@");
    const isFileMode = query.startsWith("/");
    const isSearchFallback = query.length > 0 && filteredApps.length === 0;

    useWindowShadow(containerRef, [filteredApps, calculation, commandResult, isLoading, fileResults]);

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

    const getListLength = () => {
        if (isAliasMode) return filteredAliases.length;
        if (query.startsWith(">")) return 1;
        
        let length = 0;
        if (calculation || detectedColor) length += 1;
        if (isFileMode) {
            length += (fileResults?.length || 0);
        } else {
            length += filteredApps.length;
            if (filteredApps.length === 0 && query.length > 0 && !calculation) length += 1;
        }
        return length;
    };

    const handleExecute = async () => {
        const appWindow = getCurrentWindow();
        const hasSpecial = !!(calculation || detectedColor);
        
        if (isAliasMode) {
            const selected = filteredAliases[selectedIndex];
            if (selected) await invoke("search_web", { query: selected[1] });
        } 
        else if (isFileMode) {
            // Offset by 1 if there's a calculation/color result
            const fileIndex = hasSpecial ? selectedIndex - 1 : selectedIndex;
            const selectedFile = fileResults?.[fileIndex];
            if (selectedFile) await invoke("launch_app", { path: selectedFile.path });
        } 
        else if (query.startsWith(">") && commandResult) {
            if (typeof commandResult === "string") {
                await navigator.clipboard.writeText(commandResult);
            }
        } 
        else if (hasSpecial && selectedIndex === 0) {
            await navigator.clipboard.writeText((detectedColor || calculation)!);
        } 
        else if (isSearchFallback && !calculation) {
            await invoke("search_web", { query });
        } 
        else {
            // Standard App Launch logic
            const appIndex = hasSpecial ? selectedIndex - 1 : selectedIndex;
            const selectedApp = filteredApps[appIndex];
            if (selectedApp) await invoke("launch_app", { path: selectedApp.path });
        }

        setQuery("");
        appWindow.hide();
    };

    const listLength = getListLength();

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                setQuery("");
                return;
            }
            
            if (e.key === "Enter") {
                handleExecute();
                return;
            }

            if (e.key === "Tab" && suggestion) {
                e.preventDefault();
                setQuery(`>${suggestion} `);
                return;
            }
            
            if (e.key === "Alt") {
                e.preventDefault();
                return;
            }

            const maxIndex = Math.max(0, listLength - 1);

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex(prev => (prev < maxIndex ? prev + 1 : prev));
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedIndex, listLength, query, suggestion, handleExecute]);

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
                    {suggestion && (
                        <div className="absolute pointer-events-none text-base font-mono flex items-center h-full">
                            <span className="text-transparent whitespace-pre">
                                {query.startsWith(">") ? ">" : ""}{query.slice(1)}
                            </span>
                            <motion.span 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }} 
                                className="text-white/20 flex items-center"
                            >
                                {suggestion.slice(query.slice(1).trimStart().length)}
                                <span className="ml-2 text-[9px] bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-white/40 font-sans uppercase">Tab</span>
                            </motion.span>
                        </div>
                    )}

                    <input
                        ref={inputRef}
                        autoFocus
                        value={query} 
                        onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                        placeholder="Search apps, math, or type @ for aliases..."
                        className={`w-full bg-transparent outline-none text-base ${
                            query.startsWith('@') ? 'text-blue-400 font-bold' : 
                            query.startsWith('/') ? 'text-blue-400 font-medium' :
                            query.startsWith('>') ? 'text-blue-100 font-mono' : 'text-white'
                        }`}
                    />
                    <p className="absolute right-3 text-gray-500/50 font-mono">{time}</p>
                </div>

                <div ref={scrollContainerRef} className="max-h-120 overflow-y-auto custom-scrollbar pr-1">
                    {isLoading ? (
                        <LoadingState />
                    ) : (
                        <ResultList
                            query={query}
                            selectedIndex={selectedIndex}
                            filteredApps={filteredApps}
                            filteredAliases={filteredAliases}
                            calculation={calculation}
                            detectedColor={detectedColor}
                            commandResult={commandResult}
                            onExecute={handleExecute}
                            setSelectedIndex={setSelectedIndex}
                            fileResults={fileResults}
                        />
                    )}
                </div>

                <Footer selectedIndex={selectedIndex} query={query} results={listLength} />
            </motion.div>
        </div>
    );
}