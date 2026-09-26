import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Activity, RotateCw, Waves } from "lucide-react";
import { SpeedtestPhase, gaugeFraction } from "../../lib/speedtest";

export interface SpeedtestCardProps {
    phase: SpeedtestPhase;
    progress: number;
    latencyMs: number;
    jitterMs: number;
    downloadMbps: number;
    uploadMbps: number;
    error?: string | null;
    onRestart: () => void;
}

const SIZE = 208;
const CENTER = SIZE / 2;
const RADIUS = 86;
/** Three quarters of the ring, leaving a gap at the bottom. */
const SWEEP = 0.75;

const PHASE_LABEL: Record<SpeedtestPhase, string> = {
    idle: "Ready",
    latency: "Measuring latency",
    download: "Testing download",
    upload: "Testing upload",
    done: "Complete",
};

/** Two significant figures below 100, none above - keeps the dial steady. */
function formatSpeed(mbps: number): string {
    if (mbps <= 0) return "0";
    if (mbps < 10) return mbps.toFixed(2);
    if (mbps < 100) return mbps.toFixed(1);
    return Math.round(mbps).toString();
}

const Stat = ({
    icon,
    label,
    value,
    unit,
    active,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    unit: string;
    active: boolean;
}) => (
    <div
        className={`flex flex-col gap-1 rounded-xl border px-3 py-2.5 transition-colors ${
            active ? "border-primary/25 bg-primary/5" : "border-white/5 bg-white/1"
        }`}
    >
        <div className="flex items-center gap-1.5">
            <span className={active ? "text-primary" : "text-fg/25"}>{icon}</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-fg/25">
                {label}
            </span>
        </div>
        <div className="flex items-baseline gap-1">
            <span className="text-[17px] font-medium text-fg/90 tabular-nums">{value}</span>
            <span className="text-[10px] text-fg/25">{unit}</span>
        </div>
    </div>
);

export const SpeedtestCard = ({
    phase,
    progress,
    latencyMs,
    jitterMs,
    downloadMbps,
    uploadMbps,
    error,
    onRestart,
}: SpeedtestCardProps) => {
    const running = phase !== "done" && phase !== "idle" && !error;

    // The dial follows whichever number is currently being measured.
    const showingUpload = phase === "upload";
    const headline = showingUpload ? uploadMbps : downloadMbps;
    const headlineLabel = showingUpload ? "Upload" : "Download";

    const fraction = gaugeFraction(headline);
    const dashOffset = SWEEP * (1 - fraction);

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto"
        >
            <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                    <span
                        className={`size-1.5 rounded-full ${
                            error
                                ? "bg-red-400"
                                : running
                                  ? "bg-primary animate-pulse"
                                  : "bg-emerald-400 shadow-[0_0_8px_currentColor]"
                        }`}
                    />
                    <span className="text-[11px] text-fg/40">
                        {error ? "Test failed" : PHASE_LABEL[phase]}
                    </span>
                </div>

                {!running && (
                    <button
                        onClick={onRestart}
                        className="flex items-center gap-1.5 text-[11px] text-fg/25 hover:text-fg/70 transition-colors cursor-pointer"
                    >
                        <RotateCw size={12} /> Run again
                    </button>
                )}
            </div>

            {/* Phase progress */}
            <div className="h-px w-full bg-white/5 mb-4 overflow-hidden rounded-full">
                <motion.div
                    className="h-full bg-primary/50"
                    animate={{ width: `${Math.round(progress * 100)}%` }}
                    transition={{ ease: "easeOut", duration: 0.4 }}
                />
            </div>

            {/* Dial */}
            <div className="relative flex items-center justify-center">
                <svg width={SIZE} height={SIZE} className="overflow-visible">
                    <defs>
                        <linearGradient id="speed-arc" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="var(--secondary)" />
                            <stop offset="100%" stopColor="var(--primary)" />
                        </linearGradient>
                    </defs>

                    {/* Rotated so the gap sits at the bottom. */}
                    <g transform={`rotate(135 ${CENTER} ${CENTER})`}>
                        <circle
                            cx={CENTER}
                            cy={CENTER}
                            r={RADIUS}
                            fill="none"
                            stroke="currentColor"
                            className="text-fg/8"
                            strokeWidth={7}
                            strokeLinecap="round"
                            pathLength={1}
                            strokeDasharray={`${SWEEP} 1`}
                        />
                        <motion.circle
                            cx={CENTER}
                            cy={CENTER}
                            r={RADIUS}
                            fill="none"
                            stroke="url(#speed-arc)"
                            strokeWidth={7}
                            strokeLinecap="round"
                            pathLength={1}
                            strokeDasharray={`${SWEEP} 1`}
                            initial={{ strokeDashoffset: SWEEP }}
                            animate={{ strokeDashoffset: dashOffset }}
                            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.8 }}
                        />
                    </g>
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-fg/25">
                        {headlineLabel}
                    </span>
                    <span className="text-5xl font-light text-fg tracking-tight tabular-nums leading-tight">
                        {formatSpeed(headline)}
                    </span>
                    <span className="text-[10px] text-fg/30 tracking-wide">Mbit/s</span>
                </div>
            </div>

            {error ? (
                <div className="mt-4 px-4 py-3 rounded-xl border border-red-400/20 bg-red-400/5 text-[12px] text-red-200/80">
                    {error}
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-2 mt-5">
                    <Stat
                        icon={<ArrowDown size={12} />}
                        label="Down"
                        value={formatSpeed(downloadMbps)}
                        unit="Mbit/s"
                        active={phase === "download"}
                    />
                    <Stat
                        icon={<ArrowUp size={12} />}
                        label="Up"
                        value={formatSpeed(uploadMbps)}
                        unit="Mbit/s"
                        active={phase === "upload"}
                    />
                    <Stat
                        icon={<Activity size={12} />}
                        label="Ping"
                        value={latencyMs > 0 ? Math.round(latencyMs).toString() : "0"}
                        unit="ms"
                        active={phase === "latency"}
                    />
                    <Stat
                        icon={<Waves size={12} />}
                        label="Jitter"
                        value={jitterMs > 0 ? jitterMs.toFixed(1) : "0"}
                        unit="ms"
                        active={phase === "latency"}
                    />
                </div>
            )}
        </motion.div>
    );
};
