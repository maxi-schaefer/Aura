import { Variants } from "framer-motion";
import { useState, useRef, useEffect, JSX } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";

// Assets
import auraLogo from "../assets/icon.png";
import googleIcon from "../assets/engines/google.png";
import ddgIcon from "../assets/engines/duckduckgo.png";
import bingIcon from "../assets/engines/bing.png";
import yahooIcon from "../assets/engines/yahoo.png";
import braveIcon from "../assets/engines/brave.png";
import ecosiaIcon from "../assets/engines/ecosia.png";
import { useTheme } from "../hooks/useTheme";

const ENGINES = [
    { id: "google", name: "Google", url: "https://google.com/search?q=", icon: googleIcon },
    { id: "duckduckgo", name: "DuckDuckGo", url: "https://duckduckgo.com/?q=", icon: ddgIcon },
    { id: "brave", name: "Brave", url: "https://search.brave.com/search?q=", icon: braveIcon },
    { id: "bing", name: "Bing", url: "https://www.bing.com/search?q=", icon: bingIcon },
    { id: "ecosia", name: "Ecosia", url: "https://www.ecosia.org/search?q=", icon: ecosiaIcon },
    { id: "yahoo", name: "Yahoo", url: "https://search.yahoo.com/search?p=", icon: yahooIcon },
];

const THEMES_AVAILABLE = [
    { id: "default", name: "Aura Dark" },
    { id: "gruvbox", name: "Gruvbox Retro" },
    { id: "catppuccin", name: "Catppuccin Mocha" }
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
    const [username, setUsername] = useState("");
    const [selectedEngine, setSelectedEngine] = useState(ENGINES[0]);
    const inputRef = useRef<HTMLInputElement>(null);

    const { theme, changeTheme } = useTheme(config, setConfig);

    useEffect(() => {
        if (step === 0) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [step]);

    const handleFinalize = async () => {
        try {
            await invoke("save_config", { 
                config: { 
                    search_engine: selectedEngine.url, 
                    first_run_complete: true, 
                    username,
                    theme: theme || "default"
                } 
            });
            setTimeout(onComplete, 1500);
        } catch (e) {
            console.error(e);
        }
    };

    const stepsContent: Record<number, JSX.Element> = {
        [-1]: (
            <motion.div key="intro" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center gap-6">
                <div className="h-16" />
                <h1 className="text-xl  text-fg tracking-tight">Welcome to Aura</h1>
                <p className="text-sm text-fg/40 text-center max-w-80 leading-relaxed">
                    A minimal, keyboard-first command bar for your workflow.
                </p>
                <button
                    onClick={() => setStep(0)}
                    className="mt-4 px-6 py-2.5 bg-white text-black text-xs  rounded-md hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                    Get Started
                </button>
            </motion.div>
        ),
        0: (
            <motion.div key="name" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="size-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-fg/40 font-mono">1</div>
                    <h2 className="text-sm  text-fg/90">Personalize your instance</h2>
                </div>
                <div className="relative group">
                    <input
                        ref={inputRef}
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && username.trim() && setStep(1)}
                        placeholder="Enter your name..."
                        className="w-full bg-white/3 border border-white/10 rounded-lg px-4 py-3 text-base text-fg outline-none focus:border-white/20 focus:bg-white/5 transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-focus-within:opacity-100 transition-opacity">
                        <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[9px] text-fg/40 font-sans">Enter</kbd>
                    </div>
                </div>
            </motion.div>
        ),
        1: (
            <motion.div key="theme" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-5">
                 <div className="flex items-center gap-3">
                    <div className="size-6 rounded-md bg-fg/5 border border-fg/10 flex items-center justify-center text-[10px] text-fg/40 font-mono">2</div>
                    <h2 className="text-sm text-fg/90">Appearance</h2>
                </div>
                <div className="grid grid-cols-1 gap-2">
                    {THEMES_AVAILABLE.map((t) => (
                        <button
                            key={t.id}
                            onClick={(e) => changeTheme(t.id, e)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                                theme === t.id ? "bg-fg/10 border-fg/20" : "bg-fg/2 border-fg/5 hover:bg-fg/5"
                            }`}
                        >
                            <span className={`text-sm ${theme === t.id ? "text-fg" : "text-fg/40"}`}>{t.name}</span>
                            {theme === t.id && <div className="size-1.5 rounded-full bg-fg shadow-[0_0_8px_var(--fg)]" />}
                        </button>
                    ))}
                </div>
                <button onClick={() => setStep(2)} className="w-full py-3 bg-fg text-bg rounded-lg text-xs cursor-pointer">Continue</button>
            </motion.div>
        ),
        2: (
            <motion.div key="config" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="size-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-fg/40 font-mono">2</div>
                    <h2 className="text-sm  text-fg/90">Choose Search Engine</h2>
                </div>

                <div className="bg-white/2 border border-white/5 rounded-lg overflow-hidden">
                    {ENGINES.map((eng) => {
                        const isSelected = selectedEngine.id === eng.id;
                        return (
                            <button
                                key={eng.id}
                                onClick={() => setSelectedEngine(eng)}
                                className={`w-full cursor-pointer flex items-center justify-between px-4 py-3 transition-colors group
                                    ${isSelected ? "bg-white/10" : "hover:bg-white/5"}
                                    ${eng.id !== ENGINES[ENGINES.length - 1].id ? "border-b border-white/2" : ""}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <img src={eng.icon} className={`size-4 ${isSelected ? "opacity-100" : "opacity-30 group-hover:opacity-60"}`} alt="" />
                                    <span className={`text-sm ${isSelected ? "text-fg " : "text-fg/40"}`}>
                                        {eng.name}
                                    </span>
                                </div>
                                {isSelected && (
                                    <motion.div layoutId="check" className="size-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                                )}
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={() => { setStep(3); handleFinalize(); }}
                    className="w-full flex items-center justify-center py-3 bg-white/5 cursor-pointer border border-white/10 text-fg rounded-lg hover:bg-white/10 transition-all active:scale-[0.98] text-xs "
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
                    <p className="text-sm  text-fg/80">Initializing Aura...</p>
                    <p className="text-[11px] text-fg/30 mt-1">Setting up environment for {username}</p>
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
                <img src={auraLogo} className={step === -1 ? "size-16" : "size-5 opacity-40"} />
                {step !== -1 && <span className="text-[10px] font-mono text-fg/20 uppercase tracking-widest">Setup</span>}
            </motion.div>

            <div className="w-full max-w-90 z-10">
                <AnimatePresence mode="wait">
                    {stepsContent[step]}
                </AnimatePresence>
            </div>

            {/* Footer hints */}
            <div className="absolute bottom-6 w-full px-10 flex justify-between items-center opacity-20">
                <span className="text-[10px] font-mono text-fg tracking-tight italic">v0.2.6</span>
                <div className="flex gap-4">
                    <span className="text-[9px] text-fg uppercase tracking-tighter">ESC to Quit</span>
                    <span className="text-[9px] text-fg uppercase tracking-tighter">Enter to Select</span>
                </div>
            </div>
        </div>
    );
}