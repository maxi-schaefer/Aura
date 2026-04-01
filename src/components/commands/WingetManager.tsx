import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Package, Search, Loader2, Check, Trash2, Globe } from "lucide-react";

export const WingetManager = ({ query }: { query: string }) => {
  const [packages, setPackages] = useState<any[]>([]);
  const [installed, setInstalled] = useState<any[]>([]);
  const [view, setView] = useState<"search" | "installed">("search");
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  // Load installed apps once on mount
  useEffect(() => {
    invoke("get_installed_winget").then((res: any) => setInstalled(res));
  }, []);

  // Search logic
  useEffect(() => {
    if (view !== "search") return;
    const search = async () => {
      if (query.length < 2) {
        setPackages([]);
        return;
      }
      setLoading(true);
      try {
        const results: any = await invoke("search_winget", { query });
        setPackages(results);
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query, view]);

  const filteredInstalled = useMemo(() => {
    if (!query) return installed;
    return installed.filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase()) || 
      p.id.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, installed]);

  const handleAction = async (pkg: any) => {
    setActionId(pkg.id);
    try {
      await invoke("install_package", { id: pkg.id });
      // Refresh installed list
      const fresh: any = await invoke("get_installed_winget");
      setInstalled(fresh);
    } catch (e) {
      console.error(e);
    } finally {
      setActionId(null);
    }
  };

  const list = view === "search" ? packages : filteredInstalled;

  return (
    <div className="flex flex-col h-[450px] w-full antialiased">
      {/* View Switcher */}
      <div className="flex gap-2 p-2 border-b border-white/5 bg-white/[0.02]">
        <button 
          onClick={() => setView("search")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'search' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
        >
          Discover
        </button>
        <button 
          onClick={() => setView("installed")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'installed' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
        >
          Installed ({installed.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {loading && (
          <div className="flex items-center justify-center py-10 opacity-30">
            <Loader2 className="animate-spin" size={20} />
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {list.map((pkg, index) => {
            const isInstalled = installed.some(p => p.id === pkg.id);
            
            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.03 }} // Faster staggered feel
                key={pkg.id + pkg.source} // Combined key to ensure uniqueness
                className="group flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.06] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center shadow-inner">
                    <Package size={18} className="text-white/60" />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-white/90 leading-none flex items-center gap-2">
                      {pkg.name}
                      {isInstalled && <Check size={12} className="text-emerald-400" />}
                    </div>
                    <div className="text-[11px] text-white/30 mt-1.5 font-mono flex items-center gap-2">
                      <span className="truncate max-w-[150px]">{pkg.id}</span>
                      <span className="opacity-50">•</span>
                      <span>v{pkg.version}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-[10px] uppercase tracking-tighter text-white/20 font-bold px-2 py-1 bg-white/5 rounded">
                    {pkg.source}
                  </div>
                  
                  <button
                    onClick={() => handleAction(pkg)}
                    disabled={actionId !== null || (isInstalled && view === 'search')}
                    className={`h-8 px-3 rounded-lg text-[11px] font-bold transition-all flex items-center gap-2 ${
                      isInstalled 
                        ? 'bg-emerald-500/10 text-emerald-400 cursor-default' 
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {actionId === pkg.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : isInstalled ? (
                      <Check size={12} />
                    ) : (
                      <Download size={12} />
                    )}
                    {isInstalled ? "Installed" : "Get"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {!loading && list.length === 0 && query.length >= 2 && (
          <div className="flex flex-col items-center justify-center py-20 text-white/20">
            <Search size={40} strokeWidth={1} />
            <p className="text-sm mt-4">No packages found for "{query}"</p>
          </div>
        )}
      </div>
      
      {/* Quick Footer Info */}
      <div className="p-2 px-4 border-t border-white/5 bg-black/20 flex justify-between items-center">
        <div className="flex items-center gap-2 text-[10px] text-white/40 font-medium">
           <Globe size={10} /> Syncing with Windows Package Manager
        </div>
      </div>
    </div>
  );
};