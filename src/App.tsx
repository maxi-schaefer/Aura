import "./App.css";
import { AnimatePresence, motion } from "framer-motion";
import { LoadingState } from "./components/LoadingState";
import Footer from "./components/footer/Footer";
import { ResultList } from "./components/ResultList";
import { useSearchLogic } from "./hooks/useSearchLogic";
import { useWindowShadow } from "./hooks/useWindowShadow";
import { InfoPanel } from "./components/InfoPanel";
import SetupScreen from "./components/SetupScreen";
import { useTheme } from "./hooks/useTheme";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppInitialization } from "./hooks/useAppInitialization";
import { useClock } from "./hooks/useClock";
import { useExecution } from "./hooks/useExecution";
import { useKeyboardNavigation } from "./hooks/useKeyboardNavigation";
import { playSuccess, playTick } from "./lib/sound";
import { Result } from "./types/result";
import { SearchHeader } from "./components/SearchHeader";

export default function App() {
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [activeCommand, setActiveCommand] = useState<Result | null>(null);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [showCopied, setShowCopied] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const lastQuery = useRef("");

    const { applyTheme } = useTheme(null, () => {});

    const {
        allApps,
        aliases,
        config,
        setConfig,
        isLoading,
        firstRun,
        setFirstRun,
    } = useAppInitialization(applyTheme);

    const { results } = useSearchLogic(!!activeCommand, query, allApps, aliases);
    const selectedItem = results[selectedIndex];

    const time = useClock();

    const triggerCopied = useCallback(() => {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
    }, []);

    const suggestion = useMemo(() => {
        if (!query || !results.length || activeCommand) return "";

        const top = results[0]?.title || "";
        return top.toLowerCase().startsWith(query.toLowerCase())
            ? top.slice(query.length)
            : "";
    }, [query, results, activeCommand]);

    const handleExecute = useExecution({
        results,
        selectedIndex,
        activeCommand,
        query,
        setQuery,
        setActiveCommand,
        triggerCopied,
        lastQuery,
    });

    useKeyboardNavigation({
        results,
        selectedIndex,
        setSelectedIndex,
        activeCommand,
        setActiveCommand,
        query,
        setQuery,
        suggestion,
        handleExecute,
        firstRun,
        isLoading,
        selectedItem,
        setIsInfoOpen,
        inputRef,
        lastQuery,
    });

    useEffect(() => {
        if (isLoading || firstRun) return;
        const el = scrollContainerRef.current?.querySelector('[data-active="true"]');
        el?.scrollIntoView({ block: "nearest", behavior: "smooth", inline: "nearest" });
    }, [selectedIndex, results, isLoading, firstRun]);

    useEffect(() => {
        if (!isLoading && results.length && !firstRun) playTick();
    }, [selectedIndex, isLoading, firstRun, results.length]);

    useEffect(() => {
        if (showCopied) playSuccess();
    }, [showCopied]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    useEffect(() => {
        setSelectedIndex((prev) => {
            const prevItem = results[prev];
            if (!prevItem) return 0;

            const newIndex = results.findIndex(r => r.id === prevItem.id);
            return newIndex !== -1 ? newIndex : 0;
        });
    }, [results]);

    useWindowShadow(containerRef, isInfoOpen, firstRun || false, [
        results,
        isLoading,
        activeCommand,
        query,
    ]);

    if (firstRun === null) return null;

    if (firstRun) {
        return (
            /* Use h-fit to ensure the ResizeObserver detects height changes in setup steps */
            <div ref={containerRef} className="flex flex-col w-full h-fit overflow-hidden antialiased">
                <SetupScreen
                    onComplete={() => setFirstRun(false)}
                    config={config}
                    setConfig={setConfig}
                />
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
                <SearchHeader
                    query={query}
                    setQuery={setQuery}
                    suggestion={suggestion}
                    activeCommand={activeCommand}
                    time={time}
                    inputRef={inputRef}
                />
                
                <AnimatePresence>

                    {!(config?.window_mode === "compact" && !activeCommand && query.length === 0) && (
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
                                            {activeCommand.render ? activeCommand.render(query, setConfig, showCopied, config) : activeCommand.view}
                                        </motion.div>
                                    ) : (
                                        <>
                                            {results[0]?.type === "calc" && query.length > 0 && (
                                                <div className="mb-4 p-2">
                                                {results[0].render?.(query, setConfig, showCopied, config)}
                                                </div>
                                            )}

                                            <ResultList
                                                results={results}
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
                                activeCommand={activeCommand?.id ?? null}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}