import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AlertTriangle, RotateCcw, X } from "lucide-react";
import { Section } from "../commands/SettingsView";
import { Config, SetConfig, ShortcutRegistration } from "../../types/config";
import { Command } from "../../types/command";
import { useConfigPatch } from "../../hooks/useConfigPatch";
import { loadCommands } from "../../lib/command";

const DEFAULT_MAIN = "Alt+Space";

/** Keys that only modify, and so can never be a shortcut on their own. */
const MODIFIER_KEYS = ["Control", "Shift", "Alt", "Meta", "AltGraph", "OS"];

/** Reads the modifier keys held during a keyboard event, in display order. */
const getModifiers = (e: KeyboardEvent): string[] => {
    const mods: string[] = [];
    if (e.ctrlKey) mods.push("Ctrl");
    if (e.altKey) mods.push("Alt");
    if (e.shiftKey) mods.push("Shift");
    // Tauri maps "Command" to SUPER, which is the Windows key here.
    if (e.metaKey) mods.push("Command");
    return mods;
};

/** "Command" is the accelerator token; "Win" is what the key is called. */
const displayToken = (token: string) => (token === "Command" ? "Win" : token);

const Keys = ({ tokens }: { tokens: string[] }) => (
    <div className="flex items-center gap-1">
        {tokens.map((key, i) => (
            <div key={`${key}-${i}`} className="flex items-center gap-1">
                <kbd className="min-w-6 h-6 px-2 flex items-center justify-center bg-white/10 border-b-2 border-white/5 rounded text-[10px] font-bold text-white/70 shadow-sm uppercase">
                    {displayToken(key)}
                </kbd>
                {i < tokens.length - 1 && (
                    <span className="text-[10px] text-white/20 font-bold">+</span>
                )}
            </div>
        ))}
    </div>
);

interface RecorderProps {
    value?: string;
    recording: boolean;
    onStart: () => void;
    onCancel: () => void;
    onRecorded: (accelerator: string) => void;
    placeholder?: string;
}

const ShortcutRecorder = ({
    value,
    recording,
    onStart,
    onCancel,
    onRecorded,
    placeholder = "Not set",
}: RecorderProps) => {
    const [held, setHeld] = useState<string[]>([]);

    useEffect(() => {
        if (!recording) {
            setHeld([]);
            return;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const mods = getModifiers(e);

            if (MODIFIER_KEYS.includes(e.key)) {
                setHeld(mods);
                return;
            }

            if (e.key === "Escape") {
                onCancel();
                return;
            }

            const keyName =
                e.key === " " ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key;

            onRecorded([...mods, keyName].join("+"));
            setHeld([]);
        };

        const handleKeyUp = (e: KeyboardEvent) => setHeld(getModifiers(e));

        window.addEventListener("keydown", handleKeyDown, true);
        window.addEventListener("keyup", handleKeyUp, true);
        return () => {
            window.removeEventListener("keydown", handleKeyDown, true);
            window.removeEventListener("keyup", handleKeyUp, true);
        };
    }, [recording, onCancel, onRecorded]);

    const tokens = recording && held.length ? held : value ? value.split("+") : [];

    return (
        <button
            onClick={onStart}
            className={`flex items-center gap-1.5 p-1 min-h-8 rounded-lg border transition-all cursor-pointer ${
                recording
                    ? "bg-primary/10 border-primary/50 ring-2 ring-primary/20"
                    : "bg-white/3 border-white/10 hover:border-white/20 hover:bg-white/5"
            }`}
        >
            {tokens.length > 0 ? (
                <Keys tokens={tokens} />
            ) : (
                <span className="text-[10px] text-white/20 px-2 uppercase tracking-wide">
                    {placeholder}
                </span>
            )}

            {recording && held.length === 0 && (
                <span className="text-[10px] text-primary/60 font-medium px-2 animate-pulse uppercase">
                    Press keys...
                </span>
            )}
        </button>
    );
};

const Problem = ({ message }: { message: string }) => (
    <div className="flex items-start gap-1.5 mt-1.5 text-[11px] text-amber-300/70">
        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
        <span>{message}</span>
    </div>
);

interface ShortcutsManagerProps {
    config: Config;
    setConfig: SetConfig;
    isSetup?: boolean;
}

export const ShortcutsManager = ({
    config,
    setConfig,
    isSetup = false,
}: ShortcutsManagerProps) => {
    const patchConfig = useConfigPatch(config, setConfig);

    const [commands, setCommands] = useState<Record<string, Command>>({});
    const [recordingId, setRecordingId] = useState<string | null>(null);
    const [registrations, setRegistrations] = useState<ShortcutRegistration[]>([]);

    useEffect(() => {
        loadCommands().then(setCommands).catch((e) =>
            console.error("Could not load commands", e)
        );
    }, []);

    /** Re-applies every accelerator and records which ones the OS accepted. */
    const syncRegistrations = async () => {
        try {
            setRegistrations(await invoke<ShortcutRegistration[]>("refresh_shortcuts"));
        } catch (e) {
            console.error("Could not read shortcut registrations", e);
        }
    };

    useEffect(() => {
        syncRegistrations();
    }, []);

    const problems = useMemo(() => {
        const byId: Record<string, string> = {};
        for (const r of registrations) {
            if (!r.ok && r.error) byId[r.id] = r.error;
        }
        return byId;
    }, [registrations]);

    const mainShortcut = config.main_shortcut || DEFAULT_MAIN;
    const commandShortcuts = config.command_shortcuts ?? {};

    const saveMain = async (accelerator: string) => {
        setRecordingId(null);
        await patchConfig({ main_shortcut: accelerator });
        await syncRegistrations();
    };

    const saveCommand = async (cmd: string, accelerator: string | null) => {
        setRecordingId(null);

        const next = { ...commandShortcuts };
        if (accelerator) next[cmd] = accelerator;
        else delete next[cmd];

        await patchConfig({ command_shortcuts: next });
        await syncRegistrations();
    };

    const mainRow = (
        <div
            className={`transition-colors group rounded-lg ${
                isSetup ? "p-0" : "p-4 bg-transparent hover:bg-white/2"
            }`}
        >
            <div className="flex items-center justify-between">
                {!isSetup && (
                    <div>
                        <div className="text-[13.5px] text-white/90 font-medium">Toggle Aura</div>
                        <div className="text-[12px] text-white/30">
                            Global shortcut to show and hide the window
                        </div>
                    </div>
                )}

                <div className={`flex items-center gap-3 ${isSetup ? "w-full" : ""}`}>
                    {!isSetup && mainShortcut !== DEFAULT_MAIN && (
                        <button
                            onClick={() => saveMain(DEFAULT_MAIN)}
                            title="Reset to the default"
                            className="cursor-pointer p-1.5 rounded-md hover:bg-white/10 text-white/20 hover:text-white/60 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <RotateCcw size={14} />
                        </button>
                    )}

                    <ShortcutRecorder
                        value={mainShortcut}
                        recording={recordingId === "main"}
                        onStart={() => setRecordingId("main")}
                        onCancel={() => setRecordingId(null)}
                        onRecorded={saveMain}
                    />
                </div>
            </div>

            {problems.main && <Problem message={problems.main} />}
        </div>
    );

    if (isSetup) return <Section label="">{mainRow}</Section>;

    const entries = Object.entries(commands).sort(([, a], [, b]) =>
        (a.title || "").localeCompare(b.title || "")
    );

    return (
        <div className="space-y-8">
            <Section label="Global Shortcuts">{mainRow}</Section>

            <Section label="Command Shortcuts">
                {entries.length === 0 && (
                    <div className="p-8 text-center text-[12px] text-fg/20">
                        Loading commands...
                    </div>
                )}

                {entries.map(([cmd, command]) => {
                    const assigned = commandShortcuts[cmd];

                    return (
                        <div
                            key={cmd}
                            className="p-4 bg-transparent hover:bg-white/2 transition-colors group border-b border-white/5 last:border-0"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="text-[13.5px] text-white/90 font-medium truncate">
                                        {command.title || cmd}
                                    </div>
                                    <div className="text-[12px] text-white/30 truncate">
                                        {command.description}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    {assigned && (
                                        <button
                                            onClick={() => saveCommand(cmd, null)}
                                            title="Remove this shortcut"
                                            className="cursor-pointer p-1.5 rounded-md hover:bg-white/10 text-white/20 hover:text-white/60 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}

                                    <ShortcutRecorder
                                        value={assigned}
                                        recording={recordingId === cmd}
                                        onStart={() => setRecordingId(cmd)}
                                        onCancel={() => setRecordingId(null)}
                                        onRecorded={(accelerator) => saveCommand(cmd, accelerator)}
                                    />
                                </div>
                            </div>

                            {problems[cmd] && <Problem message={problems[cmd]} />}
                        </div>
                    );
                })}
            </Section>

            <p className="text-[11px] text-fg/20 leading-relaxed px-1">
                Windows reserves most Win key combinations for itself, so those
                usually cannot be recorded or registered. Alt and Ctrl
                combinations are the reliable choice.
            </p>
        </div>
    );
};
