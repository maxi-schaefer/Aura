import { NowPlayingCard } from "../components/commands/NowPlayingCard";
import { SettingsView } from "../components/commands/SettingsView";
import { SpeedtestResult } from "../components/commands/SpeedtestResult";
import { TimerCard } from "../components/commands/TimerCard";
import { WeatherCard } from "../components/commands/WeatherCard";
import { WifiScanner } from "../components/commands/WifiScanner";
import { parseTimerString } from "./utils";

export interface Command {
    cmd: string;
    title: string; // Added for the breadcrumb UI
    description: string;
    render?: (args: string, copied?: boolean) => any; // For live widget mode
    preview?: (args: string[]) => string; // For the subtitle in list mode
    execute: (args: string[]) => any | Promise<any>;
}

export const COMMAND_MAP: Record<string, Command> = {
  settings: {
    cmd: "settings",
    title: "Settings",
    description: "Configure shortcuts, appearance, and extensions",
    render: () => <SettingsView />,
    execute: () => ({ success: true }),
  },
  weather: {
    cmd: "weather",
    title: "Weather",
    description: "Check weather for a city",
    render: (query) => <WeatherCard city={query} />,
    execute: async (args) => args.join(" ") || ""
  },
  speedtest: {
    cmd: "speedtest",
    title: "Speedtest",
    description: "Run a network speed test",
    render: () => <SpeedtestResult />,
    execute: () => <SpeedtestResult />,
  },
  timer: {
    cmd: "timer",
    title: "Timer",
    description: "Set countdown (e.g., 1h 10m, 30s)",
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
    description: "View current system media info",
    render: () => <NowPlayingCard />,
    execute: async () => {
        return { success: true };
    }
  },
  wifi: {
    cmd: "wifi",
    title: "Wifi Heatmap",
    description: "Map nearby WiFi congestion",
    render: () => <WifiScanner />,
    execute: () => { return { success: true } }
  },
};