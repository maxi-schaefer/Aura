import { motion } from "framer-motion";

export const WeatherCard = ({ temp, city, desc, feelsLike }: any) => {
  const getWeatherTheme = (description: string) => {
    const d = description.toLowerCase();
    if (d.includes("sun") || d.includes("clear")) 
      return { 
        icon: "☀️", 
        accent: "text-orange-400",
        bg: "from-orange-500/20 via-yellow-500/10 to-transparent",
        mesh: "bg-gradient-conic from-orange-400/40 via-yellow-400/20 to-orange-400/40"
      };
    if (d.includes("cloud")) 
      return { 
        icon: "☁️", 
        accent: "text-blue-300",
        bg: "from-slate-400/20 via-blue-400/10 to-transparent",
        mesh: "bg-gradient-conic from-blue-400/30 via-slate-400/20 to-blue-400/30"
      };
    // ... add others as needed
    return { icon: "🌡️", accent: "text-white", bg: "from-white/10", mesh: "bg-white/10" };
  };

  const theme = getWeatherTheme(desc);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden mt-2 p-6 rounded-[32px] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] group"
      style={{ background: 'rgba(255, 255, 255, 0.01)' }}
    >
      {/* 1. THE COLOR MESH (Rotating Background) */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className={`absolute -top-[50%] -right-[50%] w-[200%] h-[200%] blur-[80px] opacity-40 ${theme.mesh} pointer-events-none`}
      />

      {/* 2. STATIC GLASS REFLECTION */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 opacity-30 pointer-events-none" />

      {/* 3. CONTENT LAYER */}
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start">
          <div>
            <motion.div 
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-2 mb-2"
            >
               <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter bg-white/10 ${theme.accent} border border-white/5`}>
                 Hyper-Local
               </span>
            </motion.div>
            <h3 className="text-3xl font-black text-white tracking-tighter leading-none">{city}</h3>
            <p className="text-sm font-medium text-white/60 mt-1 flex items-center gap-2">
                {desc} <span className="w-1 h-1 rounded-full bg-white/20" /> {temp + 4}° Humidity
            </p>
          </div>
          
          <motion.div 
            whileHover={{ scale: 1.2, rotate: 10 }}
            className="text-6xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)] cursor-default select-none"
          >
            {theme.icon}
          </motion.div>
        </div>

        <div className="flex items-end justify-between mt-10">
          <div className="relative">
            {/* Soft Glow behind temp */}
            <div className={`absolute inset-0 blur-2xl opacity-50 ${theme.accent.replace('text', 'bg')}`} />
            <span className="relative text-7xl font-black text-white tracking-tighter">
              {temp}<span className="text-4xl align-top inline-block mt-2 opacity-30">°</span>
            </span>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-col items-end leading-tight">
               <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Feels Like</span>
               <span className={`text-xl font-black ${theme.accent}`}>{feelsLike}°C</span>
            </div>
            
            {/* Visual Min/Max Bar */}
            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden flex border border-white/5">
                <div className="h-full w-1/3 bg-blue-400/40" />
                <div className="h-full w-1/3 bg-orange-400/60" />
                <div className="h-full w-1/3 bg-red-400/40" />
            </div>
          </div>
        </div>
      </div>
      
      {/* 4. INTERACTIVE HOVER BORDER */}
      <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/10 transition-colors duration-500 rounded-[32px] pointer-events-none" />
    </motion.div>
  );
};