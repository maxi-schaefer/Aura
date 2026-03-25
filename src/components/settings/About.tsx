import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { motion } from "framer-motion";
import { handleLinkClick } from "../../lib/utils";

export default function About() {
    const [version, setVersion] = useState("");

    useEffect(() => {
        getVersion().then(setVersion);
    }, []);

    return (
        <div className="h-full flex flex-col justify-center items-center select-none">
            
            {/* The Logo: Just a high-contrast, bold letter */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="mb-8"
            >
                <div className="text-6xl font-black tracking-tighter text-white">
                    AURA
                </div>
                <div className="h-0.5 w-full bg-linear-to-r from-transparent via-blue-500 to-transparent mt-2 opacity-50" />
            </motion.div>

            {/* Core Info */}
            <div className="text-center space-y-1 mb-12">
                <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 font-light">
                    Minimalist System Utility
                </p>
                <p className="text-[9px] font-mono text-gray-600">
                    Build {version} // Stable
                </p>
            </div>

            {/* Navigation: Subtle underlines on hover */}
            <nav className="flex gap-8">
                {[{name: "GitHub", href: "https://github.com/maxi-schaefer/aura"}].map((item) => (
                    <p
                        key={item.href}
                        onClick={() => handleLinkClick(item.href)}
                        className="text-[11px] uppercase tracking-widest text-gray-500 hover:text-white transition-colors duration-300 relative group cursor-pointer"
                    >
                        {item.name}
                        <span className="absolute -bottom-1 left-0 w-0 h-px bg-blue-500 transition-all duration-300 group-hover:w-full" />
                    </p>
                ))}
            </nav>

            {/* Legal / Heartbeat at the very bottom */}
            <footer className="absolute bottom-12 text-[9px] text-gray-700 tracking-[0.2em] uppercase">
                &copy; 2026 maxi-schaefer
            </footer>
        </div>
    );
}