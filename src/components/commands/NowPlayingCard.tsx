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
    const [accent, setAccent] = useState("rgb(139,92,246)"); // fallback purple
        
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

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === " " && media) {
                e.preventDefault();
                sendCommand("play_pause");
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [media])
    
    useEffect(() => {
        if (!media?.thumbnail) return;

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = media.thumbnail;

        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            canvas.width = 50;
            canvas.height = 50;

            ctx.drawImage(img, 0, 0, 50, 50);
            const data = ctx.getImageData(0, 0, 50, 50).data;

            let r = 0, g = 0, b = 0, count = 0;

            for (let i = 0; i < data.length; i += 4) {
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                count++;
            }

            r = Math.floor(r / count);
            g = Math.floor(g / count);
            b = Math.floor(b / count);

            setAccent(`rgb(${r}, ${g}, ${b})`);
        };
    }, [media?.thumbnail]);

    if (loading) return <div className="p-4 ml-4 text-fg/20 animate-pulse font-medium">Connecting...</div>;

    const Waveform = ({ playing }: { playing: boolean }) => {
        return (
            <div className="flex items-end gap-0.75 h-6">
            {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                key={i}
                animate={{
                    height: playing
                    ? [6, 18, 10, 22, 6]
                    : 4,
                }}
                transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.04,
                }}
                className="w-0.5 rounded-full"
                style={{
                    background: accent,
                    opacity: 0.85,
                }}
                />
            ))}
            </div>
        );
    };

    const progressPercent = media ? (media.position / media.duration) * 100 : 0;

    return (
        <motion.div
            key={media?.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.35,
                ease: [0.25, 0.1, 0.25, 1] // Apple's standard ease
            }}
            whileHover={{ scale: 1.015 }}
            className="relative overflow-hidden mt-4 px-6 py-6 rounded-4xl border border-white/15 bg-white/10 backdrop-blur-2xl shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
        >
            {/* Glow sweep */}
            <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                duration: 1.2,
                ease: "easeInOut",
                delay: 0.2
                }}
                className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent"
            />
            <div
                className="absolute inset-0 opacity-30 blur-[100px]"
                style={{ background: accent }}
            />

            {/* Background */}
            {media?.thumbnail && (
                <img
                    src={media.thumbnail}
                    className="absolute inset-0 w-full h-full object-cover opacity-30 blur-xs scale-110"
                />
            )}

            <div className="relative z-10 flex flex-col gap-6">

                {/* TOP */}
                <div className="flex items-center gap-5">
                    <motion.img
                        src={media?.thumbnail || ""}
                        className="w-24 h-24 rounded-2xl object-cover shadow-2xl"
                        whileHover={{ scale: 1.08 }}
                    />

                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.25em] text-fg/40 font-bold mb-1">
                            Now Playing
                        </p>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={media?.title}
                                initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                                transition={{ duration: 0.35 }}
                            >
                                <h3 className="text-2xl font-bold text-fg truncate">
                                {media?.title}
                                </h3>

                                <p className="text-sm text-fg/60 truncate">
                                {media?.artist}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* 🌊 Waveform */}
                <Waveform playing={!!media?.is_playing} />

                {/* 🎚 Progress */}
                <div className="space-y-2">
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            animate={{ width: `${progressPercent}%` }}
                            transition={{
                                type: "spring",
                                stiffness: 80,
                                damping: 20
                            }}
                            className="h-full"
                            style={{
                                background: `linear-gradient(to right, ${accent}, white)`,
                                boxShadow: `0 0 16px ${accent}`
                            }}
                        />
                    </div>

                    <div className="flex justify-between text-[10px] text-fg/40">
                        <span>{formatTime(media?.position || 0)}</span>
                        <span>{formatTime(media?.duration || 0)}</span>
                    </div>
                </div>

                {/* CONTROLS */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => sendCommand("prev")}
                            className="cursor-pointer p-2 rounded-full bg-white/5 hover:bg-white/10 text-fg/70"
                        >
                            <SkipBack size={18} />
                        </button>

                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => sendCommand("play_pause")}
                            className="cursor-pointer p-4 rounded-full text-fg/30 shadow-lg"
                            style={{ background: accent }}
                        >
                            {media?.is_playing ? <Pause size={20} /> : <Play size={20} />}
                        </motion.button>

                        <button
                            onClick={() => sendCommand("next")}
                            className="cursor-pointer p-2 rounded-full bg-white/5 hover:bg-white/10 text-fg/70"
                        >
                            <SkipForward size={18} />
                        </button>
                    </div>

                    <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest text-fg/30">
                            Output
                        </p>
                        <p className="text-sm font-semibold text-fg">
                            {media?.is_playing ? media?.source : "Paused"}
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};