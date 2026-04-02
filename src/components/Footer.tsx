// components/Footer.tsx
import { getVersion } from "@tauri-apps/api/app"
import { useEffect, useState } from "react";
import { FooterTimer } from "./footer/FooterTimer";
import { motion, AnimatePresence } from "framer-motion";

interface FooterProps {
    results: number;
    selectedIndex: number;
    selectedType: string;
    isInfoOpen: boolean;
    activeCommand: string | null;
}

const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
        app: "Open Application",
        command: "Run Command",
        alias: "Open Alias",
        fallback: "Search Web",
        file: "Open File",
        calc: "Copy Result",
        color: "Copy Color"
    };
    return labels[type.toLowerCase()] || "Select";
}

export default function Footer({ results, selectedIndex, selectedType, isInfoOpen, activeCommand }: FooterProps) {
    const [version, setVersion] = useState("");
    const isFile = selectedType === "file";

    useEffect(() => {
        getVersion().then(setVersion);
    }, []);

    return (
        <footer className="flex-none px-4 py-2 border-t border-white/5 bg-white/[0.02] flex items-center justify-between min-h-[40px] select-none">
            
            {/* Left Side: Version & Status */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 tabular-nums">
                    <span className="text-[10px] font-bold text-fg/40">{selectedIndex + 1}</span>
                    <span className="text-[10px] text-fg/10 font-light">of</span>
                    <span className="text-[10px] font-bold text-fg/20">{results}</span>
                </div>
                
                <div className="w-px h-3 bg-white/5" />
                
                <div className="flex items-center gap-2">
                    <FooterTimer />
                    <span className="text-[9px] font-mono text-fg/10 tracking-wider uppercase">v{version}</span>
                </div>
            </div>

            {/* Right Side: Action Bar */}
            <div className="flex items-center gap-3">
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={`${selectedType}-${isInfoOpen}`}
                        initial={{ opacity: 0, x: 5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        className="flex items-center gap-4"
                    >
                        {/* Secondary Action: Info Toggle (Only if file) */}
                        {isFile && (
                             <div className="flex items-center gap-2 pr-3 border-r border-white/5">
                                <span className="text-[11px] font-medium text-fg/30 tracking-tight">
                                    {isInfoOpen ? "Hide Details" : "Show Details"}
                                </span>
                                <div className="flex items-center gap-1">
                                    <kbd className="h-4.5 px-1.5 flex items-center justify-center rounded-[3px] bg-white/5 border border-white/10 text-[9px] font-medium text-fg/40 shadow-sm">Ctrl</kbd>
                                    <kbd className="h-4.5 px-1.5 flex items-center justify-center rounded-[3px] bg-white/5 border border-white/10 text-[9px] font-medium text-fg/40 shadow-sm">K</kbd>
                                </div>
                             </div>
                        )}

                        {/* Primary Action */}
                        <div className="flex items-center gap-2 group cursor-pointer">
                            <span className="text-[11px] text-fg/60 tracking-tight group-hover:text-fg transition-colors">
                                {getTypeLabel(selectedType)}
                            </span>
                            <div className="flex items-center bg-white/10 rounded-sm p-0.5 px-1 border border-white/5 shadow-inner group-active:scale-95 transition-transform">
                                <span className="text-[10px] text-fg/70">↵</span>
                                <span className="text-[8px] ml-1 text-fg/30 uppercase tracking-tighter font-sans">Enter</span>
                            </div>
                        </div>
                        
                        {/* Primary Action */}
                        {activeCommand && (
                            <>
                                <div className="w-px h-3 bg-white/5" />

                                <div className="flex items-center gap-2 group cursor-pointer">
                                    <span className="text-[11px] text-fg/60 tracking-tight group-hover:text-fg transition-colors">
                                        Close Command
                                    </span>
                                    <div className="flex items-center bg-white/10 rounded-sm p-0.5 px-1 border border-white/5 shadow-inner group-active:scale-95 transition-transform">
                                        <span className="text-[10px] text-fg/70">↵</span>
                                        <span className="text-[8px] ml-1 text-fg/30 uppercase tracking-tighter font-sans">ESC</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </footer>
    );
}