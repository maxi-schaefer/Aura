import { Variants } from "framer-motion";
import { useState, useRef, useEffect, JSX } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app"

// Assets
import auraLogo from "../assets/icon.png";
import googleIcon from "../assets/engines/google.png";
import ddgIcon from "../assets/engines/duckduckgo.png";
import bingIcon from "../assets/engines/bing.png";
import yahooIcon from "../assets/engines/yahoo.png";
import braveIcon from "../assets/engines/brave.png";
import ecosiaIcon from "../assets/engines/ecosia.png";
import { THEMES, useTheme } from "../hooks/useTheme";
// 🔹 Import our new selector
import { WindowModeSelector } from "./commands/SettingsView"; 
import { ArrowLeft } from "lucide-react";

const ENGINES = [
    { id: "google", name: "Google", url: "https://google.com/search?q=", icon: googleIcon },
    { id: "duckduckgo", name: "DuckDuckGo", url: "https://duckduckgo.com/?q=", icon: ddgIcon },
    { id: "brave", name: "Brave", url: "https://search.brave.com/search?q=", icon: braveIcon },
    { id: "bing", name: "Bing", url: "https://www.bing.com/search?q=", icon: bingIcon },
    { id: "ecosia", name: "Ecosia", url: "https://www.ecosia.org/search?q=", icon: ecosiaIcon },
    { id: "yahoo", name: "Yahoo", url: "https://search.yahoo.com/search?p=", icon: yahooIcon },
];

const pageVariants: Variants = {
    initial: { opacity: 0, x: 10 },
    animate: { 
        opacity: 1, 
        x: 0, 
        transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } 
    },
    exit: { 
        opacity: 0, 
        x: -10, 
        transition: { duration: 0.2 } 
    },
};

export default function SetupScreen({ onComplete, config, setConfig }: any) {
    const [step, setStep] = useState(-1);
    const [version, setVersion] = useState("");
    const [username, setUsername] = useState("");
    const [selectedEngine, setSelectedEngine] = useState(ENGINES[0]);
    const inputRef = useRef<HTMLInputElement>(null);

    const { theme, changeTheme } = useTheme(config, setConfig);

    useEffect(() => {
        if (step === 0) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [step]);

    useEffect(() => {
        getVersion().then(setVersion);
    }, []);

    const handleBack = () => {
        if (step > -1) setStep(step - 1);
    };

    const handleFinalize = async () => {
        try {
            await invoke("save_config", { 
                config: { 
                    ...config, // 🔹 Preserve window_mode and other items
                    search_engine: selectedEngine.url, 
                    first_run_complete: true, 
                    username,
                    theme: theme || "default"
                } 
            });

            setStep(3);
            setTimeout(() => {
                setStep(4);
                setTimeout(onComplete, 1500);
            }, 2000);
        } catch (e) {
            console.error(e);
        }
    };

    const stepsContent: Record<number, JSX.Element> = {
        [-1]: (
            <motion.div key="intro" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center gap-6">
                <div className="h-16" />
                <h1 className="text-xl text-fg tracking-tight font-medium">Welcome to Aura</h1>
                <p className="text-sm text-fg/40 text-center max-w-80 leading-relaxed">
                    A minimal, keyboard-first command bar for your workflow.
                </p>
                <button
                    onClick={() => setStep(0)}
                    className="mt-4 px-8 py-3 bg-primary text-black text-xs rounded-full hover:bg-primary/80 transition-all cursor-pointer active:scale-95 shadow-lg"
                >
                    Get Started
                </button>
            </motion.div>
        ),
        0: (
            <motion.div key="name" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="size-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-fg/40 font-mono">1</div>
                    <h2 className="text-sm text-fg/90">Personalize your instance</h2>
                </div>
                <div className="relative group">
                    <input
                        ref={inputRef}
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && username.trim() && setStep(1)}
                        placeholder="Enter your name..."
                        className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-4 text-base text-fg outline-none focus:border-white/20 focus:bg-white/5 transition-all"
                    />
                </div>
                <button onClick={() => username.trim() && setStep(1)} className="cursor-pointer w-full py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-fg hover:bg-white/10 transition-colors">Continue</button>
            </motion.div>
        ),
        1: (
            <motion.div key="theme" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6 max-w-md mx-auto">
                <div className="flex items-center gap-3">
                    <div className="size-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-fg/40 font-mono">2</div>
                    <h2 className="text-sm text-fg/90 font-medium">Appearance & Layout</h2>
                </div>

                {/* 🔹 Window Mode Selector Integration */}
                <div className="rounded-xl border border-white/5 bg-white/2 overflow-hidden">
                    <WindowModeSelector 
                        value={config.window_mode || 'expanded'} 
                        onChange={(mode) => setConfig({ ...config, window_mode: mode })}
                    />
                </div>

                {/* 🔹 Modern 2-Column Theme Grid */}
                <div className="grid grid-cols-2 gap-2">
                    {THEMES.map((t) => (
                        <button
                            key={t.id}
                            onClick={(e) => changeTheme(t.id, e)}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-all cursor-pointer ${
                                theme === t.id ? "bg-white/10 border-white/20 shadow-md" : "bg-white/2 border-white/5 hover:bg-white/5"
                            }`}
                        >
                            <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: t.primary }}/>
                            <span className={`text-[12px] truncate ${theme === t.id ? "text-fg" : "text-fg/40"}`}>{t.label}</span>
                        </button>
                    ))}
                </div>

                <button 
                    onClick={() => setStep(2)} 
                    className="w-full py-3 bg-primary text-black  rounded-xl text-xs cursor-pointer active:scale-[0.98] transition-transform"
                >
                    Continue
                </button>
            </motion.div>
        ),
        2: (
            <motion.div key="config" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="size-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-fg/40 font-mono">3</div>
                    <h2 className="text-sm text-fg/90">Search Engine</h2>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {ENGINES.map((eng) => {
                        const isSelected = selectedEngine.id === eng.id;
                        return (
                            <button
                                key={eng.id}
                                onClick={() => setSelectedEngine(eng)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer
                                    ${isSelected ? "bg-white/10 border-white/20" : "bg-white/2 border-white/5 hover:bg-white/5"}
                                `}
                            >
                                <img src={eng.icon} className={`size-4 ${isSelected ? "opacity-100" : "opacity-30"}`} alt="" />
                                <span className={`text-[12px] ${isSelected ? "text-fg " : "text-fg/40"}`}>
                                    {eng.name}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={handleFinalize}
                    className="w-full py-3 cursor-pointer bg-primary text-foreground  rounded-xl text-xs active:scale-[0.98] transition-transform"
                >
                    Finalize Setup
                </button>
            </motion.div>
        ),
        3: (
            <motion.div key="init" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center py-10 space-y-4">
                <div className="relative size-12">
                   <div className="absolute inset-0 border-2 border-white/5 rounded-full" />
                   <motion.div 
                        className="absolute inset-0 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                   />
                </div>
                <div className="text-center">
                    <p className="text-sm text-fg/80">Initializing Aura...</p>
                    <p className="text-[11px] text-fg/30 mt-1">Setting up environment for {username}</p>
                </div>
            </motion.div>
        ),
        4: (
            <motion.div key="done" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center py-10 space-y-4">
                <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="size-16 rounded-full bg-green-500/10 flex items-center justify-center"
                >
                    <svg viewBox="0 0 24 24" className="size-8 text-green-400" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17L4 12" />
                    </svg>
                </motion.div>

                <div className="text-center">
                    <p className="text-lg text-fg/90 font-medium">You're all set 🎉</p>
                    <p className="text-sm text-fg/40 mt-1">Welcome to the future of your workflow.</p>
                </div>
            </motion.div>
        ),
    };

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center glass overflow-hidden font-sans relative px-8">
            <motion.div 
                layout
                className={`z-20 pointer-events-none flex items-center gap-3 ${
                    step === -1 ? "flex-col mb-4" : "absolute top-12 left-12"
                }`}
            >
                <img src={auraLogo} className={step === -1 ? "size-20" : "size-6 opacity-40"} />
                {step !== -1 && <span className="text-[10px] font-mono text-fg/20 uppercase tracking-widest">Setup</span>}
            </motion.div>

            <AnimatePresence>
                {step >= 0 && step < 3 && (
                    <motion.button
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        onClick={handleBack}
                        className="absolute top-12 right-12 z-30 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-fg/40 hover:text-fg hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer group"
                    >
                        <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
                        <span className="text-[10px] font-medium uppercase tracking-wider">Back</span>
                    </motion.button>
                )}
            </AnimatePresence>

            <div className="w-full max-w-100 z-10">
                <AnimatePresence mode="wait">
                    {stepsContent[step]}
                </AnimatePresence>
            </div>

            <div className="absolute bottom-6 w-full px-10 flex justify-between items-center opacity-20">
                <span className="text-[10px] font-mono text-fg tracking-tight italic">v{version}</span>
            </div>
        </div>
    );
}