import { useEffect, useState, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

type Beacon = {
  ssid: string;
  dbm: number;
  channel: number;
  frequency: number;
  bssid: string;
  vendor?: string;
  security?: string;
};

// Layout Constants
const svgWidth = 200;
const bandOffsets = { ism: 0, unii1: 45, unii2a: 55, unii2c: 65, unii3: 85 };
const bandWidths = { ism: 45, unii1: 10, unii2a: 10, unii2c: 20, unii3: 15 };

const ALL_CHANNELS = {
  ism: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  unii1: [36, 40, 44, 48],
  unii2a: [52, 56, 60, 64],
  unii2c: [100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144],
  unii3: [149, 153, 157, 161, 165],
};

// Helper Functions
const getXNormalized = (channel: number) => {
  if (channel <= 14) return ((channel - 1) / 13) * bandWidths.ism + bandOffsets.ism;
  if (channel >= 36 && channel <= 48) return ((channel - 36) / 12) * bandWidths.unii1 + bandOffsets.unii1;
  if (channel >= 52 && channel <= 64) return ((channel - 52) / 12) * bandWidths.unii2a + bandOffsets.unii2a;
  if (channel >= 100 && channel <= 144) return ((channel - 100) / 44) * bandWidths.unii2c + bandOffsets.unii2c;
  if (channel >= 149 && channel <= 165) return ((channel - 149) / 16) * bandWidths.unii3 + bandOffsets.unii3;
  return 0;
};

const getX = (channel: number) => (getXNormalized(channel) / 100) * svgWidth;
const dbmToY = (dbm: number) => 100 - ((dbm - (-100)) / ((-10) - (-100))) * 100;

const getStableColor = (bssid: string) => {
  let hash = 0;
  for (let i = 0; i < bssid.length; i++) hash = bssid.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 75%, 60%)`;
};

const getWifiPath = (x: number, y: number, w: number) => {
  const bottom = 100;
  const slope = w * 0.01;
  const radius = 2;
  return `
    M ${x - w} ${bottom}
    L ${x - w + slope} ${y + radius}
    Q ${x - w + slope} ${y}, ${x - w + slope + radius} ${y}
    L ${x + w - slope - radius} ${y}
    Q ${x + w - slope} ${y}, ${x + w - slope} ${y + radius}
    L ${x + w} ${bottom}
    Z
  `;
};

export const WifiScanner = () => {
  const [beacons, setBeacons] = useState<Beacon[]>([]);
  const [hovered, setHovered] = useState<Beacon | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cardOffset, setCardOffset] = useState({ x: 20, y: -40 });
  
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scan = async () => {
    try {
      const res: Beacon[] = await invoke("scan_neighborhood");
      setBeacons(res || []);
    } catch (e) {
      console.error("Scan failed:", e);
    }
  };

  useEffect(() => {
    scan();
    const interval = setInterval(scan, 4000);
    return () => clearInterval(interval);
  }, []);

  // Smart Hover Card Positioning
  useEffect(() => {
    if (!hovered || !containerRef.current || !cardRef.current) return;
    const container = containerRef.current.getBoundingClientRect();
    const card = cardRef.current.getBoundingClientRect();

    const xOffset = mousePos.x + card.width + 30 > container.width ? -(card.width + 20) : 20;
    const yOffset = mousePos.y + card.height + 20 > container.height ? -(card.height - 10) : -40;

    setCardOffset({ x: xOffset, y: yOffset });
  }, [mousePos, hovered]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const bssidColors = useMemo(() => {
    const colors: Record<string, string> = {};
    beacons.forEach((b) => colors[b.bssid] = getStableColor(b.bssid));
    return colors;
  }, [beacons]);

  return (
    <div ref={containerRef} onMouseMove={handleMouseMove} className="relative w-full max-w-7xl mx-auto p-6 text-white font-sans">
      
      {/* BAND HEADERS */}
      <div className="flex w-full border-b border-white/10 text-[10px] uppercase tracking-widest text-white/50">
          <div className="w-[45%] text-center border-r border-white/10 py-1.5 bg-white/5 rounded-tl-xl">2.4 GHz (ISM)</div>
          <div className="w-[10%] text-center border-r border-white/10 py-1.5 bg-blue-500/5">UNII-1</div>
          <div className="w-[10%] text-center border-r border-white/10 py-1.5 bg-blue-400/5">UNII-2A</div>
          <div className="w-[20%] text-center border-r border-white/10 py-1.5 bg-blue-300/5">UNII-2C</div>
          <div className="w-[15%] text-center py-1.5 bg-blue-200/5 rounded-tr-xl">UNII-3</div>
      </div>

      <div className="relative bg-[#14181c]/60 border border-white/5 rounded-b-xl p-4 shadow-2xl">
        <svg viewBox={`0 -10 ${svgWidth} 120`} className="w-full h-96 overflow-visible select-none">
          
          {/* VERTICAL CHANNEL GRID */}
          <g>
            {Object.values(ALL_CHANNELS).flat().map((ch) => {
              const xPos = getX(ch);
              return (
                <g key={`ch-${ch}`}>
                  <line x1={xPos} x2={xPos} y1="0" y2="100" stroke="white" strokeOpacity="0.04" strokeWidth="0.3" />
                  <text x={xPos} y="106" fontSize="2.5" fill="white" fillOpacity="0.15" textAnchor="middle">{ch}</text>
                </g>
              );
            })}
          </g>

          {/* HORIZONTAL DB GRID */}
          {[-20, -40, -60, -80, -100].map((dbm) => (
            <g key={dbm}>
              <line x1="0" x2={svgWidth} y1={dbmToY(dbm)} y2={dbmToY(dbm)} stroke="white" strokeOpacity="0.07" strokeWidth="0.2" />
              <text x={svgWidth - 2} y={dbmToY(dbm) - 1} fontSize="3" fill="white" fillOpacity="0.3" textAnchor="end">{dbm} dBm</text>
            </g>
          ))}

          {/* SIGNAL PATHS */}
          {beacons.map((b) => {
            const is5G = b.frequency > 4000;
            const x = getX(b.channel);
            const y = dbmToY(b.dbm);
            const w = is5G ? 4 : 9;
            const color = bssidColors[b.bssid];
            const isHovered = hovered?.bssid === b.bssid;

            return (
              <g key={b.bssid} onMouseEnter={() => setHovered(b)} onMouseLeave={() => setHovered(null)} className="cursor-pointer">
                {isHovered && <path d={getWifiPath(x, y, w)} fill={color} filter="blur(8px)" opacity="0.3" />}
                <path
                  d={getWifiPath(x, y, w)}
                  fill={color}
                  fillOpacity={isHovered ? 0.45 : 0.12}
                  stroke={color}
                  strokeWidth={isHovered ? 0.6 : 0.2}
                  className="transition-all duration-300 ease-out"
                />
                <text 
                  x={x} y={y - 5} textAnchor="middle" fontSize="4" fill={color} 
                  className={`pointer-events-none transition-opacity ${isHovered ? 'opacity-100 font-bold' : 'opacity-60'}`}
                >
                  {b.ssid || "Hidden"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* SMART HOVER CARD */}
      {hovered && (
        <div 
          ref={cardRef}
          className="absolute z-50 pointer-events-none bg-[#1a1d21]/70 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-2xl min-w-65 transition-transform duration-100 ease-out"
          style={{ 
            left: mousePos.x, top: mousePos.y,
            transform: `translate(${cardOffset.x}px, ${cardOffset.y}px)` 
          }}
        >
          <div className="flex justify-between items-start mb-3 border-b border-white/10 pb-3">
            <div className="max-w-40">
              <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider">SSID</div>
              <div className="text-sm font-bold text-white truncate leading-tight">{hovered.ssid || "Hidden Network"}</div>
            </div>
            <div 
              style={{ backgroundColor: `${bssidColors[hovered.bssid]}20`, color: bssidColors[hovered.bssid], borderColor: `${bssidColors[hovered.bssid]}40` }}
              className="px-2 py-1 rounded-md text-[10px] font-bold border"
            >
              {hovered.dbm} dBm
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[10px]">
            <div>
              <span className="text-white/30 block uppercase font-medium">BSSID</span>
              <span className="font-mono text-white/80">{hovered.bssid}</span>
            </div>
            <div>
              <span className="text-white/30 block uppercase font-medium">Frequency</span>
              <span className="text-white/80">{hovered.channel} <span className="text-white/40">({hovered.frequency} MHz)</span></span>
            </div>
            <div>
              <span className="text-white/30 block uppercase font-medium">Manufacturer</span>
              <span className="text-white/80 truncate block">{hovered.vendor || "Unknown"}</span>
            </div>
            <div>
              <span className="text-white/30 block uppercase font-medium">Security</span>
              <span className="text-white/80">{hovered.security}</span>
            </div>
          </div>

          <div 
            className="absolute -left-1 top-4 w-1 bottom-4 rounded-full"
            style={{ backgroundColor: bssidColors[hovered.bssid] }}
          />
        </div>
      )}
    </div>
  );
};