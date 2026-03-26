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

    const { results } = useSearchLogic(query, allApps, aliases);
    const selected = results[selectedIndex];

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

    const handleExecute = async (fromClick = false) => {
        const selected = results[selectedIndex];
        if (!selected) return;

        if (selected.type === "command" && selected.action) {
            await selected.action();

            if (fromClick) {
                setQuery(selected.title);
            }
        } else if (selected.action) {
            await selected.action();
            setQuery("");
            getCurrentWindow().hide();
        }
    };

    useEffect(() => {
        setSelectedIndex(0);
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [query]);

    const listLength = results.length;

    // Keyboard Navigation
    useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const maxIndex = Math.max(0, results.length - 1);

        switch (e.key) {
            case "Escape":
                e.preventDefault();
                setQuery("");
                break;

            case "Enter":
                e.preventDefault();
                handleExecute();
                setTimeout(() => setSelectedIndex(0), 10);
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

            default:
                break;
        }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
}, [results, selectedIndex, handleExecute]);

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
                    <input
                        ref={inputRef}
                        autoFocus
                        value={query} 
                        onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                        placeholder="Search anything..."
                        className="w-full bg-transparent outline-none text-base text-white"
                    />
                    <p className="absolute right-3 text-gray-500/50 font-mono">{time}</p>
                </div>

                <div ref={scrollContainerRef} className="max-h-120 overflow-y-auto custom-scrollbar pr-1">
                    {isLoading ? (
                        <LoadingState />
                    ) : selected?.view ? (
                        <div className="mt-2">
                            {selected.view}
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

                <Footer selectedIndex={selectedIndex} query={query} results={listLength} />
            </motion.div>
        </div>
    );
}