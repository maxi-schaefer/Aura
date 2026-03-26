import Typewriter from "./Typewriter";
import { motion } from "framer-motion";
import { COMMAND_MAP } from "../lib/command"; // Adjust path as needed

export const CommandResult = ({ result }: { result: any }) => {
  const commands = Object.values(COMMAND_MAP);

  // Helper to determine if we should animate as text or render as-is
  const isComponent = result && typeof result !== "string";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 5, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="px-1 py-2 font-mono"  
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">
            System Engine
          </span>
        </div>
        {/* Only show "Press Enter" if it's a string result */}
        {!isComponent && result && (
          <span className="text-[9px] text-gray-500 uppercase tracking-tighter italic">
            Press ↵ to Copy
          </span>
        )}
      </div>

      <div className="text-sm text-white break-all leading-relaxed min-h-5">
        {result ? (
          isComponent ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {result}
            </motion.div>
          ) : (
            <Typewriter text={result} />
          )
        ) : (
          <div className="space-y-2">
            <span className="opacity-40 italic text-xs block mb-2">
              Available System Commands:
            </span>
            {commands.map((cmd) => (
              <div key={cmd.cmd} className="flex items-center justify-start gap-3 group">
                <span className="text-blue-400 font-bold text-xs">{">"} {cmd.cmd}</span>
                <span className="text-gray-500 text-[11px]">{cmd.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};