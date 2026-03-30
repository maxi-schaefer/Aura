import { getVersion } from "@tauri-apps/api/app"
import { useEffect, useState } from "react";
import { FooterTimer } from "./footer/FooterTimer";
import { motion, AnimatePresence } from "framer-motion";

interface FooterProps {
    results: number;
    selectedIndex: number;
    query: string;
    selectedType: string;
}

const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
        app: "Open Application",
        command: "Run Command",
        alias: "Open Alias",
        fallback: "Search Web",
        file: "Open File"
    };
    return labels[type.toLowerCase()] || "No Result";
}

export default function Footer({ results, selectedIndex, query, selectedType }: FooterProps) {
    const [version, setVersion] = useState("");

    useEffect(() => {
        getVersion().then(setVersion);
    }, []);

    return (
        <footer className="flex-none px-4 mt-2 py-2 border-t border-white/4 bg-white/1 flex items-center justify-between min-h-9">
            
            {/* Left: Metadata & Version */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 tabular-nums">
                    <span className="text-[10px] font-medium text-white/40">{selectedIndex + 1}</span>
                    <span className="text-[10px] text-white/10">/</span>
                    <span className="text-[10px] font-medium text-white/20">{results}</span>
                </div>

                <div className="w-[1px] h-2.5 bg-white/[0.06]" />
                
                <FooterTimer />
            </div>

            {/* Right: The "Action Pill" */}
            <div className="flex items-center gap-3">
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={selectedType}
                        initial={{ opacity: 0, y: 2 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -2 }}
                        className="flex items-center gap-2"
                    >
                        <span className="text-[11px] font-medium text-white/50 tracking-tight">
                            {getTypeLabel(selectedType)}
                        </span>
                        
                        <div className="flex items-center gap-0.5 group">
                            <kbd className="min-w-[18px] h-4.5 px-1 flex items-center justify-center rounded-[3px] bg-white/[0.08] border-b border-white/[0.12] text-[10px] text-white/60 font-sans shadow-sm group-hover:bg-white/[0.12] transition-colors">
                                ↵
                            </kbd>
                            <span className="text-[10px] text-white/20 font-medium ml-1">Enter</span>
                        </div>
                    </motion.div>
                </AnimatePresence>

                <div className="w-[1px] h-2.5 bg-white/[0.06]" />

                {/* Optional: Secondary Action hint (Raycast Style) */}
                <div className="flex items-center gap-1 opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
                    <span className="text-[9px] font-mono text-white/5 tracking-tighter hover:text-white/20 transition-colors cursor-default">
                        v{version}
                    </span>
                </div>
            </div>
        </footer>
    );
}