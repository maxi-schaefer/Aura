import { useEffect, useState } from "react";

// components/FooterTimer.tsx
export function FooterTimer() {
  const [timerData, setTimerData] = useState<{ endTime: number; total: number; remaining: number; isPaused: boolean } | null>(null);
  const [display, setDisplay] = useState("");
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    const handleAction = (e: any) => {
      const { type, endTime, totalSeconds } = e.detail;

      if (type === "start") {
        setTimerData({ endTime, total: totalSeconds * 1000, remaining: totalSeconds * 1000, isPaused: false });
      } else if (type === "toggle" && timerData) {
        if (timerData.isPaused) {
          setTimerData({ ...timerData, isPaused: false, endTime: Date.now() + timerData.remaining });
        } else {
          setTimerData({ ...timerData, isPaused: true, remaining: timerData.endTime - Date.now() });
        }
      }
    };

    window.addEventListener("timer-action", handleAction);
    
    const interval = setInterval(() => {
      if (!timerData || timerData.isPaused) return;

      const diff = timerData.endTime - Date.now();

      if (diff <= 0) {
        setTimerData(null);
        new Notification("Aura", { body: "Timer finished" });
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setDisplay(`${m}:${s.toString().padStart(2, "0")}`);
        setProgress(diff / timerData.total);
      }
    }, 100);

    return () => {
      window.removeEventListener("timer-action", handleAction);
      clearInterval(interval);
    };
  }, [timerData]);

  if (!timerData) return null;

  return (
    <div className={`flex items-center gap-2.5 px-2.5 py-1 rounded-full bg-white/3 border border-white/6 transition-opacity duration-500 ${timerData.isPaused ? 'opacity-50' : 'opacity-100'}`}>
      <div className="relative w-3 h-3">
        <svg className="w-full h-full -rotate-90">
          <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/5" />
          <circle
            cx="6" cy="6" r="5" fill="none"
            stroke="var(--primary)"
            strokeWidth="1.5"
            strokeDasharray={31.4}
            strokeDashoffset={31.4 * (1 - progress)}
            strokeLinecap="round"
            className={`transition-all duration-300 ${timerData.isPaused ? '' : 'shadow-[0_0_8px_var(--primary)]'}`}
          />
        </svg>
      </div>
      <span className={`font-mono text-[10px] font-bold tabular-nums tracking-tight ${timerData.isPaused ? 'text-white/40' : 'text-primary/90'}`}>
        {timerData.isPaused ? "PAUSED" : display}
      </span>
    </div>
  );
}