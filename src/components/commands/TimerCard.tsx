import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playTimerDone } from "../../lib/sound";

interface TimerCardProps {
  initialSeconds: number;
}

export const TimerCard = ({ initialSeconds }: TimerCardProps) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setTimeLeft(initialSeconds);
    setIsComplete(false);
  }, [initialSeconds]);

  useEffect(() => {
    let interval: number | undefined;
    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setIsComplete(true);
      playTimerDone();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  useEffect(() => {
    const handleAction = (e: CustomEvent) => {
      if (e.detail.type === "toggle") setIsActive((prev) => !prev);
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
    return h > 0 
      ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Progress calculation for the ring
  const progress = initialSeconds > 0 ? (timeLeft / initialSeconds) : 0;

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[400px] w-full max-w-md mx-auto group">
      
      {/* 1. The Dynamic Glow Aura */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{
            scale: isActive ? [1, 1.1, 1] : 1,
            opacity: isActive ? [0.2, 0.3, 0.2] : 0.15,
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className={`w-72 h-72 blur-[100px] rounded-full transition-colors duration-1000 ${
            isComplete ? "bg-emerald-500" : "bg-primray"
          }`}
        />
      </div>

      {/* 2. The Progress Ring (Minimalist) */}
      <svg className="absolute w-80 h-80 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r="48"
          className="stroke-white/3 fill-none"
          strokeWidth="0.5"
        />
        <motion.circle
          cx="50" cy="50" r="48"
          className={`fill-none transition-colors duration-1000 ${
            isComplete ? "stroke-emerald-500/50" : "stroke-white/20"
          }`}
          strokeWidth="0.5"
          strokeDasharray="301.59"
          animate={{ strokeDashoffset: 301.59 * (1 - progress) }}
          transition={{ duration: 1, ease: "linear" }}
          strokeLinecap="round"
        />
      </svg>

      {/* 3. The Time Display */}
      <div className="relative flex flex-col items-center">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={timeLeft}
            initial={{ opacity: 0, filter: "blur(4px)", y: 10 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            exit={{ opacity: 0, filter: "blur(4px)", y: -10 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className={`text-8xl font-extralight tracking-tighter tabular-nums leading-none ${
              isComplete ? "text-emerald-400" : "text-white/90"
            }`}
          >
            {formatTime(timeLeft)}
          </motion.div>
        </AnimatePresence>

        {/* 4. Subtle Context Label */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="mt-6 flex items-center gap-3"
        >
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-white/20" />
          <span className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-medium">
            {isComplete ? "Sequence Ended" : isActive ? "Focusing" : "Paused"}
          </span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-white/20" />
        </motion.div>
      </div>

      {/* 5. Elegant "Complete" Indicator */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -bottom-4 text-emerald-400/60 text-xs tracking-widest uppercase"
          >
            Session Finished
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};