export const ColorResult = ({ color, isActive }: { color: string; isActive: boolean }) => (
  <div className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${
    isActive ? "bg-white/[0.04] border border-white/10 shadow-xl" : "bg-white/[0.01] border border-transparent"
  }`}>
    <div 
      className="w-12 h-12 rounded-xl border border-white/20 shadow-2xl relative group"
      style={{ backgroundColor: color }} 
    >
      {/* Inner reflection on the swatch */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl" />
    </div>

    <div className="flex flex-col flex-1">
      <div className="flex items-center gap-2">
        <span className="text-lg font-mono font-medium text-white uppercase tracking-tight">{color}</span>
        <div className="h-1 w-1 rounded-full bg-gray-600" />
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Color Mode</span>
      </div>
      <span className="text-[11px] text-gray-400 italic">
        Press <span className="text-blue-400 font-bold">↵</span> to copy hex code
      </span>
    </div>
  </div>
);