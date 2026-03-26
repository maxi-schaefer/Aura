import { SpeedtestResult } from "../components/commands/SpeedtestResult";
import { WeatherCard } from "../components/commands/WeatherCard";

export interface Command {
    cmd: string;
    description: string;
    execute: (args: string[]) => any | Promise<any>;
}

export const COMMAND_MAP: Record<string, Command> = {
  b64: {
    cmd: "b64",
    description: "Auto-detect Base64 encode/decode",
    execute: (args) => {
      const input = args.join(" ");
      if (!input) return "Enter text to encode or decode...";

      try {
        const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(input);
        
        if (isBase64) {
          const decoded = atob(input);
          const isPrintable = /^[\x20-\x7E\r\n\t]*$/.test(decoded);
          
          if (isPrintable && decoded.length > 0) {
            return decoded; 
          }
        }
        return btoa(input);
      } catch (e) {
        return btoa(input);
      }
    },
  },
  weather: {
    cmd: "weather",
    description: "Get weather for a city: > weather [city]",
    execute: async (args) => {
      const city = args.join(" ") || "Berlin"; // Default city
      try {
        // Fetching from wttr.in (JSON format)
        const res = await fetch(`https://wttr.in/${city}?format=j1`);
        const data = await res.json();
        
        const current = data.current_condition[0];
        const temp = current.temp_C;
        const desc = current.weatherDesc[0].value;

        // Returning a Component instead of a string
        return (<WeatherCard temp={temp} city={city} desc={desc} feelsLike={current.FeelsLikeC} />);
      } catch (e) {
        return `Failed to fetch weather for ${city}`;
      }
    }
  },
  speedtest: {
    cmd: "speedtest",
    description: "Run a full network speed test (Ping, Down, Up)",
    execute: () => {
      return <SpeedtestResult />;
    }
  },
  password: {
    cmd: "password",
    description: "Generate a secure password: > password [length]",
    execute: (args) => {
      const length = Math.min(Math.max(parseInt(args[0]) || 12, 4), 128);

      const lower = "abcdefghijklmnopqrstuvwxyz";
      const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const numbers = "0123456789";
      const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

      const all = lower + upper + numbers + symbols;

      let password = "";
      for (let i = 0; i < length; i++) {
        password += all[Math.floor(Math.random() * all.length)];
      }

      return password;
    }
  },
  hex: {
    cmd: "hex",
    description: "Encode/decode hex: > hex [text]",
    execute: (args) => {
      const input = args.join(" ");
      if (!input) return "Enter text to encode or decode...";

      const isHex = /^[0-9a-fA-F\s]+$/.test(input);

      try {
        if (isHex) {
          // Decode hex → string
          const cleaned = input.replace(/\s+/g, "");
          const bytes = cleaned.match(/.{1,2}/g);
          if (!bytes) throw new Error();

          const decoded = bytes
            .map((byte) => String.fromCharCode(parseInt(byte, 16)))
            .join("");

          const isPrintable = /^[\x20-\x7E\r\n\t]*$/.test(decoded);

          if (isPrintable) return decoded;
        }

        // Encode string → hex
        return input
          .split("")
          .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join(" ");
      } catch {
        return input
          .split("")
          .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join(" ");
      }
    }
  }
};