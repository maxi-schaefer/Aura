import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export const WeatherCard = ({ city }: { city: string }) => {
  const [data, setData] = useState<any>(null);

  // Helper for mini-icons in the forecast row
  const getMiniIcon = (desc: string) => {
    const d = desc.toLowerCase();
    if (d.includes("sun") || d.includes("clear")) return "☀️";
    if (d.includes("cloud") || d.includes("overcast")) return "☁️";
    if (d.includes("rain") || d.includes("drizzle")) return "🌧️";
    if (d.includes("snow")) return "❄️";
    return "🌡️";
  };

  const getWeatherTheme = (description: string) => {
    const d = description.toLowerCase();
    if (d.includes("sun") || d.includes("clear"))
      return {
        icon: "☀️",
        accent: "text-orange-400",
        mesh: "bg-gradient-conic from-orange-400/40 via-yellow-400/20 to-orange-400/40",
      };
    if (d.includes("cloud") || d.includes("overcast"))
      return {
        icon: "☁️",
        accent: "text-blue-300",
        mesh: "bg-gradient-conic from-blue-400/30 via-slate-400/20 to-blue-400/30",
      };
    if (d.includes("rain") || d.includes("drizzle"))
      return {
        icon: "🌧️",
        accent: "text-blue-500",
        mesh: "bg-gradient-conic from-blue-500/40 via-indigo-500/20 to-blue-500/40",
      };
    return { icon: "🌡️", accent: "text-white", mesh: "bg-white/10" };
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://wttr.in/${city}?format=j1`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Weather fetch failed", err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [city]);

  if (!data) return <div className="p-4 ml-4 text-white/20 animate-pulse font-medium">Loading forecast for {city}...</div>;

  const current = data.current_condition[0];
  const theme = getWeatherTheme(current.weatherDesc[0].value);
  const forecast = data.weather.slice(0, 3); // Get next 3 days

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden mt-2 mx-4 p-6 rounded-[32px] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] group"
      style={{ background: "rgba(255, 255, 255, 0.01)" }}
    >
      {/* 1. ANIMATED MESH BACKGROUND */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className={`absolute -top-[50%] -right-[50%] w-[200%] h-[200%] blur-[80px] opacity-30 ${theme.mesh} pointer-events-none`}
      />

      {/* 2. CONTENT */}
      <div className="relative z-10 flex flex-col gap-6">
        {/* TOP ROW: City & Main Icon */}
        <div className="flex justify-between items-start">
          <div>
            <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${theme.accent} opacity-80`}>
              Current Conditions
            </div>
            <h3 className="text-4xl font-black text-white tracking-tighter capitalize">
              {city || "Berlin"}
            </h3>
            <p className="text-sm font-medium text-white/50 mt-1">
              {current.weatherDesc[0].value} • {current.humidity}% Humidity
            </p>
          </div>
          <div className="text-6xl drop-shadow-2xl">{theme.icon}</div>
        </div>

        {/* MIDDLE ROW: Temperature */}
        <div className="flex items-center justify-between">
          <div className="flex items-start">
            <span className="text-8xl font-black text-white tracking-tighter">
              {current.temp_C}
            </span>
            <span className="text-4xl font-bold text-white/30 mt-4 ml-1">°C</span>
          </div>
          
          <div className="text-right">
             <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Feels Like</p>
             <p className={`text-2xl font-black ${theme.accent}`}>{current.FeelsLikeC}°</p>
          </div>
        </div>

        {/* SEPARATOR */}
        <div className="h-[1px] w-full bg-white/10" />

        {/* BOTTOM ROW: 3-Day Forecast */}
        <div className="grid grid-cols-3 gap-4">
          {forecast.map((day: any, i: number) => (
            <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-[10px] font-bold text-white/40 uppercase">
                {i === 0 ? "Today" : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className="text-xl">{getMiniIcon(day.hourly[4].weatherDesc[0].value)}</span>
              <div className="flex gap-2 text-xs font-black">
                <span className="text-white">{day.maxtempC}°</span>
                <span className="text-white/30">{day.mintempC}°</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};