import Typewriter from "./Typewriter";
import { motion } from "framer-motion";
import { COMMAND_MAP } from "../lib/command"; // Adjust path as needed

export const CommandResult = ({ result }: { result: any }) => {
  const commands = Object.values(COMMAND_MAP);
  const isComponent = result && typeof result !== "string" && !Array.isArray(result);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-1 py-2 font-mono"  
    >
      <div className="flex justify-between items-center">        
        {/* Only show "Copy" hint for text results */}
        {!isComponent && result && (
          <span className="text-[9px] text-white/20 uppercase tracking-tighter italic bg-white/5 px-2 py-0.5 rounded-full">
            Press ↵ to Copy
          </span>
        )}
      </div>

      <div className="text-sm text-white leading-relaxed min-h-5">
        {result ? (
          isComponent ? (
            <div className="w-full overflow-hidden">
                {result}
            </div>
          ) : (
            <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 text-blue-100/90 break-all">
               <Typewriter text={result} />
            </div>
          )
        ) : (
          <div className="space-y-2">
            <span className="text-white/20 font-bold text-[10px] uppercase tracking-widest block mb-3">
              Available Modules
            </span>
            <div className="grid grid-cols-1 gap-1">
              {commands.map((cmd) => (
                <div key={cmd.cmd} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/3 transition-colors group">
                  <span className="text-blue-400 font-bold text-xs">{">"} {cmd.cmd}</span>
                  <span className="text-gray-500 text-[11px] group-hover:text-gray-300 transition-colors">{cmd.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};