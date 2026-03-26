import { motion } from "framer-motion";
import { FileText, Folder } from "lucide-react";

interface FileResultProps {
  name: string;
  path: string;
  isDir: boolean;
  isActive: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}

export const FileResult = ({ name, path, isDir, isActive, onMouseEnter, onClick }: FileResultProps) => (
  <div
    onMouseEnter={onMouseEnter}
    onClick={onClick}
    className="relative flex items-center justify-between px-3 py-2 cursor-pointer transition-colors duration-150 group"
  >
    {/* Minimal Selection Pill */}
    {isActive && (
      <motion.div
        layoutId="active-pill"
        className="absolute inset-0 bg-white/5 rounded-md"
        transition={{ type: "spring", stiffness: 600, damping: 50 }}
      />
    )}

    <div className="relative z-10 flex items-center gap-3 overflow-hidden">
      {/* Dynamic Icon with soft color */}
      <div className={`transition-colors ${isActive ? 'text-blue-400' : 'text-white/20'}`}>
        {isDir ? <Folder size={14} strokeWidth={2.5} /> : <FileText size={14} strokeWidth={2.5} />}
      </div>
      
      <div className="relative flex flex-col overflow-hidden">
        <span className={`text-[13px] tracking-tight truncate transition-colors ${
          isActive ? 'text-white font-medium' : 'text-white/60'
        }`}>
          {name}
        </span>
        <span className="text-[11px] tracking-tight -mt-0.5 text-white/40">
          {path}
        </span>
      </div>
    </div>

    <div className="relative z-10 flex items-center gap-4 flex-shrink-0">
      <span className={`text-[10px] font-mono uppercase tracking-widest transition-opacity ${
        isActive ? 'opacity-40 text-blue-500' : 'opacity-10 text-white'
      }`}>
        {isDir ? 'Folder' : 'File'}
      </span>
      
      <span className={`text-[10px] text-white/20 font-mono transition-opacity ${
        isActive ? 'opacity-100' : 'opacity-0'
      }`}>
        ↵
      </span>
    </div>
  </div>
);