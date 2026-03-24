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
import { Image } from "@tauri-apps/api/image";
import { ColorResult } from "./components/ColorResult";
import Footer from "./components/Footer";

export default function App() {
    const [query, setQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [allApps, setAllApps] = useState<any[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [filteredApps, setFilteredApps] = useState<any[]>([]);
    const [calculation, setCalculation] = useState<string | null>(null);
    const [detectedColor, setDetectedColor] = useState<string | null>(null);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isSearchFallback = query.length > 0 && filteredApps.length === 0;

    useEffect(() => {
        setDetectedColor(detectColor(query));
    }, [query]);

    // 1. Initial Load
    useEffect(() => {
        setIsLoading(true);
        invoke("get_installed_apps").then((res: any) => { 
            setAllApps(res); 
            setFilteredApps(res); 
        })
        .finally(() => setTimeout(() => setIsLoading(false), 300));
    }, []);

    // 2. Math Logic
    useEffect(() => {
        setCalculation(calculateExpression(query));
    }, [query]);

    // 3. Filtering Logic
    useEffect(() => {
        setFilteredApps(query ? matchSorter(allApps, query, { keys: ["name"] }) : allApps);
        setSelectedIndex(0);
    }, [query, allApps]);

    // 4. Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter") {
                handleExecute();
                return;
            }

            // Total items = (1 if calculation) + (filteredApps OR 1 if fallback)
            const listLength = (calculation ? 1 : 0) + (isSearchFallback && !calculation ? 1 : filteredApps.length);
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

    const handleExecute = async () => {
        const appWindow = getCurrentWindow();
        if(detectedColor && selectedIndex == 0) {
            await navigator.clipboard.writeText(detectedColor);
        } else if (calculation && selectedIndex === 0) {
            await navigator.clipboard.writeText(calculation);
        } else if (isSearchFallback && !calculation) {
            await invoke("search_web", { query });
        } else {
            const appIndex = calculation ? selectedIndex - 1 : selectedIndex;
            const selectedApp = filteredApps[appIndex];
            if (selectedApp) await invoke("launch_app", { path: selectedApp.path });
        }
        setQuery("");
        await appWindow.hide();
    };

    return (
        <div ref={containerRef} className="bg-transparent overflow-hidden">
            <motion.div className="glass p-4 shadow-2xl flex flex-col">
                <div className="flex-none">
                    <input
                        autoFocus 
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search apps or math..."
                        className="w-full bg-transparent outline-none text-white text-base placeholder-gray-500 pb-2"
                    />
                    <div className="h-px bg-white/10 my-3" />
                </div>

                <div ref={scrollContainerRef} className="max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                    {isLoading ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <LoadingState />
                        </motion.div>
                    ) : (
                        <>
                        {detectedColor && (
                            <ColorResult 
                                color={detectedColor} 
                                isActive={selectedIndex === 0} 
                            />
                        )}

                        {calculation && (
                            <CalculatorResult 
                                result={calculation} 
                                isActive={selectedIndex === 0} 
                                onMouseEnter={() => setSelectedIndex(0)} 
                            />
                        )}

                        {filteredApps.map((item, index) => {
                            const visualIndex = calculation ? index + 1 : index;
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
                    </div>

                <Footer results={filteredApps.length} />
            </motion.div>
        </div>
    );
}