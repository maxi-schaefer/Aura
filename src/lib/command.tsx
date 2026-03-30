import { HexCard } from "../components/commands/HexCard";
import { NowPlayingCard } from "../components/commands/NowPlayingCard";
import { PasswordCard } from "../components/commands/PasswordCard";
import { SpeedtestResult } from "../components/commands/SpeedtestResult";
import { TimerCard } from "../components/commands/TimerCard";
import { WeatherCard } from "../components/commands/WeatherCard";

export interface Command {
    cmd: string;
    title: string; // Added for the breadcrumb UI
    description: string;
    render?: (args: string, copied?: boolean) => any; // For live widget mode
    preview?: (args: string[]) => string; // For the subtitle in list mode
    execute: (args: string[]) => any | Promise<any>;
}

export const COMMAND_MAP: Record<string, Command> = {
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
  password: {
    cmd: "password",
    title: "Password",
    description: "Generate a secure password",
    render: (query, copied) => {
        const length = parseInt(query) || 12;
        return <PasswordCard length={length} copied={copied} />;
    },
    execute: (args) => {
      console.log(args);
      const length = Math.min(Math.max(parseInt(args[0]) || 12, 4), 128);
      const all = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
      const pw = Array.from({ length }, () => all[Math.floor(Math.random() * all.length)]).join("");
      navigator.clipboard.writeText(pw);
      return { success: true, value: pw };
    }
  },
  hex: {
    cmd: "hex",
    title: "Hex",
    description: "Convert text to Hex or vice versa",
    render: (query, copied) => {
        const result = query ? query.split("").map((c) => c.charCodeAt(0).toString(16)).join(" ") : "";
        navigator.clipboard.writeText(result);
        return <HexCard input={query} result={result} copied={copied} />;
    },
    execute: async (args) => {
        const input = args.join(" ");
        if (!input) return { success: false };

        const result = input
          .split("")
          .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
          .join(" ");

        await navigator.clipboard.writeText(result);
        
        return { success: true, value: result };
      }
  },
  timer: {
    cmd: "timer",
    title: "Timer",
    description: "Set a countdown timer (minutes)",
    render: (query) => {
      const minutes = parseInt(query) || 0;
      return <TimerCard initialMinutes={minutes} />;
    },
    execute: async (args) => {
      if (!args || args.length === 0 || args[0] === "") {
        window.dispatchEvent(new CustomEvent("timer-action", { detail: { type: "toggle" } }));
        return { success: true }; 
      }

      const minutes = parseInt(args[0]);
      if (isNaN(minutes) || minutes <= 0) return { success: false };

      const totalSeconds = minutes * 60;
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
};