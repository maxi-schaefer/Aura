import { HexCard } from "../components/commands/HexCard";
import { PasswordCard } from "../components/commands/PasswordCard";
import { SpeedtestResult } from "../components/commands/SpeedtestResult";
import { WeatherCard } from "../components/commands/WeatherCard";

export interface Command {
    cmd: string;
    title: string; // Added for the breadcrumb UI
    description: string;
    render?: (args: string) => any; // For live widget mode
    preview?: (args: string[]) => string; // For the subtitle in list mode
    execute: (args: string[]) => any | Promise<any>;
}

export const COMMAND_MAP: Record<string, Command> = {
  weather: {
    cmd: "weather",
    title: "Weather",
    description: "Check weather for a city",
    render: (query) => <WeatherCard city={query} />,
    execute: async (args) => args.join(" ") || "Berlin"
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
    render: (query) => {
        const length = parseInt(query) || 12;
        return <PasswordCard length={length} />;
    },
    execute: (args) => {
      const length = Math.min(Math.max(parseInt(args[0]) || 12, 4), 128);
      const all = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
      const pw = Array.from({ length }, () => all[Math.floor(Math.random() * all.length)]).join("");
      navigator.clipboard.writeText(pw);
      return { success: true, value: pw }; // Return object to trigger "Copied" in App.tsx
    }
  },
  hex: {
    cmd: "hex",
    title: "Hex",
    description: "Convert text to Hex or vice versa",
    render: (query) => {
        const result = query ? query.split("").map((c) => c.charCodeAt(0).toString(16)).join(" ") : "";
        navigator.clipboard.writeText(result);
        return <HexCard input={query} result={result} />;
    },
    execute: async (args) => {
        const input = args.join(" ");
        const result = input ? input.split(" ").map((c) => c.charCodeAt(0).toString(16)).join(" ") : "";
        console.log(result);
        navigator.clipboard.writeText(result);
        return { success: true, value: result };
    }
  }
};