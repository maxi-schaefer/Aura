import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";

export const CommandWrapper = ({ children, copied, meshColor = "bg-blue-400/20" }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden mt-2 mx-4 p-6 rounded-lg border border-white/20 shadow-2xl bg-white/2 group"
    >
      {/* Animated Mesh */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className={`absolute -top-[50%] -right-[50%] w-[200%] h-[200%] blur-[80px] opacity-30 ${meshColor} pointer-events-none`}
      />

      <div className="relative z-10">{children}</div>

      {/* Success Overlay */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.5, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-green-500/10 border border-green-500/20 px-6 py-3 rounded-2xl flex items-center gap-3"
            >
              <CheckCircle className="size-5 text-green-600" />
              <span className="text-green-600 font-bold tracking-tight">Copied to Clipboard</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};