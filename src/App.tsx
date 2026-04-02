import "./App.css";
import { AnimatePresence, motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LoadingState } from "./components/LoadingState";
import Footer from "./components/Footer";
import { ResultList } from "./components/ResultList";
import { useSearchLogic } from "./hooks/useSearchLogic";
import { useWindowShadow } from "./hooks/useWindowShadow";
import { playSuccess, playTick } from "./lib/sound";
import icon from "./assets/icon.png";
import { InfoPanel } from "./components/InfoPanel";
import SetupScreen from "./components/SetupScreen";
import { useTheme } from "./hooks/useTheme";

export default function App() {
    const [query, setQuery] = useState("");
    const [allApps, setAllApps] = useState<any[]>([]);
    const [aliases, setAliases] = useState<Record<string, string>>({});
    const [config, setConfig] = useState<any>(null);

    const [activeCommand, setActiveCommand] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [time, setTime] = useState("");
    const [showCopied, setShowCopied] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [firstRun, setFirstRun] = useState<boolean | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const lastQuery = useRef("");

    const { applyTheme } = useTheme(config, setConfig);

    const { results } = useSearchLogic(!!activeCommand, query, allApps, aliases);
    const selectedItem = results[selectedIndex];
    useWindowShadow(containerRef, isInfoOpen, !!firstRun, [results, isLoading, activeCommand, query]);

    // PRE-FLIGHT INITIALIZATION
    useEffect(() => {
        const initializeAura = async () => {
            try {
                const [apps, aliasMap, cfg] = await Promise.all([
                    invoke("get_installed_apps"),
                    invoke("get_aliases"),
                    invoke("get_config") as Promise<any>,
                ]);

                setAllApps(apps as any[]);
                setAliases(aliasMap as Record<string, string>);
                setConfig(cfg);

                setFirstRun(cfg.first_run_complete === false);

                applyTheme(cfg.theme || "default");

                setTimeout(() => setIsLoading(false), 300);
            } catch (e) {
                console.error("Initialization failed", e);
                setIsLoading(false);
            }
        };

        initializeAura();
    }, []);

    useEffect(() => {
        if (isLoading || firstRun) return;
        const el = scrollContainerRef.current?.querySelector('[data-active="true"]');
        el?.scrollIntoView({ block: "nearest", behavior: "smooth", inline: "nearest" });
    }, [selectedIndex, results, isLoading, firstRun]);

    const suggestion = useMemo(() => {
        if (!query || !results.length || activeCommand) return "";
        const t = results[0].title;
        return t.toLowerCase().startsWith(query.toLowerCase()) ? t.slice(query.length) : "";
    }, [query, results, activeCommand]);

    const triggerCopied = useCallback(() => {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
    }, []);

    const handleExecute = useCallback(async () => {
        if (activeCommand) {
            const result = await activeCommand.action?.([query]);
            if (result?.success) triggerCopied();
            return;
        }

        const current = results[selectedIndex];
        if (!current?.action) return;

        if (current.type === "command") {
            lastQuery.current = query;
            const result = await current.action();
            setActiveCommand(current);
            setQuery("");
            if (result?.success) triggerCopied();
            return;
        }

        await current.action();
        setQuery("");
        getCurrentWindow().hide();
    }, [results, selectedIndex, activeCommand, query, triggerCopied]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (firstRun || isLoading) return;

            const max = Math.max(0, results.length - 1);
            if(!activeCommand) inputRef.current?.focus();

            if (e.ctrlKey && e.key.toLowerCase() === "k") {
                if (selectedItem) {
                    e.preventDefault();
                    setIsInfoOpen((open) => !open);
                    return;
                }
            }

            if ((e.key === "Tab" || e.key === "ArrowRight") && suggestion && !activeCommand) {
                e.preventDefault();
                setQuery((q) => q + suggestion);
                return;
            }

            switch (e.key) {
                case "Escape":
                    e.preventDefault();
                    if (activeCommand) {
                        setActiveCommand(null);
                        setQuery(lastQuery.current); // 🔹 Restore "Settings"
                        setSelectedIndex(0);
                    } else {
                        if (!query) {
                            getCurrentWindow().hide();
                        } else {
                            setQuery("");
                            lastQuery.current = ""; // Reset saved query
                        }
                    }
                    break;
                case "Enter":
                    e.preventDefault();                    
                    handleExecute();
                    break;
                case "ArrowDown":
                    if (activeCommand) break;
                    e.preventDefault();
                    setSelectedIndex((i) => (i < max ? i + 1 : i));
                    break;
                case "ArrowUp":
                    if (activeCommand) break;
                    e.preventDefault();
                    setSelectedIndex((i) => (i > 0 ? i - 1 : i));
                    break;

                case "Alt":
                    e.preventDefault();
                    break; // Ignore pure Alt key presses
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [results, suggestion, activeCommand, query, handleExecute, firstRun, isLoading, selectedItem]);

    useEffect(() => setSelectedIndex(0), [query]);

    useEffect(() => {
        const i = setInterval(() => {
            setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        }, 1000);
        return () => clearInterval(i);
    }, []);

    useEffect(() => {
        if (!isLoading && results.length && !firstRun) playTick();
    }, [selectedIndex, isLoading, firstRun, results.length]);

    useEffect(() => {
        if (showCopied) playSuccess();
    }, [showCopied]);

    // RENDER STATES
    if (firstRun === null || (isLoading && firstRun === null)) return null;

    if (firstRun) {
        return (
            <div ref={containerRef} className="bg-transparent overflow-hidden">
                <SetupScreen onComplete={() => setFirstRun(false)} config={config} setConfig={setConfig} />
            </div>
        );
    }

    return (
        <div 
            ref={containerRef} 
            className="bg-transparent overflow-hidden antialiased" 
        >
            <motion.div 
                animate={{ width: isInfoOpen ? 1250 : 1000 }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                className="glass flex flex-col overflow-hidden"
            >
                <header className="relative flex items-center px-4 py-3 border-b border-white/4">
                    <AnimatePresence mode="popLayout">
                        {activeCommand && (
                            <motion.div
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -8 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="flex items-center gap-2 mr-3 px-2 py-1 rounded bg-white/4"
                            >
                                <span className="text-[10px] font-medium text-white/30 uppercase tracking-[0.12em]">
                                    {activeCommand.title}
                                </span>
                                <span className="text-[9px] text-white/10 font-mono select-none">/</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="relative flex-1 flex items-center h-8">
                        <img
                            src={icon}
                            alt="icon"
                            className="absolute left-1 w-5 h-5 pointer-events-none"
                        />

                        <input
                            ref={inputRef}
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search for apps and commands..."
                            className="z-10 w-full bg-transparent outline-none text-lg text-white/90 placeholder:text-white/10 font-light tracking-tight pl-10"
                        />

                        {!activeCommand && query && (
                            <div className="absolute pl-10 text-lg font-light pointer-events-none flex items-center tracking-tight whitespace-pre">
                                <span className="opacity-0 select-none">{query}</span>
                                <span className="text-white/10">{suggestion}</span>
                                {suggestion && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="ml-3 flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm bg-white/3 border border-white/8 shadow-sm"
                                    >
                                        <span className="text-[10px] font-medium text-white/20 tracking-wide uppercase">Tab</span>
                                    </motion.div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="ml-4 tabular-nums text-[11px] text-white/20 font-medium">{time}</div>
                </header>
                
                <AnimatePresence>

                    {!(config.window_mode === "compact" && !activeCommand && query.length === 0) && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col flex-1 overflow-hidden"
                        >
                            <div className="flex flex-1 overflow-hidden max-h-130">
                                <main 
                                    ref={scrollContainerRef} 
                                    className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-2"
                                >
                                    {isLoading ? (
                                        <LoadingState />
                                    ) : activeCommand ? (
                                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="p-2">
                                            {activeCommand.render ? activeCommand.render(query, showCopied, config, setConfig) : activeCommand.view}
                                        </motion.div>
                                    ) : (
                                        <>
                                            {/* 🔹 HERO SECTION: If the top result has a custom renderer and it's a calculator */}
                                            {results[0]?.type === "calc" && query.length > 0 && (
                                                <div className="mb-4 p-2">
                                                {results[0].render?.(query)}
                                                </div>
                                            )}

                                            <ResultList
                                                /* Filter out the calc from the list if it's already shown in Hero */
                                                results={results[0]?.type === "calc" ? results.slice(1) : results}
                                                selectedIndex={selectedIndex}
                                                setSelectedIndex={setSelectedIndex}
                                                onExecute={handleExecute}
                                            />
                                            </>
                                    )}
                                </main>
                                
                                <AnimatePresence>
                                    {isInfoOpen && (
                                        <motion.div
                                            initial={{ width: 0, opacity: 0 }}
                                            animate={{ width: 320, opacity: 1 }}
                                            exit={{ width: 0, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                                            className="border-l border-white/5 overflow-hidden"
                                        >
                                            <InfoPanel item={selectedItem} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <Footer
                                selectedIndex={selectedIndex}
                                results={results.length}
                                selectedType={results[selectedIndex]?.type || ""}
                                isInfoOpen={isInfoOpen}
                                activeCommand={activeCommand?.id}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}