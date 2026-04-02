import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { playTimerDone } from "../../lib/sound";

interface TimerCardProps {
    initialSeconds: number;
}

export const TimerCard = ({ initialSeconds }: TimerCardProps) => {
    const [timeLeft, setTimeLeft] = useState(initialSeconds);
    const [isActive, setIsActive] = useState(false); // Default to false so it doesn't start while typing
    const [isComplete, setIsComplete] = useState(false);

    // 🔹 SYNC: Update time when user types in the search bar
    useEffect(() => {
        setTimeLeft(initialSeconds);
        setIsComplete(false);
        // Optional: setIsActive(false); // Uncomment if you want typing to pause the countdown
    }, [initialSeconds]);

    useEffect(() => {
        let interval: number | undefined;

        if (isActive && timeLeft > 0) {
            interval = window.setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (timeLeft === 0 && isActive) {
            setIsActive(false);
            setIsComplete(true);
            playTimerDone();
        }

        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    useEffect(() => {
        const handleAction = (e: CustomEvent) => {
            if (e.detail.type === "toggle") setIsActive(prev => !prev);
            if (e.detail.type === "start") {
                setTimeLeft(e.detail.totalSeconds);
                setIsActive(true);
                setIsComplete(false);
            }
        };
        window.addEventListener("timer-action", handleAction as EventListener);
        return () => window.removeEventListener("timer-action", handleAction as EventListener);
    }, []);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        }
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <div className="flex flex-col items-center justify-center p-12 space-y-6 font-sans">
            <div className="relative">
                <motion.div
                    // Use layoutId or key if you want a subtle pop animation on change
                    key={initialSeconds} 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center"
                >
                    <motion.div
                        animate={isActive ? { opacity: [0.1, 0.2, 0.1], scale: [1, 1.1, 1] } : { opacity: 0.1 }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`absolute inset-0 blur-3xl rounded-full transition-colors duration-1000 ${
                            isComplete ? "bg-green-500/20" : "bg-primary/20"
                        }`}
                    />
                </motion.div>

                <div className={`relative text-6xl font-extralight tracking-tighter tabular-nums transition-colors duration-500 ${
                    isComplete ? "text-green-400" : "text-fg/90"
                }`}>
                    {formatTime(timeLeft)}
                </div>
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/3 border border-white/5">
                <div className={`h-1 w-1 rounded-full ${isActive ? "bg-primary animate-pulse" : "bg-white/20"}`} />
                <span className="text-[10px] uppercase tracking-[0.2em] text-fg/40 font-bold">
                    {isComplete ? "Sequence Complete" : isActive ? "Countdown Active" : "Paused / Ready"}
                </span>
            </motion.div>
        </div>
    );
};