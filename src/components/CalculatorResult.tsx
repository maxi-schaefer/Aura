interface CalculatorProps {
  result: string;
  isActive: boolean;
  onMouseEnter: () => void;
}

export const CalculatorResult = ({ result, isActive, onMouseEnter }: CalculatorProps) => (
    <div 
        onMouseEnter={onMouseEnter}
        className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all my-2 ${isActive ? "bg-white/5 border border-white/10" : ""}`}
    >
        <div className="flex items-center gap-2">
            <div className="text-xl gradient-text">＝</div>
            <div className="flex flex-col">
                <span className="-mb-2 text-white text-lg font-light tracking-tight">{result}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">Calculator</span>
            </div>
        </div>
        {isActive && (
            <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-1 rounded border border-white/5">
                Copy ↵
            </span>
        )}
    </div>
);