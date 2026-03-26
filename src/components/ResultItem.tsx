import { motion } from "framer-motion";

interface ResultItemProps {
  name: string;
  type: string;
  isActive: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}


interface ResultItemProps {
  name: string;
  type: string;
  isActive: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}


export const ResultItem = ({ name, type, isActive, onMouseEnter, onClick }: ResultItemProps) => (
  <div
    onMouseEnter={onMouseEnter}
    onClick={onClick}
    className="relative flex items-center justify-between px-3 py-2 cursor-pointer transition-colors duration-150"
  >
    {/* Minimal Selection: Just a soft color change, no border/shadow */}
    {isActive && (
      <motion.div
        layoutId="active-pill"
        className="absolute inset-0 bg-white/5 rounded-md"
        transition={{ type: "spring", stiffness: 600, damping: 50 }}
      />
    )}

    <div className="relative z-10 flex items-center gap-3">
      {/* Type Indicator: Tiny Dot instead of a box */}
      <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
        isActive ? 'bg-blue-400' : 'bg-white/10'
      }`} />
      
      <span className={`text-[13px] tracking-tight transition-colors ${
        isActive ? 'text-white font-medium' : 'text-white/60'
      }`}>
        {name}
      </span>
    </div>

    {/* Metadata: Pushed to the right, very dim */}
    <div className="relative z-10 flex items-center gap-4">
      <span className={`text-[11px] font-mono uppercase tracking-widest transition-opacity ${
        isActive ? 'opacity-40 text-blue-400' : 'opacity-20 text-white'
      }`}>
        {type}
      </span>
      
      {/* Hidden until active */}
      <span className={`text-[10px] text-white/20 font-mono transition-opacity ${
        isActive ? 'opacity-100' : 'opacity-0'
      }`}>
        ↵
      </span>
    </div>
  </div>
);