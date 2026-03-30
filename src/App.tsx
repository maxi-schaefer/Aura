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

export default function App() {
    const [query, setQuery] = useState("");
    const [allApps, setAllApps] = useState<any[]>([]);
    const [aliases, setAliases] = useState<Record<string, string>>({});
    const [activeCommand, setActiveCommand] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [time, setTime] = useState("");
    const [showCopied, setShowCopied] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { results } = useSearchLogic(!!activeCommand, query, allApps, aliases);
    useWindowShadow(containerRef, [results, isLoading]);

    useEffect(() => {
        (async () => {
            const [apps, aliasMap] = await Promise.all([
                invoke("get_installed_apps"),
                invoke("get_aliases")
            ]);
            setAllApps(apps as any[]);
            setAliases(aliasMap as Record<string, string>);
            setTimeout(() => setIsLoading(false), 300);
        })();
    }, []);

    useEffect(() => {
        if (isLoading) return;
        const el = scrollContainerRef.current?.querySelector('[data-active="true"]');
        el?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex, results, isLoading]);

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
            const max = Math.max(0, results.length - 1);

            if ((e.key === "Tab" || e.key === "ArrowRight") && suggestion && !activeCommand) {
                e.preventDefault();
                setQuery((q) => q + suggestion);
                return;
            }

            if (e.key === "Backspace" && !query && activeCommand) {
                setActiveCommand(null);
                setQuery(activeCommand.title.toLowerCase());
                return;
            }

            switch (e.key) {
                case "Escape":
                    e.preventDefault();
                    if (activeCommand) setActiveCommand(null);
                    else {
                        if (!query) getCurrentWindow().hide();
                        setQuery("");
                    }
                    break;
                case "Enter":
                    e.preventDefault();
                    handleExecute();
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    setSelectedIndex((i) => (i < max ? i + 1 : i));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setSelectedIndex((i) => (i > 0 ? i - 1 : i));
                    break;
                case "Alt":
                    e.preventDefault();
                    break;
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [results, suggestion, activeCommand, query, handleExecute]);

    useEffect(() => setSelectedIndex(0), [query]);

    useEffect(() => {
        const i = setInterval(() => {
            setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        }, 1000);
        return () => clearInterval(i);
    }, []);

    useEffect(() => {
        if (!isLoading && results.length) playTick();
    }, [selectedIndex]);

    useEffect(() => {
        if (showCopied) playSuccess();
    }, [showCopied]);

    return (
        <div ref={containerRef} className="bg-transparent overflow-hidden antialiased select-none">
            <motion.div className="glass flex flex-col overflow-hidden">
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
                        <input
                            ref={inputRef}
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search..."
                            className="z-10 w-full bg-transparent outline-none text-lg text-white/90 placeholder:text-white/10 font-light tracking-tight"
                        />

                        {!activeCommand && query && (
                            <div className="absolute left-0 text-lg font-light pointer-events-none flex items-center tracking-tight whitespace-pre">
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

                <main ref={scrollContainerRef} className="max-h-110 overflow-y-auto custom-scrollbar p-2">
                    {isLoading ? (
                        <LoadingState />
                    ) : activeCommand ? (
                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="p-2">
                            {activeCommand.render
                                ? activeCommand.render(query, showCopied)
                                : activeCommand.view}
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
                    results={results.length}
                    selectedType={results[selectedIndex]?.type || ""}
                />
            </motion.div>
        </div>
    );
}