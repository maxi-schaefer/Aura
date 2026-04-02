import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Package, Loader2, Check, ArrowUpCircle, 
    Trash2, Upload, Download 
} from "lucide-react";

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
    const [isBatching, setIsBatching] = useState(false);

    useEffect(() => { refreshData(); }, []);

    const refreshData = async () => {
        const [inst, upd] = await Promise.all([
            invoke("get_installed_winget"),
            invoke("get_winget_updates")
        ]);
        setInstalled(inst as any[]);
        setUpdates(upd as any[]);
    };

    // Search Logic
    useEffect(() => {
        if (view !== "search") return;
        const search = async () => {
            if (query.length < 2) { setPackages([]); return; }
            setLoading(true);
            try {
                const results: any = await invoke("search_winget", { query });
                setPackages(results);
            } finally { setLoading(false); }
        };
        const timer = setTimeout(search, 300);
        return () => clearTimeout(timer);
    }, [query, view]);

    const list = useMemo(() => {
        if (view === "search") return packages;
        if (view === "updates") return updates;
        if (!query) return installed;
        return installed.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.id.toLowerCase().includes(query.toLowerCase())
        );
    }, [view, packages, updates, installed, query]);

    // Actions
    const handleAction = async (pkg: any) => {
        setActionId(pkg.id);
        try {
            await invoke("install_package", { id: pkg.id });
            await refreshData();
        } finally { setActionId(null); }
    };

    const handleUpdate = async (pkg: any) => {
        if (!confirm(`Update ${pkg.name} to version ${pkg.version}?`)) return;
        setActionId(pkg.id);
        try {
            await invoke("update_package", { id: pkg.id });
            await refreshData();
        } finally { setActionId(null); }
    }

    const handleUninstall = async (pkg: any) => {
        if (!confirm(`Uninstall ${pkg.name}?`)) return;
        setActionId(pkg.id);
        try {
            await invoke("uninstall_package", { id: pkg.id });
            await refreshData();
        } finally { setActionId(null); }
    };

    // Clean Slate: Export/Import
    const handleExport = async () => {
        try {
            await invoke("export_winget_setup", { packages: installed });
        } catch (e) { console.error("Export failed", e); }
    };

    const handleImport = async () => {
        try {
            const importedList: any[] = await invoke("import_winget_setup");
            const toInstall = importedList.filter(imp => 
                !installed.some(inst => inst.id === imp.id)
            );

            if (toInstall.length === 0) return alert("All apps already installed.");

            if (confirm(`Install ${toInstall.length} missing apps from setup?`)) {
                setIsBatching(true);
                for (const pkg of toInstall) {
                    setActionId(pkg.id);
                    try { await invoke("install_package", { id: pkg.id }); } 
                    catch (e) { console.error(e); }
                }
                setActionId(null);
                setIsBatching(false);
                refreshData();
            }
        } catch (e) { console.error("Import failed", e); }
    };

    return (
        <div className="flex flex-col h-125 w-full antialiased rounded-xl border border-white/5 bg-black/20 overflow-hidden">
            {/* Header / Nav */}
            <div className="flex items-center justify-between p-2 border-b border-white/5 bg-white/2">
                <div className="flex items-center gap-2">
                    <TabButton active={view === "search"} onClick={() => setView("search")}>Discover</TabButton>
                    <TabButton active={view === "installed"} onClick={() => setView("installed")}>
                        Installed <span className="opacity-40 ml-1">{installed.length}</span>
                    </TabButton>
                    <TabButton active={view === "updates"} onClick={() => setView("updates")}>
                        Updates {updates.length > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold">
                                {updates.length}
                            </span>
                        )}
                    </TabButton>
                </div>

                <div className="flex items-center gap-1 pr-1">
                    <button onClick={handleExport} title="Export Setup" className="p-2 rounded-lg hover:bg-white/5 text-fg/40 hover:text-fg transition-all">
                        <Upload size={14} />
                    </button>
                    <button onClick={handleImport} disabled={isBatching} title="Import Setup" className={`p-2 rounded-lg hover:bg-white/5 text-fg/40 hover:text-fg transition-all ${isBatching ? 'animate-pulse' : ''}`}>
                        <Download size={14} />
                    </button>
                </div>
            </div>

            {/* Batch Progress Bar */}
            {isBatching && (
                <div className="px-4 py-2 bg-orange-500/10 border-b border-orange-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Loader2 size={12} className="animate-spin text-orange-400" />
                        <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Processing Batch Setup...</span>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {loading && <div className="space-y-1">{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</div>}

                <AnimatePresence mode="popLayout">
                    {!loading && list.map((pkg) => {
                        const isInstalled = installed.some(p => p.id === pkg.id);
                        const hasUpdate = updates.some(p => p.id === pkg.id);
                        const isActing = actionId === pkg.id;

                        return (
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                key={pkg.id + view}
                                className="group flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 hover:bg-white/6 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-linear-to-br from-white/10 to-white/5 flex items-center justify-center">
                                        <Package size={18} className="text-fg/60" />
                                    </div>
                                    <div>
                                        <div className="text-[13px] font-medium text-fg/90 flex items-center gap-2">
                                            {pkg.name}
                                            {isInstalled && <Check size={12} className="text-emerald-400" />}
                                        </div>
                                        <div className="text-[11px] text-fg/30 font-mono">{pkg.id} • {pkg.version}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {hasUpdate && view !== "updates" && (
                                        <button onClick={() => handleUpdate(pkg)} disabled={isActing} className="h-8 px-3 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 text-[11px] font-medium flex items-center gap-2">
                                            <ArrowUpCircle size={10} /> Update available
                                        </button>
                                    )}

                                    {isInstalled && (
                                        <button 
                                            onClick={() => handleUninstall(pkg)}
                                            disabled={!!actionId}
                                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all disabled:hidden"
                                        >
                                            {isActing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleAction(pkg)}
                                        disabled={isInstalled && view !== "updates"}
                                        className={`h-8 px-3 rounded-lg text-[11px] font-medium transition-all flex items-center gap-2 ${
                                            view === "updates" ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                                            : isInstalled ? "bg-emerald-500/10 text-emerald-500/50 cursor-default"
                                            : "bg-white/10 hover:bg-white/20 text-fg"
                                        }`}
                                    >
                                        {isActing && view !== "installed" ? <Loader2 size={12} className="animate-spin" /> 
                                         : view === "updates" ? "Update" 
                                         : isInstalled ? "Installed" : "Install"}
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
};

const TabButton = ({ children, active, onClick }: any) => (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${active ? "bg-white/10 text-fg" : "text-fg/40 hover:text-fg/60"}`}>
        {children}
    </button>
);