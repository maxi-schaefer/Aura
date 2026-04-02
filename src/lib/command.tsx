import { NowPlayingCard } from "../components/commands/NowPlayingCard";
import { SettingsView } from "../components/commands/SettingsView";
import { SpeedtestResult } from "../components/commands/SpeedtestResult";
import { TimerCard } from "../components/commands/TimerCard";
import { WeatherCard } from "../components/commands/WeatherCard";
import { WifiScanner } from "../components/commands/WifiScanner";
import { WingetManager } from "../components/commands/WingetManager";
import { parseTimerString } from "./utils";

import { AlarmClock, CloudSun, Download, Gauge, LucideIcon, Music, Settings, Sun, WifiCog,  } from "lucide-react";

export interface Command {
    cmd: string;
    title: string;
    description: string;
    icon?: LucideIcon;
    render?: (args: string, copied?: boolean, config?: any, setConfig?: (config: any) => void) => any;
    preview?: (args: string[]) => string;
    execute: (args: string[]) => any | Promise<any>;
}

export const COMMAND_MAP: Record<string, Command> = {
    settings: {
        cmd: "settings",
        title: "Settings",
        description: "Configure application preferences and customize your experience.",
        icon: Settings,
        render: (query, showCopied, config, setConfig) => (
            <SettingsView query={query} config={config} setConfig={setConfig} />
        ),
        execute: () => ({ success: true }),
    },

    install: {
        cmd: "install",
        title: "Winget",
        icon: Download,
        description: "Search, install, and manage Windows packages using Winget.",
        render: (query) => <WingetManager query={query} />,
        execute: async () => { return { success: true }; }
    },

    weather: {
        cmd: "weather",
        title: "Weather",
        icon: CloudSun,
        description: "View current weather conditions and forecasts for any location.",
        render: (query) => <WeatherCard city={query} />,
        execute: async (args) => args.join(" ") || ""
    },

    speedtest: {
        cmd: "speedtest",
        title: "Speedtest",
        icon: Gauge,
        description: "Measure network performance, including latency, download, and upload speeds.",
        render: () => <SpeedtestResult />,
        execute: () => <SpeedtestResult />,
    },

    timer: {
        cmd: "timer",
        title: "Timer",
        icon: AlarmClock,
        description: "Start, pause, or manage countdown timers using natural time inputs.",
        render: (query) => {
            const totalSeconds = parseTimerString(query);
            return <TimerCard initialSeconds={totalSeconds} />;
        },
        execute: async (args) => {
            if (!args || args.length === 0 || args[0] === "") {
                window.dispatchEvent(new CustomEvent("timer-action", { detail: { type: "toggle" } }));
                return { success: true }; 
            }

            const fullString = args.join("");
            const totalSeconds = parseTimerString(fullString);

            if (totalSeconds <= 0) return { success: false };

            window.dispatchEvent(new CustomEvent("timer-action", { 
                detail: { 
                    type: "start",
                    totalSeconds 
                } 
            }));

            return { success: true };
        }
    },

    nowplaying: {
        cmd: "nowplaying",
        title: "Now Playing",
        icon: Music,
        description: "Display the media currently playing on your system.",
        render: () => <NowPlayingCard />,
        execute: async () => {
            return { success: true };
        }
    },

    wifi: {
        cmd: "wifi",
        title: "WiFi Explorer",
        icon: WifiCog,
        description: "Scan nearby WiFi networks and visualize signal strength and congestion.",
        render: () => <WifiScanner />,
        execute: () => { return { success: true } }
    },
};