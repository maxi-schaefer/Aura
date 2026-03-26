import { getVersion } from "@tauri-apps/api/app"
import { useEffect, useState } from "react";

interface FooterProps {
    results: number;
    selectedIndex: number;
    query: string;
}

export default function Footer({ results, selectedIndex, query }: FooterProps) {
    const [version, setVersion] = useState("");
    
    // Logic to determine the primary action label
    const getActionLabel = () => {
        if (!query) return "Search";
        if (query.startsWith(">") || query.includes("password") || query.includes("hex")) return "Execute";
        if (query.startsWith("@")) return "Expand";
        return "Open";
    };

    useEffect(() => {
        getVersion().then(setVersion);
    }, []);

    return (
        <div className="flex-none mt-2 pt-3 border-t border-white/[0.03] flex items-center justify-between text-[10px] font-medium tracking-tight">
            
            {/* Left Side: Result Count */}
            <div className="flex items-center gap-3 text-white/20 uppercase tracking-widest font-bold text-[9px]">
                {results > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-white/40">{selectedIndex + 1}</span>
                        <span className="opacity-50">of</span>
                        <span className="text-white/40">{results}</span>
                        <span className="ml-1 opacity-50">Results</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-5">
                {/* Primary Action */}
                <div className="flex items-center gap-2 group cursor-default">
                    <span className="text-white/50 group-hover:text-white/80 transition-colors capitalize">{getActionLabel()}</span>
                    <kbd className="min-w-[18px] h-4 flex items-center justify-center rounded bg-white/10 border border-white/20 text-[10px] text-white/70 font-sans">↵</kbd>
                </div>

                <div className="w-[1px] h-3 bg-white/5" />

                {/* Version Tag */}
                <div className="hidden sm:block pl-2 text-white/10 hover:text-white/20 transition-colors cursor-default font-mono">
                    v{version}
                </div>
            </div>
        </div>
    )
}