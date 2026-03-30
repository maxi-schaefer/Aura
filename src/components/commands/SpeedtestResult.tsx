import { useState, useEffect } from "react";
import { SpeedtestCard } from "./SpeedtestCard";

type Stats = {
    stage: "ping" | "download" | "upload" | "complete";
    ping: number;
    download: number;
    upload: number;
};

async function startFullTest(onUpdate: (data: Partial<Stats>) => void) {
    const testNode = "https://speed.cloudflare.com/__down?bytes=";

    onUpdate({ stage: "ping", ping: 0, download: 0, upload: 0 });
    const pings: number[] = [];
    for (let i = 0; i < 4; i++) {
        const start = performance.now();
        await fetch("https://1.1.1.1", { mode: "no-cors", cache: "no-cache" });
        pings.push(performance.now() - start);
        onUpdate({ stage: "ping", ping: Math.min(...pings) });
    }

    onUpdate({ stage: "download" });
    const sizes = [1_000_000, 5_000_000, 15_000_000, 50_000_000, 200_000_000];
    for (const size of sizes) {
        const start = performance.now();
        const res = await fetch(`${testNode}${size}`, { cache: "no-cache" });
        await res.arrayBuffer();
        const duration = (performance.now() - start) / 1000;
        const mbps = (size * 8) / (duration * 1024 * 1024);
        onUpdate({ stage: "download", download: mbps });
    }

    onUpdate({ stage: "upload" });
    for (const size of sizes) {
        const start = performance.now();
        const blob = new Uint8Array(size);
        await fetch("https://speed.cloudflare.com/__up", { method: "POST", body: blob });
        const duration = (performance.now() - start) / 1000;
        onUpdate({ stage: "complete", upload: (blob.length * 8) / (duration * 1024 * 1024) });
    }
}

export const SpeedtestResult = () => {
    const [stats, setStats] = useState<Stats>({
        stage: "ping",
        ping: 0,
        download: 0,
        upload: 0
    });

    useEffect(() => {
        startFullTest((update) => setStats(prev => ({ ...prev, ...update })));
    }, []);

    return <SpeedtestCard {...stats} />;
};