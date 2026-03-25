import { useEffect, useState } from "react";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { motion, AnimatePresence } from "framer-motion";
import { getVersion } from "@tauri-apps/api/app";
import { Settings as SettingsIcon, Layout, Zap, Info, Shield, FolderClosed } from "lucide-react";
import "./App.css"
import AliasSettings from "./components/settings/Aliases";
import About from "./components/settings/About";

export default function Settings() {
    const [activeTab, setActiveTab] = useState("General");
    const [autoStart, setAutoStart] = useState(false);
    const [version, setVersion] = useState("");

    const tabs = [
        { id: "General", icon: <SettingsIcon size={16} /> },
        { id: "Aliases", icon: <FolderClosed size={16} /> },
        { id: "Appearance", icon: <Layout size={16} /> },
        { id: "Shortcuts", icon: <Zap size={16} /> },
        { id: "Privacy", icon: <Shield size={16} /> },
        { id: "About", icon: <Info size={16} /> },
    ];

    useEffect(() => {
        getVersion().then(setVersion);
        isEnabled().then(setAutoStart);
    }, []);

    const toggleAutostart = async () => {
        if (autoStart) await disable();
        else await enable();
        setAutoStart(await isEnabled());
    };

    return (
        <div className="h-screen w-screen flex glass select-none text-white overflow-hidden font-sans">

            <div 
                data-tauri-drag-region 
                className="absolute top-0 left-0 right-0 h-8 z-10" 
            />

            {/* --- SIDEBAR --- */}
            <aside className="w-56 border-r border-white/5 bg-black/20 flex flex-col p-6 pt-6">

                <header className="mb-10 px-2">
                    <span className="text-2xl font-black tracking-tighter uppercase gradient-text-animated">Aura</span>
                    <p className="text-[9px] font-mono tracking-widest opacity-40 uppercase">Settings</p>
                </header>

                <nav className="space-y-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group ${
                                activeTab === tab.id ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}
                        >
                            <span className={activeTab === tab.id ? 'text-blue-400' : 'group-hover:text-gray-300'}>
                                {tab.icon}
                            </span>
                            <span className="text-sm font-medium">{tab.id}</span>
                            {activeTab === tab.id && (
                                <motion.div layoutId="active-pill" className="ml-auto w-1 h-4 bg-blue-500 rounded-full" />
                            )}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Version Tag - Bottom Right */}
            <div className="absolute bottom-5 right-5 text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded-md text-gray-500 font-mono">
                v{version}
            </div>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 overflow-y-auto relative p-12 pt-16 custom-scrollbar">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <h1 className="text-2xl font-bold mb-8">{activeTab !== "About" && activeTab}</h1>

                        {activeTab === "General" && (
                            <div className="space-y-6">
                                <section>
                                    <h2 className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mb-4">Behavior</h2>
                                    <div className="flex items-center justify-between p-5 bg-white/3 rounded-2xl border border-white/10">
                                        <div>
                                            <p className="text-sm font-semibold">Launch on Startup</p>
                                            <p className="text-xs text-gray-500">Automatically start Aura when you log in.</p>
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

                                <section>
                                    <h2 className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mb-4">Search</h2>
                                    <div className="p-5 bg-white/3 rounded-2xl border border-white/10 opacity-50 cursor-not-allowed">
                                        <p className="text-sm font-semibold">Preferred Search Engine</p>
                                        <p className="text-xs text-gray-600">Google (Default)</p>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === "Aliases" && (
                            <AliasSettings />
                        )}
                        
                        {activeTab === "About" && (
                            <About />
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}