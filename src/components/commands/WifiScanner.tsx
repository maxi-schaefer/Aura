import { useEffect, useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";

export const WifiScanner = () => {
    const [beacons, setBeacons] = useState<any[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [hoveredSsid, setHoveredSsid] = useState<string | null>(null);

    const scan = async () => {
        setIsScanning(true);
        try {
            const results: any = await invoke("scan_neighborhood");
            setBeacons(Array.isArray(results) ? results : []);
        } catch (e) {
            console.error("Scan failed", e);
        } finally {
            setTimeout(() => setIsScanning(false), 800);
        }
    };

    useEffect(() => {
        scan();
        const interval = setInterval(scan, 10000);
        return () => clearInterval(interval);
    }, []);

    const groupedBeacons = useMemo(() => {
        const groups: Record<string, any> = {};
        beacons.forEach((b) => {
            const id = b.ssid || "Hidden Node";
            if (!groups[id] || b.signal > groups[id].signal) {
                groups[id] = { ...b, ssid: id, count: (groups[id]?.count || 0) + 1 };
            }
        });
        return Object.values(groups);
    }, [beacons]);

    // Convert signal → pseudo dBm → normalized height
    const getHeight = (signal: number) => {
        const dbm = -100 + signal; // fake mapping
        const normalized = Math.max(0, Math.min(1, (dbm + 100) / 70));
        return normalized * 80;
    };

    const getColor = (dbm: number, focused: boolean) => {
        if (focused) return "rgba(59,130,246,0.35)";
        if (dbm > -50) return "rgba(59,130,246,0.25)";
        if (dbm > -70) return "rgba(59,130,246,0.15)";
        return "rgba(255,255,255,0.08)";
    };

    return (
        <div className="p-2 w-full max-w-5xl mx-auto bg-transparent">
            
            {/* HEADER */}
            <div className="flex justify-between items-end mb-16 px-4">
                <div>
                    <h3 className="text-white/90 text-sm font-medium">Environmental Core</h3>
                    <div className="flex items-center gap-2">
                        <div className={`w-1 h-1 rounded-full ${isScanning ? "bg-blue-500 animate-pulse" : "bg-white/10"}`} />
                        <p className="text-[9px] text-white/20 uppercase tracking-[0.4em] font-black">
                            Spectral Analysis
                        </p>
                    </div>
                </div>
            </div>

            {/* SPECTRUM */}
            <div className="relative h-72 w-full border-l border-b border-white/10 mb-12 px-8">
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">

                    {/* GRID */}
                    {[20, 40, 60, 80].map((y) => (
                        <line
                            key={y}
                            x1="0"
                            x2="100"
                            y1={100 - y}
                            y2={100 - y}
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="0.3"
                        />
                    ))}

                    <AnimatePresence>
                        {groupedBeacons.map((b) => {
                            const isFocused = hoveredSsid === b.ssid;

                            const channel = b.channel || 1;

                            // Better channel spread (1–13)
                            const x = 5 + ((channel - 1) / 13) * 90;

                            const h = getHeight(b.signal || 0);

                            const dbm = -100 + (b.signal || 0);

                            // WiFi channel width simulation
                            const width = 18;

                            const path = `
                                M ${x - width} 100
                                C ${x - width / 2} ${100 - h}, 
                                  ${x + width / 2} ${100 - h}, 
                                  ${x + width} 100
                                L ${x - width} 100
                            `;

                            return (
                                <motion.path
                                    key={b.ssid}
                                    d={path}
                                    fill={getColor(dbm, isFocused)}
                                    stroke={isFocused ? "#3b82f6" : "rgba(255,255,255,0.2)"}
                                    strokeWidth={isFocused ? 1.5 : 0.6}
                                    style={{
                                        filter: isFocused
                                            ? "drop-shadow(0 0 6px rgba(59,130,246,0.4))"
                                            : "none",
                                    }}
                                    initial={{ opacity: 0 }}
                                    animate={{
                                        opacity: hoveredSsid
                                            ? isFocused
                                                ? 1
                                                : 0.15
                                            : 0.8,
                                    }}
                                    transition={{ duration: 0.6 }}
                                />
                            );
                        })}
                    </AnimatePresence>
                </svg>

                {/* CHANNEL LABELS */}
                <div className="absolute -bottom-8 left-0 w-full flex justify-between px-8 text-[10px] font-bold text-white/20 font-mono">
                    <span>CH 01</span>
                    <span>CH 06</span>
                    <span>CH 11</span>
                </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-24 px-4">
                <div className="opacity-60">
                    <span className="text-[9px] text-white/30 uppercase font-black">Optimal</span>
                    <div className="text-4xl text-white">1, 6, 11</div>
                </div>

                <div className="opacity-60">
                    <span className="text-[9px] text-white/30 uppercase font-black">Environment</span>
                    <div className="text-4xl text-white">{beacons.length}</div>
                </div>

                {/* INTERACTIVE */}
                <div className="group relative">
                    <span className="text-[9px] text-white/30 uppercase font-black">
                        Networks
                    </span>
                    <div className="text-4xl text-white">
                        {groupedBeacons.length}
                    </div>

                    {/* POPUP */}
                    <div className="absolute bottom-full left-0 w-72 p-5 border border-white/10 backdrop-blur-sm bg-white/5 rounded-2xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all">
                        <div className="mb-3 text-[10px] text-white/40 uppercase font-black">
                            Frequency Map
                        </div>

                        <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                            {groupedBeacons
                                .sort((a, b) => b.signal - a.signal)
                                .map((b) => (
                                    <div
                                        key={b.ssid}
                                        onMouseEnter={() => setHoveredSsid(b.ssid)}
                                        onMouseLeave={() => setHoveredSsid(null)}
                                        className="flex justify-between text-xs text-white/70 hover:text-blue-400"
                                    >
                                        <span className="truncate w-32">
                                            {b.ssid}
                                        </span>
                                        <span>
                                            CH {b.channel || 0} • {b.signal}%
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};