import { motion } from "framer-motion";
import { FileText, Globe, Terminal, Hash, Info, Link as LinkIcon, Cpu } from "lucide-react";

interface InfoItemProps {
    label: string;
    value: string | number | undefined;
    icon?: React.ReactNode;
    color?: string;
}

const InfoRow = ({ label, value, icon, color }: InfoItemProps) => {
    if (!value) return null;
    return (
        <div className="flex items-center justify-between py-1.5 border-b border-white/2 last:border-0">
            <span className="text-[11px] text-white/30 font-medium">{label}</span>
            <div className="flex items-center gap-2 max-w-[65%] overflow-hidden">
                {icon && <span className="text-white/20 shrink-0">{icon}</span>}
                <span 
                    className={`text-[11px] truncate font-mono ${color ? color : 'text-white/70'}`}
                >
                    {value}
                </span>
            </div>
        </div>
    );
};

export const InfoPanel = ({ item }: { item: any }) => {
    if (!item) return null;

    const getFileExt = (path: string) => path.split('.').pop()?.toUpperCase() || 'FILE';
    
    // Clean up paths for display (e.g., C:\Users\Name\... -> ~\...)
    const displayPath = item.id?.replace(/^[A-Z]:\\Users\\[^\\]+/, '~');

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col w-full h-full bg-white/1 select-none"
        >
            {/* 1. Hero Section */}
            <div className="p-8 flex flex-col items-center text-center shrink-0 border-b border-white/5 bg-linear-to-b from-white/3 to-transparent">
                <div className="relative group mb-5">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
                    {item.icon ? (
                        <img src={item.icon} className="relative size-20 object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] rounded-xl" alt="" />
                    ) : (
                        <div className="relative size-20 rounded-2xl bg-white/5 flex items-center justify-center text-white/10 border border-white/10 shadow-inner">
                            <FileText size={40} strokeWidth={1.5} />
                        </div>
                    )}
                </div>
                
                <h2 className="text-white text-lg font-semibold tracking-tight leading-tight w-full px-4 wrap-break-word">
                    {item.title}
                </h2>
                <div className="mt-2 flex items-center gap-2">
                   <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/5 text-white/40 uppercase tracking-widest border border-white/5">
                        {item.type}
                   </span>
                </div>
            </div>

            {/* 2. Content Sections */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                
                {/* Properties Section */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-3">
                        <Info size={12} className="text-white/20" />
                        <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Properties</h3>
                    </div>
                    
                    <div className="bg-white/2 border border-white/5 rounded-lg px-3 py-1">
                        {item.type === "file" && (
                            <>
                                <InfoRow label="Extension" value={getFileExt(item.id)} icon={<Hash size={11} />} />
                                <InfoRow label="Kind" value={item.subtitle} />
                                <InfoRow label="Path" value={displayPath} />
                            </>
                        )}

                        {item.type === "app" && (
                            <>
                                <InfoRow label="Process" value={item.title + ".exe"} icon={<Cpu size={11} />} />
                                <InfoRow label="Source" value="Applications" color="text-secondary" />
                            </>
                        )}

                        {item.type === "alias" && (
                            <>
                                <InfoRow label="Protocol" value="HTTPS" icon={<Globe size={11} />} />
                                <InfoRow label="Shortcut" value={item.title} color="text-blue-400" />
                            </>
                        )}

                        {item.type === "command" && (
                            <>
                                <InfoRow label="Context" value="System" icon={<Terminal size={11} />} />
                                <InfoRow label="State" value="Ready" color="text-green-400" />
                            </>
                        )}
                    </div>
                </div>

                {/* Preview/Description Section */}
                {(item.type === "alias" || item.type === "command") && (
                    <div className="space-y-3">
                         <div className="flex items-center gap-2 mb-3">
                            <LinkIcon size={12} className="text-white/20" />
                            <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
                                {item.type === "alias" ? "Quick Link" : "Description"}
                            </h3>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                            <p className="text-[11px] text-white/50 leading-relaxed font-medium italic">
                                {item.subtitle}
                            </p>
                        </div>
                    </div>
                )}

                {/* Section: Shortcuts (Raycast Footer Style) */}
                <div className="pt-4 border-t border-white/5">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-lg bg-white/2 border border-white/5 flex flex-col gap-2">
                            <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">Action</span>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-white/40">Run</span>
                                <kbd className="px-1 py-0.5 rounded bg-white/10 text-white/60 text-[9px]">↵</kbd>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg bg-white/2 border border-white/5 flex flex-col gap-2">
                            <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">Panel</span>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-white/40">Close</span>
                                <div className="flex gap-1">
                                    <kbd className="px-1 py-0.5 rounded bg-white/10 text-white/60 text-[9px]">^</kbd>
                                    <kbd className="px-1 py-0.5 rounded bg-white/10 text-white/60 text-[9px]">K</kbd>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};