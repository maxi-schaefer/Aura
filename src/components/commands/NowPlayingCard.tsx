import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";

export const NowPlayingCard = () => {
    const [media, setMedia] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchMedia = async () => {
        try {
            const res = await invoke("get_now_playing");
            setMedia(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMedia();
        const interval = setInterval(fetchMedia, 2000); // Polling for metadata changes
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-6 text-white/20 animate-pulse font-medium">Syncing with System Media...</div>;
    
    if (!media) return (
        <div className="mt-2 mx-4 p-8 rounded-4xl border border-white/5 bg-white/[0.02] text-white/30 text-center italic">
            No active media session found
        </div>
    );

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden mt-2 mx-4 p-6 rounded-4xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] group"
            style={{ background: "rgba(255, 255, 255, 0.01)" }}
        >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 blur-[80px] pointer-events-none" />

            <div className="relative z-10 flex gap-6 items-center">
                {/* Album Art Container */}
                <div className="relative shrink-0">
                    <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-white/5"
                    >
                        {media.thumbnail ? (
                            <img src={media.thumbnail} alt="Cover" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl">🎵</div>
                        )}
                    </motion.div>
                    
                    {/* Pulsing "Live" Indicator */}
                    {media.is_playing && (
                        <div className="absolute -top-2 -right-2 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-500"></span>
                        </div>
                    )}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 opacity-80">
                            {media.is_playing ? "Now Playing" : "Paused"}
                        </span>
                    </div>
                    
                    <h3 className="text-2xl font-black text-white tracking-tighter truncate leading-tight">
                        {media.title || "Unknown Track"}
                    </h3>
                    <p className="text-base font-medium text-white/50 truncate">
                        {media.artist || "Unknown Artist"}
                    </p>
                    
                    {media.album && (
                        <p className="text-[10px] font-bold text-white/20 uppercase mt-1 truncate">
                            {media.album}
                        </p>
                    )}
                </div>
            </div>

            {/* Subtle Progress Track */}
            <div className="mt-6 relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: media.is_playing ? "0%" : "-100%" }}
                    transition={{ duration: 1, ease: "circOut" }}
                    className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                />
            </div>
        </motion.div>
    );
};