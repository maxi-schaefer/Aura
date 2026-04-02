import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface WeatherCardProps {
    city: string;
}

export const WeatherCard = ({ city }: WeatherCardProps) => {
    // We use a local state for the "active" location which might be coords or a name
    const [resolvedLocation, setResolvedLocation] = useState(city);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState(false);

    // Effect 1: Handle Initial Auto-Detection
    useEffect(() => {
        if (!city && "geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setResolvedLocation(`${latitude},${longitude}`);
                },
                () => {
                    // Fallback: If denied, resolvedLocation stays "" 
                    // and wttr.in uses IP-based location automatically.
                    setResolvedLocation("");
                }
            );
        } else {
            setResolvedLocation(city);
        }
    }, [city]);

    // Effect 2: Fetch Data based on resolvedLocation
    useEffect(() => {
        const timer = setTimeout(async () => {
            try {
                // Fetching with an empty string after the slash triggers IP-location on wttr.in
                const res = await fetch(`https://wttr.in/${resolvedLocation}?format=j1`);
                const json = await res.json();
                setData(json);
                setError(false);
            } catch {
                setData(null);
                setError(true);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [resolvedLocation]);

    // Helper functions for UI (Icons and Themes)
    const getMiniIcon = (desc: string) => {
        const d = desc.toLowerCase();
        if (d.includes("sun") || d.includes("clear")) return "☀️";
        if (d.includes("cloud") || d.includes("overcast")) return "☁️";
        if (d.includes("rain") || d.includes("drizzle")) return "🌧️";
        if (d.includes("snow")) return "❄️";
        return "🌡️";
    };

    const getWeatherTheme = (desc: string) => {
        const d = desc.toLowerCase();
        if (d.includes("sun") || d.includes("clear"))
            return { icon: "☀️", accent: "text-orange-400", mesh: "bg-gradient-conic from-orange-400/40 via-yellow-400/20 to-orange-400/40" };
        if (d.includes("cloud") || d.includes("overcast"))
            return { icon: "☁️", accent: "text-blue-300", mesh: "bg-gradient-conic from-blue-400/30 via-slate-400/20 to-blue-400/30" };
        if (d.includes("rain") || d.includes("drizzle"))
            return { icon: "🌧️", accent: "text-blue-500", mesh: "bg-gradient-conic from-blue-500/40 via-indigo-500/20 to-blue-500/40" };
        return { icon: "🌡️", accent: "text-fg", mesh: "bg-white/10" };
    };

    if (error) return <div className="p-4 ml-4 text-red-400 font-medium">Failed to load weather.</div>;
    if (!data) return <div className="p-4 ml-4 text-fg/20 animate-pulse font-medium">Locating weather...</div>;

    const current = data.current_condition[0];
    const theme = getWeatherTheme(current.weatherDesc[0].value);
    const forecast = data.weather.slice(0, 3);
    
    // Crucial: Use the name returned by the API (e.g. "San Francisco") 
    // instead of the raw query (e.g. "37.7,-122.4")
    const cityName = data.nearest_area[0].areaName[0].value;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden mt-2 mx-4 p-6 rounded-4xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] group" style={{ background: "rgba(255, 255, 255, 0.01)" }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className={`absolute -top-[50%] -right-[50%] w-[200%] h-[200%] blur-[80px] opacity-30 ${theme.mesh} pointer-events-none`} />

            <div className="relative z-10 flex flex-col gap-6">
                <div className="flex justify-between items-start">
                    <div>
                        <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${theme.accent} opacity-80`}>Current Conditions</div>
                        <h3 className="text-4xl font-black text-fg tracking-tighter capitalize">{cityName}</h3>
                        <p className="text-sm font-medium text-fg/50 mt-1">{current.weatherDesc[0].value} • {current.humidity}% Humidity</p>
                    </div>
                    <div className="text-6xl drop-shadow-2xl">{theme.icon}</div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-start">
                        <span className="text-8xl font-black text-fg tracking-tighter">{current.temp_C}</span>
                        <span className="text-4xl font-bold text-fg/30 mt-4 ml-1">°C</span>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-fg/30 uppercase font-bold tracking-widest">Feels Like</p>
                        <p className={`text-2xl font-black ${theme.accent}`}>{current.FeelsLikeC}°</p>
                    </div>
                </div>

                <div className="h-px w-full bg-white/10" />

                <div className="grid grid-cols-3 gap-4">
                    {forecast.map((day: any, i: number) => (
                        <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-2xl bg-white/5 border border-white/5">
                            <span className="text-[10px] font-bold text-fg/40 uppercase">
                                {i === 0 ? "Today" : new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
                            </span>
                            <span className="text-xl">{getMiniIcon(day.hourly[4].weatherDesc[0].value)}</span>
                            <div className="flex gap-2 text-xs font-black">
                                <span className="text-fg">{day.maxtempC}°</span>
                                <span className="text-fg/30">{day.mintempC}°</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};