export const ColorResult = ({ color, isActive }: { color: string; isActive: boolean }) => (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg my-2 ${isActive ? "bg-white/5 border border-white/10" : ""}`}>
        <div 
            className="w-10 h-10 inset-0 rounded-md border border-white/20 shadow-inner" 
            style={{ backgroundColor: color }} 
        />
        <div className="flex flex-col">
            <span className="text-sm font-mono text-white uppercase">{color}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                Color Preview • Press <span className="gradient-text">↵ to Copy</span>
            </span>
        </div>
    </div>
);