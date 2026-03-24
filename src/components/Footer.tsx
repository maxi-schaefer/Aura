import { getVersion } from "@tauri-apps/api/app"
import { useEffect, useState } from "react";

export default function Footer({ results }: { results: number }) {
    const [version, setVersion] = useState("");

    useEffect(() => {
        getVersion().then((res) => setVersion(res));
    }, []);

    return (
        <div className="flex-none mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500 font-medium uppercase tracking-widest">
            <span>{results} Results</span>
            <div className="flex items-center gap-3">
                <span className="text-gray-400">Open ↵</span>
                <div className="w-px h-4 bg-white/5"/>
                <span className="gradient-text">Aura v{version}</span>
            </div>
        </div>
    )
}