    import { motion } from "framer-motion";

export const LoadingState = () => (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
        {/* Subtle Spinning Ring */}
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-6 h-6 border-2 border-white/10 border-t-white/60 rounded-full"
        />
        <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] gradient-text uppercase tracking-[0.2em] font-medium"
        >
            Indexing Applications...
        </motion.span>
    </div>
);