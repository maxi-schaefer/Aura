import { AnimatePresence, motion } from "framer-motion";
import icon from "../assets/icon.png";
import { Result } from "../types/result";
import { argumentPlaceholder } from "../lib/commandArgs";

interface SearchHeaderProps {
    query: string;
    setQuery: (query: string) => void;
    /** Inline completion of the top result, rendered behind the caret. */
    suggestion: string;
    activeCommand: Result | null;
    time: string;
    inputRef: React.RefObject<HTMLInputElement | null>;
}

export function SearchHeader({
    query,
    setQuery,
    suggestion,
    activeCommand,
    time,
    inputRef,
}: SearchHeaderProps) {
    return (
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
                    placeholder={
                        (activeCommand && argumentPlaceholder(activeCommand.args)) ??
                        "Search for apps and commands..."
                    }
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
    );
}
