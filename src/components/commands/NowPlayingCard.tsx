import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";

export interface MediaInfo {
    title: string;
    artist: string;
    album: string;
    thumbnail: string | null;
    is_playing: boolean;
    position: number;
    duration: number;
    source: string;
}

export const NowPlayingCard = () => {
    const [media, setMedia] = useState<MediaInfo | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchMedia = async () => {
        try {
            const res = await invoke<MediaInfo | null>("get_now_playing");
            setMedia(res);
        } catch (error) { console.error(error); }
        finally { if (loading) setLoading(false); }
    };

    const sendCommand = async (action: string) => {
        await invoke("media_command", { action });
        setTimeout(fetchMedia, 100); // Quick refresh after command
    };

    useEffect(() => {
        fetchMedia();
        const interval = setInterval(fetchMedia, 1000); // 1s for smoother progress
        return () => clearInterval(interval);
    }, []);

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) return <div className="p-4 ml-4 text-white/20 animate-pulse font-medium">Connecting...</div>;

    const progressPercent = media ? (media.position / media.duration) * 100 : 0;

    return (
        <div className="px-4 py-2 w-full mx-auto">

            <AnimatePresence mode="wait">
                {!media ? (
                    <motion.div key="none" className="p-12 rounded-4xl border border-white/10 text-center">
                        <span className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">System Idle</span>
                    </motion.div>
                ) : (
                    <motion.div
                        key={media.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative overflow-hidden mt-2 px-6 py-8 rounded-4xl border border-white/20"
                    >
                        <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center">
                            <motion.div
                                animate={{ x: ["0%", "-50%"] }}
                                transition={{ 
                                    repeat: Infinity, 
                                    duration: 30, // Increase for slower, more "premium" feel
                                    ease: "linear" 
                                }}
                                className="flex whitespace-nowrap"
                            >
                                {/* Render twice for the infinite loop effect */}
                                <span className="text-[14rem] font-black text-white/2.5 uppercase tracking-tighter pr-20">
                                    {media?.title || "No Media"}
                                </span>
                                <span className="text-[14rem] font-black text-white/2.5 uppercase tracking-tighter pr-20">
                                    {media?.title || "No Media"}
                                </span>
                            </motion.div>
                        </div>

                        {/* Blurred Thumbnail Background */}
                        <div className="absolute inset-0 blur-sm opacity-30 pointer-events-none">
                            {media.thumbnail ? (
                                <img src={media.thumbnail} className="w-full h-full object-cover saturate-200" alt="" />
                            ) : (
                                <div className="w-full h-full bg-linear-to-br from-indigo-500 to-purple-500" />
                            )}
                        </div>

                        <div className="relative z-10 flex flex-col gap-6">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-black uppercase tracking-widest mb-2 text-white/40">Now Playing</div>
                                    <h3 className="text-3xl font-black text-white tracking-tighter leading-none truncate">{media.title}</h3>
                                    <p className="text-sm font-medium text-white/50 mt-2 truncate">{media.artist}</p>
                                </div>
                                <img src={media.thumbnail || ""} className="w-16 h-16 rounded-2xl border border-white/10 object-cover shadow-xl" />
                            </div>

                            {/* PROGRESS BAR */}
                            <div className="space-y-2">
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={false}
                                        animate={{ width: `${progressPercent}%` }}
                                        className="h-full bg-white shadow-[0_0_10px_white]" 
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-white/30 tracking-tighter">
                                    <span>{formatTime(media.position)}</span>
                                    <span>{formatTime(media.duration)}</span>
                                </div>
                            </div>

                            {/* ACTION CONTROLS */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <button onClick={() => sendCommand("prev")} className="text-white/40 hover:text-white transition-colors text-xl cursor-pointer">
                                        <SkipBack />
                                    </button>
                                    <button 
                                        onClick={() => sendCommand("play_pause")}
                                        className="text-white/40 hover:text-white transition-colors text-xl cursor-pointer"
                                    >
                                        {media.is_playing ? <Pause /> : <Play />}
                                    </button>
                                    <button onClick={() => sendCommand("next")} className="text-white/40 hover:text-white transition-colors text-xl cursor-pointer">
                                        <SkipForward />
                                    </button>
                                </div>
                                
                                <div className="text-right">
                                    <p className="text-[10px] text-white/20 uppercase font-black tracking-widest">Session</p>
                                    <p className="text-xl font-black text-white tracking-tighter">{media.is_playing ? media.source : 'PAUSED'}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};