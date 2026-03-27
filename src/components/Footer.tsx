import { getVersion } from "@tauri-apps/api/app"
import { useEffect, useState } from "react";
import { FooterTimer } from "./footer/FooterTimer";

interface FooterProps {
    results: number;
    selectedIndex: number;
    query: string;
}

export default function Footer({ results, selectedIndex, query }: FooterProps) {
    const [version, setVersion] = useState("");

    useEffect(() => {
        getVersion().then(setVersion);
    }, []);

    return (
        <div className="flex-none mt-2 pt-3 border-t border-white/3 flex items-center justify-between">
            
            {/* Left Section: Status & Results */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-white/20 uppercase tracking-[0.15em] font-black text-[8px]">
                    {results > 0 && (
                        <>
                            <span className="text-white">{selectedIndex + 1}</span>
                            <span className="opacity-50">/</span>
                            <span className="text-white/60">{results}</span>
                        </>
                    )}
                </div>
                
                {/* The Timer sits quietly here on the left */}
                <FooterTimer />
            </div>

            {/* Right Section: Actions & Meta */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-white/30 text-[10px] font-semibold">
                    <span className="capitalize tracking-tight">
                        {query ? "Execute" : "Search"}
                    </span>
                    <kbd className="h-4 px-1 flex items-center justify-center rounded bg-white/[0.05] border border-white/10 text-[9px] font-sans text-white/40">
                        ↵
                    </kbd>
                </div>

                <div className="w-[1px] h-3 bg-white/5" />

                <div className="text-white/[0.06] font-mono text-[9px] tracking-tighter">
                    v{version}
                </div>
            </div>
        </div>
    );
}