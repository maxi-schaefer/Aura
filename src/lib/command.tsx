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
        return (<WeatherCard temp={temp} city={city} desc={desc} feelsLike={current.feelsLikeC} />);
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
  }
};