import { getVersion } from "@tauri-apps/api/app"
import { useEffect, useState } from "react";

interface FooterProps {
    results: number;
    selectedIndex: number;
    query: string;
}

export default function Footer({ results, selectedIndex, query }: FooterProps) {
    const [version, setVersion] = useState("");
    const isCommand = query.startsWith(">");
    const isAlias = query.startsWith("@");

    useEffect(() => {
        getVersion().then(setVersion);
    }, []);

    return (
        <div className="flex-none mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500 font-medium uppercase tracking-widest">
            {/* Left Side: Result Tracking */}
            <div className="flex items-center gap-2">
                <span className="text-white/40">
                    {results > 0 ? `${selectedIndex + 1} / ${results}` : "No"} Results
                </span>
            </div>

            {/* Right Side: Contextual Actions */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                    {/* Dynamic Label based on query type */}
                    <div className="flex gap-2 items-center">
                        <kbd className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-gray-400">ESC</kbd>
                        <span>Clear</span>
                    </div>
                    
                    <div className="w-px h-3 bg-white/10"/>
                    
                    <div className="flex gap-2 items-center">
                        <kbd className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10">↵</kbd>
                        <span className="text-gray-400">
                            {isCommand ? "Execute" : isAlias ? "Expand" : "Open"}
                        </span>
                    </div>
                </div>

                <div className="w-px h-4 bg-white/10"/>
                
                <span className="gradient-text-animated opacity-80">Aura v{version}</span>
            </div>
        </div>
    )
}