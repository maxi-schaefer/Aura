import { motion, SVGMotionProps } from "framer-motion";

export const SpeedtestCard = ({ ping, download, upload, stage }: any) => {
  const size = 220;
  const center = size / 2;
  const strokeWidth = 6; 

  const getCircleProps = (radius: number, value: number, max: number, colorId: string): SVGMotionProps<SVGCircleElement> => {
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(value / max, 1);
    
    return {
      r: radius,
      cx: center,
      cy: center,
      fill: "none", // Critical: prevents the black center
      stroke: `url(#${colorId})`,
      strokeDasharray: circumference,
      initial: { strokeDashoffset: circumference, opacity: 0 },
      animate: { 
        strokeDashoffset: circumference - progress * circumference,
        opacity: 1 
      },
      transition: { 
        duration: 2.5, 
        ease: [0.16, 1, 0.3, 1] as const 
      } 
    };
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 w-full max-w-md mx-auto bg-transparent" // Ensure transparent bg
    >
      {/* Minimal Header */}
      <div className="flex justify-between items-end mb-8 px-2">
        <div>
          <h3 className="text-white/90 text-sm font-medium tracking-tight">Network Core</h3>
          <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-bold">Spectral Analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-1 w-1 rounded-full ${stage === 'complete' ? 'bg-green-500 shadow-[0_0_8px_#10b981]' : 'bg-blue-500 animate-pulse'}`} />
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest tabular-nums">
            {stage === 'complete' ? 'Ready' : 'Live'}
          </span>
        </div>
      </div>

      {/* Hero Visual */}
      <div className="relative flex justify-center items-center h-56 bg-transparent">
        <svg width={size} height={size} className="-rotate-90 overflow-visible">
          <defs>
            <linearGradient id="grad-down" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
            <linearGradient id="grad-up" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#d946ef" />
            </linearGradient>
            <linearGradient id="grad-ping" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>

          {/* Background Rails - Subtle dots */}
          <circle cx={center} cy={center} r={90} fill="none" stroke="white" strokeWidth={1} strokeOpacity="0.15" strokeDasharray="2 6" />
          <circle cx={center} cy={center} r={73} fill="none" stroke="white" strokeWidth={1} strokeOpacity="0.15" strokeDasharray="2 6" />
          <circle cx={center} cy={center} r={56} fill="none" stroke="white" strokeWidth={1} strokeOpacity="0.15" strokeDasharray="2 6" />

          {/* High-definition Rings */}
          <motion.circle {...getCircleProps(90, download || 0, 1000, "grad-down")} strokeWidth={strokeWidth} strokeLinecap="round" />
          <motion.circle {...getCircleProps(73, upload || 0, 500, "grad-up")} strokeWidth={strokeWidth} strokeLinecap="round" />
          <motion.circle {...getCircleProps(56, 100 - Math.min(ping || 100, 100), 100, "grad-ping")} strokeWidth={strokeWidth} strokeLinecap="round" />
        </svg>

        {/* Minimal Center Stat - No background classes here */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-6xl font-thin text-white tracking-tighter">
            {download?.toFixed(0) || "0"}
          </span>
          <div className="flex items-center gap-2 opacity-30 mt-1">
             <div className="h-px w-4 bg-white" />
             <span className="text-[9px] font-black uppercase tracking-[0.3em]">Mbps</span>
             <div className="h-px w-4 bg-white" />
          </div>
        </div>
      </div>

      {/* Grid: Ultra Minimal Stats */}
      <div className="grid grid-cols-3 gap-8 mt-10 px-4">
        <MinimalStatItem label="Ping" value={Math.round(ping)} unit="ms" color="bg-green-500" />
        <MinimalStatItem label="Download" value={upload?.toFixed(1)} unit="mb" color="bg-blue-500" />
        <MinimalStatItem label="Upload" value={upload?.toFixed(1)} unit="mb" color="bg-purple-500" />
      </div>
    </motion.div>
  );
};

const MinimalStatItem = ({ label, value, unit, color }: any) => (
  <div className="flex flex-col">
    <div className="flex items-center gap-1.5 mb-1">
      <div className={`h-1 w-1 rounded-full ${color}`} />
      <span className="text-[8px] text-white/20 uppercase font-black tracking-widest">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-lg font-medium text-white/90">{value || "—"}</span>
      <span className="text-[9px] text-white/20 font-light">{unit}</span>
    </div>
  </div>
);