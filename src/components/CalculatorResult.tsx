import { motion } from "framer-motion"

interface CalculatorProps {
  result: string;
  isActive: boolean;
  onMouseEnter: () => void;
}

export const CalculatorResult = ({ result, isActive, onMouseEnter }: CalculatorProps) => (
  <div 
    onMouseEnter={onMouseEnter}
    className={`relative flex items-center justify-between px-4 py-4 rounded-2xl transition-all overflow-hidden ${
      isActive ? "bg-white/[0.04] border border-white/10 shadow-xl" : "bg-white/[0.01] border border-transparent"
    }`}
  >
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
        <span className="text-orange-500 text-lg font-bold">＝</span>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] text-orange-500/70 uppercase tracking-[0.2em] font-bold">Calculator</span>
        <span className="text-2xl font-light text-white tracking-tight">{result}</span>
      </div>
    </div>
    
    {isActive && (
      <motion.span 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="text-[9px] text-white/40 uppercase font-bold tracking-widest bg-white/5 px-2 py-1 rounded-md border border-white/10"
      >
        Copy Result ↵
      </motion.span>
    )}
  </div>
);