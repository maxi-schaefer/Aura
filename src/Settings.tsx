import { useEffect, useState } from "react";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { motion } from "framer-motion";
import "./App.css";
import { getVersion } from "@tauri-apps/api/app";

export default function Settings() {
    const [autoStart, setAutoStart] = useState(false);
    const [version, setVersion] = useState("");

    useEffect(() => {
        getVersion().then((res) => setVersion(res));
    }, []);

    useEffect(() => {
        isEnabled().then(setAutoStart);
    }, []);

    const toggleAutostart = async () => {
        if (autoStart) await disable();
        else await enable();
        setAutoStart(await isEnabled());
    };

    return (
        <div data-tauri-drag-region className="h-screen w-screen bg-black/75 text-white select-none p-8 font-sans overflow-hidden relative">
            
            {/* Background Glow - Subtle branding */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />
            
            {/* Header */}
            <header className="flex flex-col mb-12 relative z-10">
                <span className="text-2xl font-black tracking-tighter uppercase leading-none gradient-text-animated">Aura</span>
                <span className="text-[9px] font-mono tracking-[0.2em] uppercase opacity-80">System Settings</span>
            </header>

            {/* Version Tag - Bottom Right */}
            <div className="absolute bottom-5 right-5 text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded-md text-gray-500 font-mono">
                v{version}
            </div>

            {/* Main Settings */}
            <main className="space-y-8 relative z-10">

                {/* Behavior Section */}
                <section>
                    <h2 className="text-[11px] uppercase tracking-[0.3em] text-gray-500 mb-4 ml-1">Behavior</h2>
                    
                    <div className="flex items-center justify-between p-5 bg-white/[0.03] hover:bg-white/[0.05] rounded-2xl border border-white/10 transition-all duration-300">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-white/90">Launch on Startup</span>
                            <span className="text-xs text-gray-500">Aura starts automatically with Windows.</span>
                        </div>
                        
                        <button 
                            onClick={toggleAutostart}
                            className={`w-10 h-6 cursor-pointer rounded-full relative transition-all duration-500 ${autoStart ? 'bg-blue-500' : 'bg-white/10'}`}
                        >
                            <motion.div 
                                layout
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-xl ${autoStart ? 'right-1' : 'left-1'}`}
                                />
                        </button>
                    </div>
                </section>

                {/* Miscellanious Section */}
                <section>
                    <h2 className="text-[11px] uppercase tracking-[0.3em] text-gray-500 mb-4 ml-1">Misc</h2>
                    <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5 flex justify-between items-center group">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-white/40">Global Hotkey</span>
                            <span className="text-xs text-gray-600 italic">Customization coming soon</span>
                        </div>
                        <div className="flex gap-1">
                            <kbd className="text-[10px] bg-white/10 px-2 py-1 rounded border border-white/10 text-gray-400 font-sans">Alt</kbd>
                            <span className="text-gray-600">+</span>
                            <kbd className="text-[10px] bg-white/10 px-2 py-1 rounded border border-white/10 text-gray-400 font-sans">Space</kbd>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}