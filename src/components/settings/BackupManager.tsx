import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Download, Upload } from "lucide-react";
import { Section } from "../commands/SettingsView";
import { Config, SetConfig } from "../../types/config";
import { ImportSummary } from "../../types/system";
import { useTheme } from "../../hooks/useTheme";

interface BackupManagerProps {
    config: Config;
    setConfig: SetConfig;
}

type Status = { kind: "ok" | "error"; message: string };

/** Keeps a long path readable without hiding the file name. */
function shortenPath(path: string): string {
    const withHome = path.replace(/^([A-Z]:\Users\[^\]+)/i, "~");
    return withHome.length > 60 ? `...${withHome.slice(-57)}` : withHome;
}

const ActionRow = ({
    icon,
    label,
    description,
    button,
    onClick,
    busy,
    disabled,
}: {
    icon: React.ReactNode;
    label: string;
    description: string;
    button: string;
    onClick: () => void;
    busy: boolean;
    disabled: boolean;
}) => (
    <div className="flex items-center justify-between p-4 bg-transparent hover:bg-white/2 transition-colors border-b border-white/5 last:border-0">
        <div className="flex items-start gap-3 max-w-[70%]">
            <span className="text-fg/30 mt-0.5">{icon}</span>
            <div>
                <div className="text-[13.5px] text-fg/90 font-medium">{label}</div>
                <div className="text-[12px] text-fg/30 leading-snug mt-0.5">{description}</div>
            </div>
        </div>

        <button
            onClick={onClick}
            disabled={disabled}
            className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-[12px] text-fg/70 transition-colors enabled:hover:bg-white/10 enabled:hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
            {busy ? "Working..." : button}
        </button>
    </div>
);

export const BackupManager = ({ config, setConfig }: BackupManagerProps) => {
    const [status, setStatus] = useState<Status | null>(null);
    const [busy, setBusy] = useState<"export" | "import" | null>(null);

    const { applyTheme } = useTheme(config, setConfig);

    const handleExport = async () => {
        setBusy("export");
        setStatus(null);
        try {
            const path = await invoke<string | null>("export_settings");
            // null means the save dialog was dismissed, which is not an error.
            if (path) setStatus({ kind: "ok", message: `Saved to ${shortenPath(path)}` });
        } catch (e) {
            setStatus({ kind: "error", message: String(e) });
        } finally {
            setBusy(null);
        }
    };

    const handleImport = async () => {
        setBusy("import");
        setStatus(null);
        try {
            const summary = await invoke<ImportSummary | null>("import_settings");
            if (!summary) return;

            // Adopt the restored config in place, so no restart is needed.
            setConfig(summary.config);
            applyTheme(summary.config.theme || "default");

            const parts = [
                summary.config_imported && "preferences",
                summary.aliases_imported > 0 &&
                    `${summary.aliases_imported} alias${summary.aliases_imported === 1 ? "" : "es"}`,
            ].filter(Boolean);

            setStatus({
                kind: "ok",
                message: parts.length ? `Restored ${parts.join(" and ")}.` : "Nothing to restore.",
            });
        } catch (e) {
            setStatus({ kind: "error", message: String(e) });
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="space-y-8">
            <Section label="Backup">
                <ActionRow
                    icon={<Download size={15} />}
                    label="Export settings"
                    description="Save your preferences, theme, shortcut and aliases to a JSON file."
                    button="Export"
                    onClick={handleExport}
                    busy={busy === "export"}
                    disabled={busy !== null}
                />
                <ActionRow
                    icon={<Upload size={15} />}
                    label="Import settings"
                    description="Restore from a previously exported file. This replaces your current settings."
                    button="Import"
                    onClick={handleImport}
                    busy={busy === "import"}
                    disabled={busy !== null}
                />
            </Section>

            <AnimatePresence mode="wait">
                {status && (
                    <motion.div
                        key={status.message}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className={`flex items-start gap-2 px-4 py-3 rounded-xl border text-[12px] ${
                            status.kind === "ok"
                                ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-200/80"
                                : "border-red-400/20 bg-red-400/5 text-red-200/80"
                        }`}
                    >
                        {status.kind === "error" && (
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        )}
                        <span className="break-all">{status.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <p className="text-[11px] text-fg/20 leading-relaxed px-1">
                Exports contain your search engine, theme, window mode, global shortcut,
                username and aliases. They do not contain any application data or
                credentials.
            </p>
        </div>
    );
};
