import "./App.css";
import { motion } from "framer-motion";
import { matchSorter } from "match-sorter";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import { getCurrentWindow, LogicalPosition, LogicalSize, primaryMonitor } from '@tauri-apps/api/window';
import { calculateExpression, detectColor, scrollToActive } from "./lib/utils";
import { LoadingState } from "./components/LoadingState";
import Footer from "./components/Footer";
import { COMMAND_MAP } from "./lib/command";
import { ResultList } from "./components/ResultList";

export default function App() {
    const [suggestion, setSuggestion] = useState("");
    const [query, setQuery] = useState("");
    const isAliasMode = query.startsWith("@");
    const [isLoading, setIsLoading] = useState(true);
    const [allApps, setAllApps] = useState<any[]>([]);
    const [aliases, setAliases] = useState<{ [key: string]: string }>({});
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [filteredApps, setFilteredApps] = useState<any[]>([]);
    const [filteredAliases, setFilteredAliases] = useState<[string, string][]>([]);
    const [calculation, setCalculation] = useState<string | null>(null);
    const [detectedColor, setDetectedColor] = useState<string | null>(null);
    const [time, setTime] = useState("");
    const [commandResult, setCommandResult] = useState<string | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isSearchFallback = query.length > 0 && filteredApps.length === 0;

    useEffect(() => {
        setDetectedColor(detectColor(query));
    }, [query]);

    // Initial Load
    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            invoke("get_installed_apps"),
            invoke("get_aliases")
        ]).then(([apps, aliasMap]: [any, any]) => {
            setAllApps(apps);
            setFilteredApps(apps);
            setAliases(aliasMap);
        }).finally(() => setTimeout(() => setIsLoading(false), 300));
    }, []);

    // Math Logic
    useEffect(() => {
        setCalculation(calculateExpression(query));
    }, [query]);

    // Command Logic
    useEffect(() => {
        if (query.startsWith(">")) {
            const rawContent = query.slice(1).trim(); // remove ">"
            const [cmdPrefix, ...args] = rawContent.split(" ");
            
            const command = COMMAND_MAP[cmdPrefix];
            if (command) {
            const result = command.execute(args);
            // Handle both Sync and Async results
            Promise.resolve(result).then(setCommandResult);
            } else {
            setCommandResult(null);
            }
        } else {
            setCommandResult(null);
        }
    }, [query]);

    // Filtering Logic
    useEffect(() => {
        setFilteredApps(query ? matchSorter(allApps, query, { keys: ["name"] }) : allApps);
        setSelectedIndex(0);
    }, [query, allApps]);

    // Suggestion Logic
    useEffect(() => {
        if (query.startsWith(">")) {
            // Remove the ">" and any leading/trailing whitespace to get the actual command string
            const commandPart = query.slice(1).trimStart(); 
            
            if (!commandPart) {
                setSuggestion("");
                return;
            }

            const match = Object.keys(COMMAND_MAP).find(cmd => 
                cmd.startsWith(commandPart.toLowerCase())
            );

            if (match && match !== commandPart.toLowerCase()) {
                setSuggestion(match);
            } else {
                setSuggestion("");
            }
        } else {
            setSuggestion("");
        }
    }, [query]);

    // Filtering Logic for Aliases
    useEffect(() => {
        if (query.startsWith("@")) {
            const searchTerm = query.slice(1).toLowerCase();
            const matches = Object.entries(aliases).filter(([key]) => 
                key.includes(searchTerm)
            );
            setFilteredAliases(matches);
        } else {
            setFilteredAliases([]);
        }
        setSelectedIndex(0);
    }, [query, aliases]);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter") {
                handleExecute();
                return;
            }

            if (e.key === "Tab" && suggestion) {
                e.preventDefault();
                setQuery(`>${suggestion} `); // Complete and add a space for args
                setSuggestion("");
                return;
            }

            const listLength = isAliasMode 
                ? filteredAliases.length 
                : (calculation ? 1 : 0) + (detectedColor ? 1 : 0) + filteredApps.length + (isSearchFallback && !calculation ? 1 : 0);

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
    }, [selectedIndex, filteredApps, calculation, isSearchFallback, query]);

    // Auto-Scroll Logic
    useEffect(() => {
        scrollToActive(scrollContainerRef.current, selectedIndex);
    }, [selectedIndex]);

    // Dynamic Window Resizing
    useEffect(() => {
        const updateWindowPosition = async () => {
            if (!containerRef.current) return;

            const monitor = await primaryMonitor();
            if (!monitor) return;

            const window = getCurrentWindow();
            const { height } = containerRef.current.getBoundingClientRect();

            const newWidth = 700;
            const newHeight = Math.ceil(height);
            await window.setSize(new LogicalSize(newWidth, newHeight));

            const scaleFactor = monitor.scaleFactor;
            const monitorSize = monitor.size.toLogical(scaleFactor);

            const x = (monitorSize.width / 2) - (newWidth / 2);
            
            const y = monitorSize.height * 0.25; 

            await window.setPosition(new LogicalPosition(x, y));
        };

        const observer = new ResizeObserver(() => {
            requestAnimationFrame(() => {
                updateWindowPosition();
            });
        });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [filteredApps, calculation, isSearchFallback, commandResult, isLoading]);

    // Resize after successfully loading applications
    useEffect(() => {
        if (!isLoading) {
            const resize = async () => {
            if (!containerRef.current) return;
            const height = containerRef.current.getBoundingClientRect().height;
            await getCurrentWindow().setSize(new LogicalSize(700, Math.ceil(height)));
            };
            resize();
        }
    }, [isLoading, filteredApps, calculation, isSearchFallback]);

    // Handle Auto Focus
    useEffect(() => {
        const focusInput = () => {
            inputRef.current?.focus();
        };

        setTimeout(focusInput, 50);
    }, []);

    const handleExecute = async () => {
        const appWindow = getCurrentWindow();
        
        if (isAliasMode) {
            const selected = filteredAliases[selectedIndex];
            if (selected) {
                await invoke("search_web", { query: selected[1] });
            }
        } else if (query.startsWith(">") && commandResult) {
            if (typeof commandResult === "string") {
                await navigator.clipboard.writeText(commandResult);
                setQuery("");
            } else {
                return;
            }
        }else if (detectedColor && selectedIndex === 0) {
            await navigator.clipboard.writeText(detectedColor);
        } else if (calculation && selectedIndex === 0) {
            await navigator.clipboard.writeText(calculation);
        } else if (isSearchFallback && !calculation) {
            await invoke("search_web", { query });
        } else {
            const appIndex = (calculation || detectedColor) ? selectedIndex - 1 : selectedIndex;
            const selectedApp = filteredApps[appIndex];
            if (selectedApp) await invoke("launch_app", { path: selectedApp.path });
        }

        setQuery("");
        appWindow.hide();
    };

    // Timer
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const formatted = now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            });
            setTime(formatted);
        };

        updateTime(); // run immediately
        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleSystemMenu = (e: KeyboardEvent) => {
            // Prevent the default Alt key behavior (opening the system menu)
            if (e.key === 'Alt') {
            e.preventDefault();
            }
        };

        window.addEventListener('keydown', handleSystemMenu);
        return () => window.removeEventListener('keydown', handleSystemMenu);
    }, []);

    return (
        <div ref={containerRef} className="bg-transparent overflow-hidden">
            <motion.div className="glass p-4 shadow-2xl flex flex-col">
                <div className="relative flex items-center mb-4 border-b border-white/5 pb-2 pr-15">
                    {/* Suggestions Layer */}
                    {suggestion && (
                        <div className="absolute pointer-events-none text-base font-mono flex items-center h-full">
                            <span className="text-transparent whitespace-pre">
                                {query.startsWith(">") ? ">" : ""}
                                {query.slice(1)}
                            </span>
                            
                            {/* The Ghost Text */}
                            <span className="text-white/20 flex items-center">
                                {/* Slice the suggestion based on the length of the commandPart only */}
                                {suggestion.slice(query.slice(1).trimStart().length)}
                                    <motion.span 
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="ml-2 text-[9px] bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-white/40 font-sans uppercase tracking-tighter"
                                    >
                                        Tab
                                    </motion.span>
                            </span>
                        </div>
                    )}

                    <input
                        ref={inputRef}
                        autoFocus
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search apps, math, or type @ for aliases..."
                        className={`w-full bg-transparent outline-none text-base placeholder-gray-500 relative z-10 ${
                            query.startsWith('@') ? 'text-blue-400 font-bold' : 
                            query.startsWith('>') ? 'text-blue-100 font-mono' : 'text-white'
                        }`}
                    />
                    
                    <p className="absolute right-3 text-gray-500/50 font-mono z-20">
                        {time}
                    </p>
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
                        />
                    )}
                </div>

                {/* Update Footer Count Logic */}
                <Footer results={
                    query.startsWith('>') ? 1 :
                    query.startsWith('@') ? filteredAliases.length :
                    (calculation || detectedColor ? 1 : 0) + (filteredApps.length || (query ? 1 : 0))
                } />
            </motion.div>
        </div>
    );
}