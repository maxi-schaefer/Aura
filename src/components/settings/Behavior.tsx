import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function BehaviorSettings() {
    const [autoStart, setAutoStart] = useState(false);

    useEffect(() => {
        isEnabled().then(setAutoStart);
    }, [])
    
    const toggleAutostart = async () => {
        if (autoStart) await disable();
        else await enable();
        setAutoStart(await isEnabled());
    };

    return (
        <section>
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mt-0.5">Behavior</h2>
            <div className="flex items-center justify-between px-4 py-3 bg-white/3 rounded-2xl border border-white/10 group hover:bg-white/6 hover:border-white/20 transition-colors">
                <div>
                    <p className="text-sm text-white/70 group-hover:text-white transition-colors">Launch on Startup</p>
                </div>
                <button 
                    onClick={toggleAutostart}
                    className={`cursor-pointer w-10 h-6 rounded-full relative transition-all duration-500 ${autoStart ? 'bg-blue-600' : 'bg-white/10'}`}
                >
                    <motion.div 
                        animate={{ x: autoStart ? 18 : 4 }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg" 
                    />
                </button>
            </div>
        </section>
    )
}