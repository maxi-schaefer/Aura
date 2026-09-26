import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Copy, CornerDownLeft, Sparkles } from "lucide-react";
import { AiReply, ProviderStatus } from "../../types/ai";
import { Config } from "../../types/config";

interface AskAiProps {
    query: string;
    config?: Config | null;
}

export const AskAi = ({ query, config }: AskAiProps) => {
    const [providers, setProviders] = useState<ProviderStatus[] | null>(null);
    const [reply, setReply] = useState<AiReply | null>(null);
    const [asking, setAsking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    /** Guards against a slow earlier answer replacing a newer one. */
    const requestId = useRef(0);

    useEffect(() => {
        invoke<ProviderStatus[]>("ai_providers")
            .then(setProviders)
            .catch((e) => {
                console.error("Could not read AI providers", e);
                setProviders([]);
            });
    }, []);

    useEffect(() => {
        if (!copied) return;
        const timer = setTimeout(() => setCopied(false), 1200);
        return () => clearTimeout(timer);
    }, [copied]);

    const connected = useMemo(
        () => (providers ?? []).filter((p) => p.connected),
        [providers]
    );

    /** Configured default, else whichever provider happens to be connected. */
    const active = useMemo(() => {
        if (!connected.length) return null;
        return connected.find((p) => p.id === config?.ai_provider) ?? connected[0];
    }, [connected, config?.ai_provider]);

    const model = active
        ? config?.ai_models?.[active.id] ?? active.default_model
        : null;

    const prompt = query.trim();

    const ask = async () => {
        if (!active || !prompt || asking) return;

        const id = ++requestId.current;
        setAsking(true);
        setError(null);
        setReply(null);

        try {
            const result = await invoke<AiReply>("ai_complete", {
                provider: active.id,
                model,
                prompt,
            });
            if (id !== requestId.current) return;
            setReply(result);
        } catch (e) {
            if (id !== requestId.current) return;
            setError(String(e));
        } finally {
            if (id === requestId.current) setAsking(false);
        }
    };

    // Enter sends. The global handler ignores keys typed into the main input
    // only when a command is inactive, so this view listens for itself.
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [active, model, prompt, asking]);

    if (providers === null) {
        return <div className="py-16 text-center text-[12px] text-fg/30">Loading...</div>;
    }

    if (!active) {
        return (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
                <Sparkles size={24} className="text-fg/15" />
                <div className="text-[13px] text-fg/50">No AI provider connected</div>
                <div className="text-[11px] text-fg/25 max-w-80 leading-relaxed">
                    Add a Claude, OpenAI or Gemini API key under Settings &rarr; AI, then
                    come back here to ask anything.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-[11px]">
                    <span className="font-semibold text-fg/20 uppercase tracking-widest">
                        {active.label}
                    </span>
                    <span className="text-fg/20">·</span>
                    <span className="text-fg/30 font-mono">{model}</span>
                </div>

                {reply && (
                    <button
                        onClick={async () => {
                            await writeText(reply.text);
                            setCopied(true);
                        }}
                        title="Copy the answer"
                        className="flex items-center gap-1.5 text-[11px] text-fg/25 hover:text-fg/70 transition-colors cursor-pointer"
                    >
                        {copied ? (
                            <>
                                <Check size={12} className="text-emerald-300" /> Copied
                            </>
                        ) : (
                            <>
                                <Copy size={12} /> Copy
                            </>
                        )}
                    </button>
                )}
            </div>

            {!prompt && !reply && (
                <div className="py-14 flex flex-col items-center gap-3 text-center">
                    <Sparkles size={22} className="text-fg/15" />
                    <div className="text-[12px] text-fg/30">
                        Type a question, then press
                        <kbd className="mx-1.5 px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold text-fg/60">
                            Enter
                        </kbd>
                    </div>
                </div>
            )}

            {prompt && !reply && !asking && !error && (
                <div className="flex items-center justify-center gap-2 py-14 text-[12px] text-fg/30">
                    <CornerDownLeft size={13} />
                    Press Enter to ask {active.label}
                </div>
            )}

            {asking && (
                <div className="py-14 text-center text-[12px] text-fg/30">
                    <motion.span
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.4, repeat: Infinity }}
                    >
                        Asking {active.label}...
                    </motion.span>
                </div>
            )}

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-start gap-2 px-4 py-3 rounded-xl border border-red-400/20 bg-red-400/5 text-[12px] text-red-200/80"
                    >
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <span className="break-words">{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {reply && (
                <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-white/5 bg-white/1 p-4 max-h-96 overflow-y-auto custom-scrollbar"
                >
                    <p className="text-[13px] leading-relaxed text-fg/85 whitespace-pre-wrap select-text">
                        {reply.text}
                    </p>
                </motion.div>
            )}
        </div>
    );
};
