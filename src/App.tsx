import "./App.css";
import { motion } from "framer-motion";
import { matchSorter } from "match-sorter";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import { ResultItem } from "./components/ResultItem";
import { CalculatorResult } from "./components/CalculatorResult";
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { calculateExpression, detectColor, scrollToActive } from "./lib/utils";
import { LoadingState } from "./components/LoadingState";
import { ColorResult } from "./components/ColorResult";
import Footer from "./components/Footer";

export default function App() {
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

    // Filtering Logic
    useEffect(() => {
        setFilteredApps(query ? matchSorter(allApps, query, { keys: ["name"] }) : allApps);
        setSelectedIndex(0);
    }, [query, allApps]);

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

    // 4. Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter") {
                handleExecute();
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

    // 5. Auto-Scroll Logic
    useEffect(() => {
        scrollToActive(scrollContainerRef.current, selectedIndex);
    }, [selectedIndex]);

    // 6. Dynamic Window Resizing
    useEffect(() => {
        const resize = () => {
            if (!containerRef.current) return;
            requestAnimationFrame(async () => {
                const height = containerRef.current!.getBoundingClientRect().height;
                await getCurrentWindow().setSize(new LogicalSize(640, Math.ceil(height)));
            });
        };
        resize();
    }, [filteredApps, calculation, isSearchFallback]);

    // 7. Resize after successfully loading applications
    useEffect(() => {
        if (!isLoading) {
            const resize = async () => {
            if (!containerRef.current) return;
            const height = containerRef.current.getBoundingClientRect().height;
            await getCurrentWindow().setSize(new LogicalSize(640, Math.ceil(height)));
            };
            resize();
        }
    }, [isLoading, filteredApps, calculation, isSearchFallback]);

    // 8. Handle Auto Focus
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
        } else if (detectedColor && selectedIndex === 0) {
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
        setTimeout(() => appWindow.hide(), 10);
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

    return (
        <div ref={containerRef} className="bg-transparent overflow-hidden">
            <motion.div className="glass p-4 shadow-2xl flex flex-col">
                <div className="relative flex items-center mb-4 border-b border-white/5 pb-2 pr-15">
                    <input
                        ref={inputRef}
                        autoFocus 
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search apps, math, or type @ for aliases..."
                        className={`w-full bg-transparent outline-none text-base placeholder-gray-500 ${query.startsWith('@') ? 'text-blue-400 font-bold' : 'text-white'}`}
                    />
                    <p className="absolute right-3 text-gray-500/50 font-mono">
                        {time}
                    </p>
                </div>

                <div ref={scrollContainerRef} className="max-h-80 overflow-y-auto custom-scrollbar pr-1">
                    {isLoading ? (
                        <LoadingState />
                    ) : (
                        <>
                            {isAliasMode && filteredAliases.map(([key, url], index) => (
                                <ResultItem
                                    key={key}
                                    name={`@${key}`}
                                    type={url}
                                    isActive={selectedIndex === index}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    onClick={handleExecute}
                                />
                            ))}

                            {!isAliasMode && (
                                <>
                                    {detectedColor && (
                                        <ColorResult color={detectedColor} isActive={selectedIndex === 0} />
                                    )}

                                    {calculation && (
                                        <CalculatorResult 
                                            result={calculation} 
                                            isActive={selectedIndex === 0} 
                                            onMouseEnter={() => setSelectedIndex(0)} 
                                        />
                                    )}

                                    {filteredApps.map((item, index) => {
                                        const visualIndex = (calculation || detectedColor) ? index + 1 : index;
                                        return (
                                            <ResultItem
                                                key={item.path}
                                                name={item.name}
                                                type="Application"
                                                isActive={selectedIndex === visualIndex}
                                                onMouseEnter={() => setSelectedIndex(visualIndex)}
                                                onClick={handleExecute}
                                            />
                                        );
                                    })}

                                    {isSearchFallback && !(calculation || detectedColor) && (
                                        <ResultItem
                                            name={`Browse for "${query}"`} 
                                            type="Browser" 
                                            isActive={selectedIndex === 0} 
                                            onMouseEnter={() => setSelectedIndex(0)} 
                                            onClick={handleExecute}
                                        />
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>

                <Footer results={filteredApps.length} />
            </motion.div>
        </div>
    );
}