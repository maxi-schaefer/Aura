import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { playTimerDone } from "../../lib/sound";

interface TimerState {
  endTime: number;
  total: number;
  remaining: number;
  isPaused: boolean;
}

export function FooterTimer() {
  const [timerData, setTimerData] = useState<TimerState | null>(null);
  const controls = useAnimation();

  const formatDisplay = (ms: number) => {
    const totalSecs = Math.ceil(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;

    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleAction = useCallback((e: CustomEvent) => {
    const { type, totalSeconds } = e.detail;

    if (type === "start") {
      const ms = totalSeconds * 1000;
      setTimerData({ endTime: Date.now() + ms, total: ms, remaining: ms, isPaused: false });
    } else if (type === "toggle") {
      setTimerData(prev => {
        if (!prev) return null;
        return prev.isPaused
          ? { ...prev, isPaused: false, endTime: Date.now() + prev.remaining }
          : { ...prev, isPaused: true, remaining: prev.endTime - Date.now() };
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener("timer-action", handleAction as EventListener);

    const interval = setInterval(() => {
      setTimerData(prev => {
        if (!prev || prev.isPaused) return prev;
        const diff = prev.endTime - Date.now();
        if (diff <= 0) {
          playTimerDone();
          new Notification("Aura", { body: "Operation Complete" });
          return null;
        }
        return { ...prev, remaining: diff };
      });
    }, 100);

    return () => {
      window.removeEventListener("timer-action", handleAction as EventListener);
      clearInterval(interval);
    };
  }, [handleAction]);

  // Animate pulse when running
  useEffect(() => {
    if (timerData && !timerData.isPaused) {
      controls.start({
        scale: [1, 1.05, 1],
        boxShadow: [
          "0 0 4px rgba(0,0,0,0)",
          "0 0 10px rgba(0,128,255,0.3)",
          "0 0 4px rgba(0,0,0,0)"
        ],
        transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
      });
    } else {
      controls.stop();
    }
  }, [timerData, controls]);

  if (!timerData) return null;

  const progress = timerData.remaining / timerData.total;
  const circumference = 2 * Math.PI * 5;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 border backdrop-blur-md transition-all duration-500 ${
          timerData.isPaused ? "border-white/10 opacity-50" : "border-primary/30"
        }`}
      >
        <div className="relative w-3.5 h-3.5">
          <svg className="w-full h-full -rotate-90 overflow-visible">
            <defs>
              <linearGradient id="timer-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="var(--secondary)" />
              </linearGradient>
            </defs>
            <circle
              cx="7"
              cy="7"
              r="5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-fg/10"
            />
            <motion.circle
              cx="7"
              cy="7"
              r="5"
              fill="none"
              stroke="url(#timer-grad)"
              strokeWidth="1.8"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: circumference * (1 - progress) }}
              strokeLinecap="round"
              className={timerData.isPaused ? "" : "drop-shadow-[0_0_3px_var(--primary)]"}
              transition={{ type: "spring", stiffness: 80, damping: 18 }}
            />
          </svg>
        </div>
        <span
          className={`font-mono text-[9px] font-black uppercase tracking-widest tabular-nums ${
            timerData.isPaused ? "text-fg/20" : "text-primary/90"
          }`}
        >
          {timerData.isPaused ? "Paused" : formatDisplay(timerData.remaining)}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}