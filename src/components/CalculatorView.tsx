// components/CalculatorView.tsx
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface CalculatorViewProps {
  query: string;
  result: string;
  fromLabel?: string;
  toLabel?: string;
}

export const CalculatorView = ({ query, result, fromLabel, toLabel }: CalculatorViewProps) => {
  const parts = query.toLowerCase().split(/\s+(to|in|=)\s+/);
  const inputAmount = parts[0] || query;

  return (
    <div className="w-full py-12 px-8 flex flex-col items-center justify-center border border-white/5 bg-white/2 rounded-xl overflow-hidden">
      <div className="w-full max-w-2xl flex items-center justify-between gap-8">
        
        {/* Left Side: Input */}
        <div className="flex-1 flex flex-col items-center">
          <h2 className="text-4xl font-semibold tracking-tight text-fg flex items-center gap-3">
            {inputAmount}
          </h2>
          {fromLabel && (
            <span className="mt-4 px-2 py-1 rounded bg-white/5 text-[10px] uppercase tracking-wider text-fg/40 font-bold">
              {fromLabel}
            </span>
          )}
        </div>

        {/* Center: Arrow/Divider */}
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-px bg-white/5" />
          <div className="relative">
             <ArrowRight size={20} className="text-fg" />
          </div>
          <div className="h-12 w-px bg-white/5" />
        </div>

        {/* Right Side: Result */}
        <div className="flex-1 flex flex-col items-center">
          <h2 className="text-4xl font-semibold tracking-tight text-fg">
            {result}
          </h2>
          {toLabel && (
            <span className="mt-4 px-2 py-1 rounded bg-white/5 text-[10px] uppercase tracking-wider text-white/40 font-bold">
              {toLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};