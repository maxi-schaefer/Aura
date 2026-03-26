import { motion } from "framer-motion";
import { Cpu, Zap, Activity } from "lucide-react";

export const StatsWidget = ({ cpu, ram, network }: any) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-[800px] mt-4 p-6 rounded-[32px] border border-white/10 bg-white/[0.02] flex gap-6 items-center overflow-hidden relative group"
    >
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-500/5 via-emerald-500/5 to-purple-500/5 pointer-events-none" />

      {/* CPU Section */}
      <div className="flex-1 space-y-3 relative z-10">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/30">
          <span className="flex items-center gap-2"><Cpu size={12} className="text-blue-400" /> Processor</span>
          <span className="text-blue-400">{cpu}%</span>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-[1px]">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${cpu}%` }}
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
          />
        </div>
      </div>

      {/* Vertical Divider */}
      <div className="h-10 w-[1px] bg-white/10" />

      {/* RAM Section */}
      <div className="flex-1 space-y-3 relative z-10">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/30">
          <span className="flex items-center gap-2"><Activity size={12} className="text-emerald-400" /> Memory</span>
          <span className="text-emerald-400">{ram}%</span>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-[1px]">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${ram}%` }}
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" 
          />
        </div>
      </div>

      {/* Stats Summary Bubble */}
      <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center min-w-[80px]">
         <Zap size={16} className="text-yellow-400 mb-1" />
         <span className="text-[10px] font-black text-white/80 uppercase">Turbo</span>
      </div>
    </motion.div>
  );
};