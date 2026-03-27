import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { 
  AppWindow, 
  FileText, 
  Folder, 
  Globe, 
  Calculator, 
  Palette, 
  Check,
  Command,
  ExternalLink
} from "lucide-react";

const getIcon = (type: string, isDir?: boolean) => {
  switch (type) {
    case "app": return <AppWindow size={14} />;
    case "file": return isDir ? <Folder size={14} /> : <FileText size={14} />;
    case "alias": return <Globe size={14} />;
    case "command": return <Command size={14} />;
    case "calc": return <Calculator size={14} />;
    case "color": return <Palette size={14} />;
    default: return <ExternalLink size={14} />;
  }
};

interface ResultItemProps {
  name: string;
  type: string;
  subtitle: string | undefined;
  isActive: boolean;
  onMouseEnter: () => void;
  onClick: (fromClick?: boolean) => void;
  globalIndex: number;
}

export const ResultItem = ({ name, type, isActive, subtitle, onMouseEnter, onClick, globalIndex }: ResultItemProps) => {
  const isColorType = type === "color";
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    onClick(true);
    
    // Trigger "Copied" toast animation for clipboard actions
    if (type === "color" || type === "calc" || type === "command") {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <motion.div
      animate={{ 
          x: isActive ? 4 : 0, // Tiny slide to the right
          scale: isActive ? 1.01 : 1, // Micro-zoom
        }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 30 
        }}
      data-index={globalIndex}
      onMouseEnter={onMouseEnter}
      onClick={handleClick}
      className="relative flex items-center justify-between px-3 py-2 cursor-pointer transition-colors duration-150"
    >
      {isActive && (
        <motion.div
          layoutId="active-pill"
          className="absolute inset-0 bg-white/3 rounded-md"
          transition={{ type: "spring", stiffness: 600, damping: 50 }}
        />
      )}

      <div className="relative z-10 flex items-center gap-3">
        <div 
          className={`p-1.5 rounded-md transition-all duration-200 ${
            isActive ? "bg-primary/20 text-primary shadow-[0_0_3px_var(--primary)]" : "text-white/30"
          }`}
        >
          {getIcon(type)}
        </div>
        
        <span className={`text-[13px] tracking-tight transition-colors ${
          isActive ? 'text-white font-medium' : 'text-white/60'
        }`}>
          {name}
        </span>
      </div>

      <div className="relative z-10 flex items-center gap-4">
        {isColorType && (
          <div 
            className="w-4 h-4 rounded-full border border-white/20 shadow-inner" 
            style={{ backgroundColor: name }} 
          />
        )}

        <AnimatePresence mode="wait">
          {copied ? (
            <motion.span
              key="copied"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-[11px] font-sans font-medium text-emerald-400 flex items-center gap-1"
            >
              <Check size={12} strokeWidth={3} />
              Copied!
            </motion.span>
          ) : (
            <motion.span
              key="subtitle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`text-[11px] font-mono uppercase transition-opacity ${
                isActive ? 'opacity-40 text-primary' : 'text-white/20'
              }`}
            >
              {subtitle}
            </motion.span>
          )}
        </AnimatePresence>
        
        <span className={`text-[10px] text-white/20 font-mono transition-opacity ${
          isActive ? 'opacity-100' : 'opacity-0'
        }`}>
          ↵
        </span>
      </div>
    </motion.div>
  );
};