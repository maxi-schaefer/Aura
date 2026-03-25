import { motion } from "framer-motion";

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
        className="relative flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer group mb-0.5"
    >
        {isActive && (
            <motion.div
                layoutId="active-pill"
                className="absolute inset-0 bg-gray-500/5 border border-white/10 rounded-lg"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
            />
        )}
        <div className="relative z-10 flex flex-col">
            <span className={`text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-400'}`}>{name}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-tight">{type}</span>
        </div>
        {isActive && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 text-xs text-gray-400">
                ↵
            </motion.span>
        )}
    </div>
);