import Typewriter from "./Typewriter";
import { motion } from "framer-motion";

export const CommandResult = ({ result }: { result: string | null }) => (
  <motion.div 
    initial={{ opacity: 0, y: 5, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    className="px-3 py-4 rounded-lg bg-blue-500/5 border border-blue-500/20 my-2 font-mono shadow-[0_0_15px_rgba(249,115,22,0.05)]"
  >
    <div className="flex justify-between items-center mb-2">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">
          System Engine
        </span>
      </div>
      {result && (
        <span className="text-[9px] text-gray-500 uppercase tracking-tighter italic">
          Press ↵ to Copy
        </span>
      )}
    </div>

    <div className="text-sm text-white break-all leading-relaxed min-h-5">
      {result ? (
        <Typewriter text={result} />
      ) : (
        <span className="opacity-40 italic text-xs">
          Waiting for valid command... (e.g. {">"} b64 hello)
        </span>
      )}
    </div>
  </motion.div>
);