import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Package, Loader2, Check, ArrowUpCircle, Trash2, Upload, Download 
} from "lucide-react";
import { listen } from "@tauri-apps/api/event";

const SkeletonRow = () => (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/5 animate-pulse">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/5" />
            <div className="space-y-2">
                <div className="h-3 w-24 bg-white/10 rounded" />
                <div className="h-2 w-32 bg-white/5 rounded" />
            </div>
        </div>
        <div className="h-8 w-16 bg-white/5 rounded-lg" />
    </div>
);

export const WingetManager = ({ query }: { query: string }) => {
    const [packages, setPackages] = useState<any[]>([]);
    const [installed, setInstalled] = useState<any[]>([]);
    const [updates, setUpdates] = useState<any[]>([]);
    const [view, setView] = useState<"search" | "installed" | "updates">("search");
    const [loading, setLoading] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);
    const [progressMap, setProgressMap] = useState<Record<string, { status: string, progress: number }>>({});

    useEffect(() => { refreshData(); }, []);

    useEffect(() => { if (view !== "search") setPackages([]); }, [view]);

    useEffect(() => {
        const unlisten = listen("winget-progress", (event: any) => {
            const { id, status, progress } = event.payload;
            setProgressMap(prev => ({ ...prev, [id]: { status, progress } }));
        });
        return () => { unlisten.then(f => f()); };
    }, []);

    const refreshData = async () => {
        try {
            const [inst, upd] = await Promise.all([
                invoke("get_installed_winget"),
                invoke("get_winget_updates")
            ]);
            setInstalled(inst as any[]);
            setUpdates(upd as any[]);
        } catch (e) { console.error("Refresh failed", e); }
    };

    // Search logic
    useEffect(() => {
        if (view !== "search") return;
        if (query.trim().length < 2) { setPackages([]); return; }
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const results: any = await invoke("search_winget", { query });
                setPackages(results);
            } finally { setLoading(false); }
        }, 400);
        return () => clearTimeout(timer);
    }, [query, view]);

    // Filter list based on view
    const list = useMemo(() => {
        switch (view) {
            case "search": return packages;
            case "updates": return updates;
            case "installed":
                if (!query) return installed;
                const q = query.toLowerCase();
                return installed.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
            default: return [];
        }
    }, [view, packages, updates, installed, query]);

    // Deduplicate
    const dedupedList = useMemo(() => {
        const seen = new Set<string>();
        return list.filter(pkg => {
            const uid = `${pkg.id}-${pkg.version}-${pkg.source}`;
            if (seen.has(uid)) return false;
            seen.add(uid);
            return true;
        });
    }, [list]);

    // Actions
    const handleAction = async (pkg: any) => {
        if (actionId) return;
        setActionId(pkg.id);
        try {
            await invoke("install_package", { id: pkg.id });
            setTimeout(() => {
                setProgressMap(prev => { const n = { ...prev }; delete n[pkg.id]; return n; });
                refreshData();
            }, 1500);
        } catch (e) { console.error(e); } finally { setActionId(null); }
    };

    const handleUpdate = async (pkg: any) => {
        setActionId(pkg.id);
        try { await invoke("update_package", { id: pkg.id }); refreshData(); }
        finally { setActionId(null); }
    };

    const handleUninstall = async (pkg: any) => {
        if (!confirm(`Uninstall ${pkg.name}?`)) return;
        setActionId(pkg.id);
        try { await invoke("uninstall_package", { id: pkg.id }); refreshData(); }
        finally { setActionId(null); }
    };

    const handleExport = async () => {
        await invoke("export_winget_setup", { packages: installed });
    };

    const handleImport = async () => {
        const imported: any = await invoke("import_winget_setup");
        setPackages(imported);
        setView("search");
    };

    const renderPackageActions = (pkg: any) => {
        const isInstalled = installed.some(p => p.id === pkg.id);
        const hasUpdate = updates.some(p => p.id === pkg.id);
        const isActing = actionId === pkg.id;
        const progressData = progressMap[pkg.id];

        if (isActing && progressData) {
            return (
                <div className="flex flex-col items-end gap-1 min-w-30">
                    <div className="flex items-center gap-2">
                        <motion.span 
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="text-[10px] font-bold text-orange-400 uppercase"
                        >
                            {progressData.status}
                        </motion.span>
                        <span className="text-[10px] font-mono text-fg/50">{progressData.progress}%</span>
                    </div>
                    <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progressData.progress}%` }}
                            className="h-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]"
                        />
                    </div>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-2">
                {hasUpdate && view !== "updates" && (
                    <button onClick={() => handleUpdate(pkg)} className="cursor-pointer h-8 px-3 rounded-lg bg-orange-500/20 text-orange-400 text-[11px] font-medium flex items-center gap-2">
                        <ArrowUpCircle size={10} /> Update
                    </button>
                )}
                {isInstalled && (
                    <button onClick={() => handleUninstall(pkg)}
                        className=" cursor-pointer h-8 w-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20">
                        <Trash2 size={14} />
                    </button>
                )}
                <button onClick={() => view === "updates" ? handleUpdate(pkg) : handleAction(pkg)}
                    disabled={isInstalled && view !== "updates"}
                    className={`cursor-pointer h-8 px-3 rounded-lg text-[11px] font-medium transition-all ${isInstalled ? "bg-emerald-500/10 text-emerald-500/50" : "bg-white/10 hover:bg-white/20"}`}>
                    {isActing ? <Loader2 size={12} className="animate-spin" /> : isInstalled ? "Installed" : "Install"}
                </button>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-125 w-full antialiased rounded-xl border border-white/5 bg-black/20 overflow-hidden">
            {/* Nav */}
            <div className="flex items-center justify-between p-2 border-b border-white/5 bg-white/2">
                <div className="flex items-center gap-2">
                    <TabButton active={view === "search"} onClick={() => setView("search")}>Discover</TabButton>
                    <TabButton active={view === "installed"} onClick={() => setView("installed")}>
                        Installed <span className="opacity-40 ml-1">{installed.length}</span>
                    </TabButton>
                    <TabButton active={view === "updates"} onClick={() => setView("updates")}>
                        Updates {updates.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold">{updates.length}</span>}
                    </TabButton>
                </div>
                <div className="flex gap-2">
                    <button about="Download" onClick={handleExport} className="cursor-pointer p-1 rounded-lg bg-white/10 hover:bg-white/20"><Download size={16} /></button>
                    <button about="Upload" onClick={handleImport} className="cursor-pointer p-1 rounded-lg bg-white/10 hover:bg-white/20"><Upload size={16} /></button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {loading ? (
                    <div className="space-y-1">{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</div>
                ) : dedupedList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-fg/20 space-y-2">
                        <Package size={32} strokeWidth={1} />
                        <span className="text-xs font-medium">No packages found</span>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {dedupedList.map((pkg, index) => {
                            const key = `${pkg.id}-${pkg.version}-${pkg.source}-${index}`;
                            const isInstalled = installed.some(p => p.id === pkg.id);
                            const hasUpdate = updates.some(p => p.id === pkg.id);
                            return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    key={key}
                                    className="group flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 hover:bg-white/6 transition-all"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-linear-to-br from-white/10 to-white/5 flex items-center justify-center">
                                            <Package size={18} className="text-fg/60" />
                                        </div>
                                        <div className="flex flex-col md:flex-row md:items-center gap-4 text-[11px] text-fg/30 font-mono">
                                            <div className="font-medium text-fg/90 flex items-center gap-1">{pkg.name} {isInstalled && <Check size={12} className="text-emerald-400" />}</div>
                                            <div>ID: {pkg.id}</div>
                                            <div>Version: {pkg.version}</div>
                                            <div>Source: {pkg.source}</div>
                                            {hasUpdate && <div className="text-orange-400 font-bold">Update Available</div>}
                                        </div>
                                    </div>
                                    {renderPackageActions(pkg)}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

const TabButton = ({ children, active, onClick }: any) => (
    <button onClick={onClick} className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${active ? "bg-white/10 text-fg" : "text-fg/40 hover:text-fg/60"}`}>
        {children}
    </button>
);