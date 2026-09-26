import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { motion } from "framer-motion";
import { FileText, Search } from "lucide-react";
import { ContentMatch } from "../../types/system";

/** Keep in step with MIN_QUERY_LEN in src-tauri/src/commands/content.rs. */
const MIN_QUERY_LEN = 3;
const DEBOUNCE_MS = 250;

/** Splits a line around every case-insensitive occurrence of the needle. */
function highlight(text: string, needle: string) {
    if (!needle) return [{ text, match: false }];

    const parts: { text: string; match: boolean }[] = [];
    const haystack = text.toLowerCase();
    const target = needle.toLowerCase();

    let cursor = 0;
    let found = haystack.indexOf(target, cursor);

    while (found !== -1) {
        if (found > cursor) parts.push({ text: text.slice(cursor, found), match: false });
        parts.push({ text: text.slice(found, found + target.length), match: true });
        cursor = found + target.length;
        found = haystack.indexOf(target, cursor);
    }

    if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
    return parts;
}

function shortenPath(path: string): string {
    return path.replace(/^([A-Z]:\\Users\\[^\\]+)/i, "~");
}

export const ContentSearch = ({ query }: { query: string }) => {
    const [matches, setMatches] = useState<ContentMatch[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searched, setSearched] = useState("");
    const [selected, setSelected] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    /** Guards against a slow earlier search overwriting a newer one. */
    const requestId = useRef(0);

    const needle = query.trim();

    useEffect(() => {
        if (needle.length < MIN_QUERY_LEN) {
            requestId.current += 1;
            setMatches([]);
            setIsSearching(false);
            setSearched("");
            return;
        }

        setIsSearching(true);
        const id = ++requestId.current;

        const timer = setTimeout(async () => {
            try {
                const found = await invoke<ContentMatch[]>("search_file_contents", {
                    query: needle,
                });
                // A newer query started while this one was in flight.
                if (id !== requestId.current) return;
                setMatches(found);
                setSearched(needle);
            } catch (e) {
                if (id !== requestId.current) return;
                console.error("Content search failed", e);
                setMatches([]);
            } finally {
                if (id === requestId.current) setIsSearching(false);
            }
        }, DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [needle]);

    useEffect(() => setSelected(0), [matches]);

    const open = async (match: ContentMatch) => {
        try {
            await invoke("open_file_at_line", { path: match.path, line: match.line });
            await getCurrentWindow().hide();
        } catch (e) {
            console.error("Failed to open match", e);
        }
    };

    // Arrows are ignored by the global handler while a command is active.
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!matches.length) return;

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelected((i) => Math.min(i + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelected((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
                e.preventDefault();
                const match = matches[selected];
                if (match) open(match);
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [matches, selected]);

    useEffect(() => {
        listRef.current
            ?.querySelector('[data-active="true"]')
            ?.scrollIntoView({ block: "nearest" });
    }, [selected]);

    const fileCount = useMemo(
        () => new Set(matches.map((m) => m.path)).size,
        [matches]
    );

    if (needle.length < MIN_QUERY_LEN) {
        return (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
                <Search size={24} className="text-fg/15" />
                <div className="text-[13px] text-fg/50">Search inside your files</div>
                <div className="text-[11px] text-fg/25">
                    Type at least {MIN_QUERY_LEN} characters to search the contents of
                    text files in Documents, Downloads and Desktop.
                </div>
            </div>
        );
    }

    if (isSearching && !matches.length) {
        return (
            <div className="py-16 text-center text-[12px] text-fg/30">
                Searching for "{needle}"...
            </div>
        );
    }

    if (!matches.length) {
        return (
            <div className="py-16 text-center space-y-2">
                <div className="text-[13px] text-fg/50">No matches for "{searched || needle}"</div>
                <div className="text-[11px] text-fg/25">
                    Only text files under 1 MB are searched.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-[11px] font-semibold text-fg/20 uppercase tracking-widest">
                    Matches
                </h3>
                <span className="text-[11px] text-fg/20 tabular-nums">
                    {matches.length} in {fileCount} file{fileCount === 1 ? "" : "s"}
                    {isSearching && " · updating"}
                </span>
            </div>

            <div
                ref={listRef}
                className="rounded-xl border border-white/5 bg-white/1 divide-y divide-white/5 overflow-y-auto custom-scrollbar max-h-96"
            >
                {matches.map((match, index) => {
                    const isActive = index === selected;

                    return (
                        <div
                            key={`${match.path}:${match.line}`}
                            data-active={isActive}
                            onMouseEnter={() => setSelected(index)}
                            onClick={() => open(match)}
                            className={`relative flex flex-col gap-1 px-4 py-3 cursor-pointer transition-colors ${
                                isActive ? "bg-white/5" : "hover:bg-white/3"
                            }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="content-active"
                                    className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary"
                                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                />
                            )}

                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 min-w-0">
                                    <FileText
                                        size={13}
                                        className={isActive ? "text-primary shrink-0" : "text-fg/30 shrink-0"}
                                    />
                                    <span className="text-[12px] text-fg/80 truncate">{match.name}</span>
                                    <span className="text-[11px] text-fg/20 tabular-nums shrink-0">
                                        :{match.line}
                                    </span>
                                </div>

                                {match.total_in_file > 1 && (
                                    <span className="text-[10px] text-fg/25 tabular-nums shrink-0">
                                        {match.total_in_file} hits
                                    </span>
                                )}
                            </div>

                            <div className="text-[12px] font-mono text-fg/45 truncate pl-5">
                                {highlight(match.preview, searched).map((part, i) =>
                                    part.match ? (
                                        <mark
                                            key={i}
                                            className="bg-primary/25 text-fg rounded-sm px-0.5"
                                        >
                                            {part.text}
                                        </mark>
                                    ) : (
                                        <span key={i}>{part.text}</span>
                                    )
                                )}
                            </div>

                            <div className="text-[10px] text-fg/20 truncate pl-5">
                                {shortenPath(match.path)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
