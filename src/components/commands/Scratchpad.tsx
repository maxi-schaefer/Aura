import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Trash2 } from "lucide-react";

const AUTOSAVE_MS = 600;

type SaveState = "idle" | "saving" | "saved" | "error";

export const Scratchpad = () => {
    const [content, setContent] = useState<string | null>(null);
    const [state, setState] = useState<SaveState>("idle");
    const [copied, setCopied] = useState(false);

    /** Latest text and whether it still needs writing, for the unmount flush. */
    const latest = useRef("");
    const dirty = useRef(false);

    useEffect(() => {
        invoke<string>("get_note")
            .then((text) => {
                setContent(text);
                latest.current = text;
            })
            .catch((e) => {
                console.error("Could not read the scratchpad", e);
                setContent("");
                setState("error");
            });
    }, []);

    // Debounced autosave.
    useEffect(() => {
        if (content === null || !dirty.current) return;

        setState("saving");
        const timer = setTimeout(async () => {
            try {
                await invoke("save_note", { content });
                dirty.current = false;
                setState("saved");
            } catch (e) {
                console.error("Could not save the scratchpad", e);
                setState("error");
            }
        }, AUTOSAVE_MS);

        return () => clearTimeout(timer);
    }, [content]);

    // Leaving the command cancels the pending timer, so flush on the way out.
    useEffect(
        () => () => {
            if (dirty.current) {
                invoke("save_note", { content: latest.current }).catch((e) =>
                    console.error("Could not flush the scratchpad", e)
                );
            }
        },
        []
    );

    useEffect(() => {
        if (!copied) return;
        const timer = setTimeout(() => setCopied(false), 1200);
        return () => clearTimeout(timer);
    }, [copied]);

    const update = (value: string) => {
        latest.current = value;
        dirty.current = true;
        setContent(value);
    };

    const stats = useMemo(() => {
        const text = content ?? "";
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const lines = text ? text.split("\n").length : 0;
        return { words, lines, chars: text.length };
    }, [content]);

    if (content === null) {
        return (
            <div className="py-16 text-center text-[12px] text-fg/30">
                Opening scratchpad...
            </div>
        );
    }

    const statusLabel =
        state === "saving"
            ? "Saving..."
            : state === "saved"
              ? "Saved"
              : state === "error"
                ? "Could not save"
                : "";

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-[11px] font-semibold text-fg/20 uppercase tracking-widest">
                    Scratchpad
                </h3>

                <div className="flex items-center gap-3">
                    <AnimatePresence mode="wait" initial={false}>
                        {statusLabel && (
                            <motion.span
                                key={statusLabel}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className={`text-[11px] ${
                                    state === "error" ? "text-red-300/70" : "text-fg/25"
                                }`}
                            >
                                {statusLabel}
                            </motion.span>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={async () => {
                            await writeText(content);
                            setCopied(true);
                        }}
                        disabled={!content}
                        title="Copy everything"
                        className="p-1.5 rounded-md text-fg/25 transition-colors enabled:hover:bg-white/10 enabled:hover:text-fg/70 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                    </button>

                    <button
                        onClick={() => update("")}
                        disabled={!content}
                        title="Clear the scratchpad"
                        className="p-1.5 rounded-md text-fg/25 transition-colors enabled:hover:bg-white/10 enabled:hover:text-red-300 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <textarea
                autoFocus
                value={content}
                onChange={(e) => update(e.target.value)}
                spellCheck={false}
                placeholder="Anything you need to remember for a minute. Saves as you type."
                className="w-full h-80 resize-none rounded-xl border border-white/5 bg-white/1 p-4 text-[13px] leading-relaxed text-fg/85 font-mono outline-none transition-colors placeholder:text-fg/15 focus:border-white/10 custom-scrollbar select-text"
            />

            <div className="flex items-center justify-between px-1 text-[11px] text-fg/20 tabular-nums">
                <span>
                    {stats.words} word{stats.words === 1 ? "" : "s"} · {stats.lines} line
                    {stats.lines === 1 ? "" : "s"} · {stats.chars} character
                    {stats.chars === 1 ? "" : "s"}
                </span>
                <span>Esc to close</span>
            </div>
        </div>
    );
};
