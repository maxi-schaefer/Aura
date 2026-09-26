import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, ExternalLink, Eye, EyeOff, Trash2 } from "lucide-react";
import { Section } from "../commands/SettingsView";
import { Config, SetConfig } from "../../types/config";
import { ProviderStatus } from "../../types/ai";
import { useConfigPatch } from "../../hooks/useConfigPatch";
import { handleLinkClick } from "../../lib/utils";

interface AiManagerProps {
    config: Config;
    setConfig: SetConfig;
}

type Feedback = { kind: "ok" | "error"; message: string };

const ProviderCard = ({
    provider,
    isDefault,
    selectedModel,
    onSave,
    onClear,
    onModelChange,
    onMakeDefault,
    busy,
}: {
    provider: ProviderStatus;
    isDefault: boolean;
    selectedModel: string;
    onSave: (key: string) => Promise<void>;
    onClear: () => Promise<void>;
    onModelChange: (model: string) => void;
    onMakeDefault: () => void;
    busy: boolean;
}) => {
    const [draft, setDraft] = useState("");
    const [reveal, setReveal] = useState(false);

    const save = async () => {
        if (!draft.trim()) return;
        await onSave(draft.trim());
        setDraft("");
        setReveal(false);
    };

    return (
        <div className="p-4 space-y-3 border-b border-white/5 last:border-0">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[13.5px] text-fg/90 font-medium">{provider.label}</span>

                    {provider.connected ? (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide text-emerald-300 bg-emerald-400/10">
                            <Check size={10} /> Connected
                        </span>
                    ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide text-fg/25 bg-white/5">
                            Not connected
                        </span>
                    )}

                    {isDefault && provider.connected && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10">
                            Default
                        </span>
                    )}
                </div>

                <button
                    onClick={() => handleLinkClick(provider.keys_url)}
                    className="flex items-center gap-1 text-[11px] text-fg/25 hover:text-fg/60 transition-colors cursor-pointer shrink-0"
                >
                    Get a key <ExternalLink size={11} />
                </button>
            </div>

            {provider.connected ? (
                <div className="flex items-center justify-between gap-3">
                    <code className="text-[12px] font-mono text-fg/40 px-2 py-1 rounded bg-white/5">
                        {provider.masked_key}
                    </code>

                    <div className="flex items-center gap-2">
                        {!isDefault && (
                            <button
                                onClick={onMakeDefault}
                                disabled={busy}
                                className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[11px] text-fg/60 transition-colors enabled:hover:bg-white/10 enabled:hover:text-fg disabled:opacity-30 cursor-pointer"
                            >
                                Use by default
                            </button>
                        )}
                        <button
                            onClick={onClear}
                            disabled={busy}
                            title="Remove this key"
                            className="p-1.5 rounded-md text-fg/25 transition-colors enabled:hover:bg-white/10 enabled:hover:text-red-300 disabled:opacity-30 cursor-pointer"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <input
                            type={reveal ? "text" : "password"}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") save();
                            }}
                            placeholder={provider.key_hint}
                            spellCheck={false}
                            autoComplete="off"
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-9 py-2 text-[13px] font-mono text-fg outline-none focus:border-white/20 placeholder:text-fg/15 select-text"
                        />
                        <button
                            onClick={() => setReveal((v) => !v)}
                            title={reveal ? "Hide" : "Show"}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-fg/25 hover:text-fg/60 transition-colors cursor-pointer"
                        >
                            {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                    </div>

                    <button
                        onClick={save}
                        disabled={busy || !draft.trim()}
                        className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-[12px] text-fg/70 transition-colors enabled:hover:bg-white/10 enabled:hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0"
                    >
                        Connect
                    </button>
                </div>
            )}

            {provider.connected && (
                <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-fg/25">Model</span>
                    <select
                        value={selectedModel}
                        onChange={(e) => onModelChange(e.target.value)}
                        className="bg-white/5 border border-white/10 text-[12px] text-fg/70 rounded-md px-2 py-1.5 outline-none hover:bg-white/10 transition-colors cursor-pointer max-w-[60%]"
                    >
                        {provider.models.map((m) => (
                            <option key={m.id} value={m.id} className="bg-[#1a1a1a]">
                                {m.label}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
};

export const AiManager = ({ config, setConfig }: AiManagerProps) => {
    const patchConfig = useConfigPatch(config, setConfig);

    const [providers, setProviders] = useState<ProviderStatus[] | null>(null);
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [busy, setBusy] = useState(false);

    const refresh = async () => {
        try {
            setProviders(await invoke<ProviderStatus[]>("ai_providers"));
        } catch (e) {
            console.error("Could not read AI providers", e);
            setFeedback({ kind: "error", message: String(e) });
            setProviders([]);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    useEffect(() => {
        if (!feedback) return;
        const timer = setTimeout(() => setFeedback(null), 4000);
        return () => clearTimeout(timer);
    }, [feedback]);

    const models = config.ai_models ?? {};
    const defaultProvider = config.ai_provider ?? null;

    /** The first connected provider, used when no default is set yet. */
    const connected = useMemo(
        () => (providers ?? []).filter((p) => p.connected),
        [providers]
    );

    const run = async (action: () => Promise<void>, success: string) => {
        setBusy(true);
        setFeedback(null);
        try {
            await action();
            await refresh();
            setFeedback({ kind: "ok", message: success });
        } catch (e) {
            setFeedback({ kind: "error", message: String(e) });
        } finally {
            setBusy(false);
        }
    };

    const saveKey = (provider: ProviderStatus, key: string) =>
        run(async () => {
            await invoke("ai_set_key", { provider: provider.id, key });

            // First connected provider becomes the default automatically.
            if (!defaultProvider) {
                await patchConfig({
                    ai_provider: provider.id,
                    ai_models: { ...models, [provider.id]: provider.default_model },
                });
            }
        }, `${provider.label} connected.`);

    const clearKey = (provider: ProviderStatus) =>
        run(async () => {
            await invoke("ai_clear_key", { provider: provider.id });

            if (defaultProvider === provider.id) {
                const fallback = connected.find((p) => p.id !== provider.id);
                await patchConfig({ ai_provider: fallback?.id ?? null });
            }
        }, `${provider.label} disconnected.`);

    if (providers === null) {
        return (
            <div className="py-16 text-center text-[12px] text-fg/30">
                Loading providers...
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <Section label="AI Providers">
                {providers.map((provider) => (
                    <ProviderCard
                        key={provider.id}
                        provider={provider}
                        busy={busy}
                        isDefault={defaultProvider === provider.id}
                        selectedModel={models[provider.id] ?? provider.default_model}
                        onSave={(key) => saveKey(provider, key)}
                        onClear={() => clearKey(provider)}
                        onModelChange={(model) =>
                            patchConfig({ ai_models: { ...models, [provider.id]: model } })
                        }
                        onMakeDefault={() => patchConfig({ ai_provider: provider.id })}
                    />
                ))}
            </Section>

            <AnimatePresence mode="wait">
                {feedback && (
                    <motion.div
                        key={feedback.message}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className={`flex items-start gap-2 px-4 py-3 rounded-xl border text-[12px] ${
                            feedback.kind === "ok"
                                ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-200/80"
                                : "border-red-400/20 bg-red-400/5 text-red-200/80"
                        }`}
                    >
                        {feedback.kind === "error" && (
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        )}
                        <span className="break-all">{feedback.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <p className="text-[11px] text-fg/20 leading-relaxed px-1">
                Keys are encrypted with the Windows Data Protection API and stored on
                this machine only. They can be decrypted by your Windows account alone,
                are never sent anywhere except the provider they belong to, and are not
                included in a settings export. Run <span className="font-mono">/ask</span>{" "}
                to use them.
            </p>
        </div>
    );
};
