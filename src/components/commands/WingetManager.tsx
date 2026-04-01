import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
// Added Trash2 icon
import { Package, Loader2, Check, ArrowUpCircle, Trash2 } from "lucide-react";

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

    useEffect(() => { refreshData(); }, []);

    const refreshData = async () => {
        const [inst, upd] = await Promise.all([
            invoke("get_installed_winget"),
            invoke("get_winget_updates")
        ]);
        setInstalled(inst as any[]);
        setUpdates(upd as any[]);
    };

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

    const handleAction = async (pkg: any) => {
        setActionId(pkg.id);
        try {
            await invoke("install_package", { id: pkg.id });
            await refreshData();
        } finally { setActionId(null); }
    };

    // New Uninstall Logic
    const handleUninstall = async (pkg: any) => {
        setActionId(pkg.id);
        try {
            await invoke("uninstall_package", { id: pkg.id });
            await refreshData();
        } finally { setActionId(null); }
    };

    return (
        <div className="flex flex-col h-125 w-full antialiased rounded-xl border border-white/5 overflow-hidden">
            <div className="flex items-center gap-2 p-2 border-b border-white/5 bg-white/2">
                <TabButton active={view === "search"} onClick={() => setView("search")}>Discover</TabButton>
                <TabButton active={view === "installed"} onClick={() => setView("installed")}>
                    Installed <span className="opacity-40 ml-1">{installed.length}</span>
                </TabButton>
                <TabButton active={view === "updates"} onClick={() => setView("updates")}>
                    Updates {updates.length > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px]">{updates.length}</span>
                    )}
                </TabButton>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {loading && <div className="space-y-1">{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</div>}

                <AnimatePresence mode="popLayout">
                    {!loading && list.map((pkg, index) => {
                        const isInstalled = installed.some(p => p.id === pkg.id);
                        const hasUpdate = updates.some(p => p.id === pkg.id);

                        return (
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                key={pkg.id + pkg.source + view + index}
                                className="group flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 hover:bg-white/6 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-linear-to-br from-white/10 to-white/5 flex items-center justify-center">
                                        <Package size={18} className="text-white/60" />
                                    </div>
                                    <div>
                                        <div className="text-[13px] font-medium text-white/90 flex items-center gap-2">
                                            {pkg.name}
                                            {isInstalled && <Check size={12} className="text-emerald-400" />}
                                        </div>
                                        <div className="text-[11px] text-white/30 font-mono">{pkg.id} • {pkg.version}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {hasUpdate && view !== "updates" && (
                                        <div className="flex items-center gap-1 px-2 py-1 rounded bg-orange-500/10 text-orange-400 text-[10px] font-bold">
                                            <ArrowUpCircle size={10} /> Update available
                                        </div>
                                    )}

                                    {/* TRASH BUTTON - Only shows for installed apps on hover */}
                                    {isInstalled && (
                                        <button 
                                            onClick={() => handleUninstall(pkg)}
                                            disabled={actionId !== null}
                                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all disabled:opacity-30"
                                        >
                                            {actionId === pkg.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleAction(pkg)}
                                        disabled={isInstalled && view !== "updates"}
                                        className={`h-8 px-3 rounded-lg text-[11px] transition-all flex items-center gap-2 ${
                                            view === "updates" ? "bg-orange-400/30 text-orange-400 hover:bg-orange-400/40"
                                            : isInstalled ? "bg-green-500/10 text-green-500/50 cursor-default"
                                            : "bg-white/10 hover:bg-white/20 text-white"
                                        }`}
                                    >
                                        {actionId === pkg.id && view !== "installed" ? <Loader2 size={12} className="animate-spin" /> 
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
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${active ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}>
        {children}
    </button>
);