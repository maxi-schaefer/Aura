import { motion } from "framer-motion";

export const WeatherCard = ({ temp, city, desc, feelsLike }: any) => {
  const getIcon = (description: string) => {
    const d = description.toLowerCase();
    if (d.includes("sun") || d.includes("clear")) return "☀️";
    if (d.includes("cloud")) return "☁️";
    if (d.includes("rain") || d.includes("drizzle")) return "🌧️";
    if (d.includes("snow")) return "❄️";
    if (d.includes("thunder")) return "⚡";
    return "🌡️";
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden mt-1 p-4 rounded-[24px] bg-white/[0.03] backdrop-blur-md border border-white/10 shadow-2xl"
    >
      {/* 1. Subtle Inner Glow/Highlight (Static) */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

      {/* 2. Animated Shine Sweeper (New) */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ 
          delay: 0.3,       // Wait for the card fade-in
          duration: 0.75,    // Speed of the sweep
          ease: "easeInOut" // Smooth motion
        }}
        style={{
          background: "linear-gradient(110deg, transparent, white, transparent)",
          opacity: 0.08,     // Keep it very subtle
        }}
        className="absolute inset-0 z-0 pointer-events-none skew-x-[-15deg]"
      />

      <div className="relative z-10"> {/* Ensure content is above the shine */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-white/40 text-[11px] font-bold uppercase tracking-[0.15em] mb-1">
              Weather
            </span>
            <h3 className="text-xl font-semibold text-white tracking-tight">{city}</h3>
            <p className="text-sm text-white/60 capitalize mt-0.5">{desc}</p>
          </div>
          
          <div className="text-4xl filter drop-shadow-lg">
            {getIcon(desc)}
          </div>
        </div>

        <div className="flex items-end justify-between mt-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-light text-white">{temp}</span>
            <span className="text-2xl font-light text-white/50">°</span>
          </div>

          <div className="flex flex-col items-end">
            <div className="flex gap-2 text-[10px] font-medium text-white/40 uppercase tracking-wider">
              <span>L: {temp - 2}°</span>
              <span>H: {temp + 3}°</span>
            </div>
            <span className="text-[11px] text-blue-400 font-medium mt-1">
              Feels like {feelsLike}°
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};