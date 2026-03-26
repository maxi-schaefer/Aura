import { useState, useEffect } from "react";
import { SpeedtestCard } from "./SpeedtestCard";

// The logic function we discussed earlier
async function startFullTest(onUpdate: (data: any) => void) {
  const testNode = "https://speed.cloudflare.com/__down?bytes=";
  
  // 1. PING
  onUpdate({ stage: 'ping', ping: 0, download: 0, upload: 0 });
  let pings = [];
  for(let i=0; i<4; i++) {
    const start = performance.now();
    await fetch("https://1.1.1.1", { mode: 'no-cors', cache: 'no-cache' });
    pings.push(performance.now() - start);
    onUpdate({ stage: 'ping', ping: Math.min(...pings) });
  }

  // 2. DOWNLOAD
  onUpdate({ stage: 'download' });
  const sizes = [1000000, 5000000, 15000000]; // 1MB, 5MB, 15MB
  for (const size of sizes) {
    const start = performance.now();
    const res = await fetch(`${testNode}${size}`, { cache: 'no-cache' });
    await res.arrayBuffer();
    const duration = (performance.now() - start) / 1000;
    const mbps = (size * 8) / (duration * 1024 * 1024);
    onUpdate({ stage: 'download', download: mbps });
  }

  // 3. UPLOAD
  onUpdate({ stage: 'upload' });
  const blob = new Uint8Array(2000000); // 2MB
  const startUl = performance.now();
  await fetch("https://speed.cloudflare.com/__up", { method: 'POST', body: blob });
  const ulDuration = (performance.now() - startUl) / 1000;
  onUpdate({ 
    stage: 'complete', 
    upload: (blob.length * 8) / (ulDuration * 1024 * 1024) 
  });
}

export const SpeedtestResult = () => {
  const [stats, setStats] = useState({
    stage: 'ping',
    ping: 0,
    download: 0,
    upload: 0
  });

  useEffect(() => {
    startFullTest((update) => {
      setStats(prev => ({ ...prev, ...update }));
    });
  }, []);

  return <SpeedtestCard {...stats} />;
};