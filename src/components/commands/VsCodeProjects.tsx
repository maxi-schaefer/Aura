import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion } from "framer-motion";
import { matchSorter } from "match-sorter";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { FolderCode, Layers } from "lucide-react";
import { VsCodeProject } from "../../types/system";

/** Coarse "3 days ago" style labelling; exact times add noise here. */
function relativeTime(seconds: number): string {
    if (!seconds) return "";

    const elapsed = Date.now() / 1000 - seconds;

    if (elapsed < 60) return "just now";
    if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ago`;
    if (elapsed < 86400) return `${Math.floor(elapsed / 3600)}h ago`;
    if (elapsed < 604800) return `${Math.floor(elapsed / 86400)}d ago`;

    return new Date(seconds * 1000).toLocaleDateString();
}

/** Shortens "C:\Users\me\dev\app" to "~\dev\app" for display. */
function shortenPath(path: string): string {
    return path.replace(/^([A-Z]:\\Users\\[^\\]+)/i, "~");
}

export const VsCodeProjects = ({ query }: { query: string }) => {
    const [projects, setProjects] = useState<VsCodeProject[] | null>(null);
    const [selected, setSelected] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        invoke<VsCodeProject[]>("get_vscode_projects")
            .then(setProjects)
            .catch((e) => {
                console.error("Failed to read VS Code projects", e);
                setError(String(e));
                setProjects([]);
            });
    }, []);

    const filtered = useMemo(() => {
        if (!projects) return [];
        if (!query.trim()) return projects;
        return matchSorter(projects, query.trim(), { keys: ["name", "path"] });
    }, [projects, query]);

    useEffect(() => setSelected(0), [query]);

    const open = async (project: VsCodeProject) => {
        try {
            await invoke("open_vscode_project", {
                path: project.path,
                editor: project.editor,
            });
            await getCurrentWindow().hide();
        } catch (e) {
            console.error("Failed to open project", e);
            setError(String(e));
        }
    };

    // The global handler ignores arrows while a command is active, so this
    // view drives its own selection.
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!filtered.length) return;

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelected((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelected((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
                e.preventDefault();
                const project = filtered[selected];
                if (project) open(project);
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [filtered, selected]);

    useEffect(() => {
        listRef.current
            ?.querySelector('[data-active="true"]')
            ?.scrollIntoView({ block: "nearest" });
    }, [selected]);

    if (projects === null) {
        return (
            <div className="py-16 text-center text-[12px] text-fg/30">
                Reading VS Code history...
            </div>
        );
    }

    if (!projects.length) {
        return (
            <div className="py-16 text-center space-y-2">
                <div className="text-[13px] text-fg/50">No recent projects found</div>
                <div className="text-[11px] text-fg/25">
                    {error ?? "Open a folder in VS Code and it will show up here."}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-[11px] font-semibold text-fg/20 uppercase tracking-widest">
                    Recent Projects
                </h3>
                <span className="text-[11px] text-fg/20 tabular-nums">
                    {filtered.length} of {projects.length}
                </span>
            </div>

            <div
                ref={listRef}
                className="rounded-xl border border-white/5 bg-white/1 divide-y divide-white/5 overflow-y-auto custom-scrollbar max-h-96"
            >
                {filtered.map((project, index) => {
                    const isActive = index === selected;
                    const Icon = project.is_workspace ? Layers : FolderCode;

                    return (
                        <div
                            key={`${project.editor}:${project.path}`}
                            data-active={isActive}
                            onMouseEnter={() => setSelected(index)}
                            onClick={() => open(project)}
                            className={`relative flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                                isActive ? "bg-white/5" : "hover:bg-white/3"
                            }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="vscode-active"
                                    className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary"
                                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                />
                            )}

                            <div className="flex items-center gap-3 min-w-0">
                                <Icon
                                    size={16}
                                    className={isActive ? "text-primary shrink-0" : "text-fg/30 shrink-0"}
                                />
                                <div className="min-w-0">
                                    <div className="text-[13px] text-fg/90 truncate">
                                        {project.name}
                                    </div>
                                    <div className="text-[11px] text-fg/25 truncate">
                                        {shortenPath(project.path)}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 pl-4">
                                {project.is_workspace && (
                                    <span className="text-[9px] uppercase tracking-wider text-fg/25 px-1.5 py-0.5 rounded bg-white/5">
                                        Workspace
                                    </span>
                                )}
                                <span className="text-[11px] text-fg/25 tabular-nums">
                                    {relativeTime(project.last_opened)}
                                </span>
                            </div>
                        </div>
                    );
                })}

                {!filtered.length && (
                    <div className="p-8 text-center text-[12px] text-fg/20">
                        No project matches "{query.trim()}"
                    </div>
                )}
            </div>
        </div>
    );
};
