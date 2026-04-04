import { motion } from "framer-motion";
import { 
  AppWindow, FileText, Folder, Calculator, 
  Palette,Command, ExternalLink 
} from "lucide-react";

const getIcon = (type: string, isDir?: boolean) => {
  const iconProps = { size: 16, strokeWidth: 2 };
  switch (type) {
    case "app": return <Command {...iconProps} />;
    case "file": return isDir ? <Folder {...iconProps} /> : <FileText {...iconProps} />;
    case "alias": return <Command {...iconProps} />;
    case "command": return <AppWindow {...iconProps} />;
    case "calc": return <Calculator {...iconProps} />;
    case "color": return <Palette {...iconProps} />;
    default: return <ExternalLink {...iconProps} />;
  }
};

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="min-w-4.5 h-4.5 flex items-center justify-center px-1 rounded-[3px] bg-white/10 border-b border-white/20 text-[10px] font-medium text-fg/50 font-sans shadow-sm">
    {children}
  </kbd>
);

export const ResultItem = ({ id, name, type, isActive, subtitle, onMouseEnter, onClick, icon }: any) => {
    const isFile = type === "file";
    const isDir = isFile && subtitle === "Folder";

    return (
        <motion.div
            data-active={isActive}
            onMouseEnter={onMouseEnter}
            onClick={() => onClick(true)}
            className="relative flex items-center justify-between px-3 py-2 cursor-pointer rounded-md transition-all"
        >
            {isActive && (
                <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-white/5 rounded-md"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
            )}

            <div className="relative z-10 flex items-center gap-3">
                <div className={`transition-all duration-200  ${isActive ? 'opacity-100 text-primary scale-105' : 'opacity-40 text-fg'}`}>
                    {icon ? (
                        typeof icon === "string" ? (
                            <img src={icon} alt="" className="size-5 rounded object-contain" />
                        ) : (
                            (() => {
                                const Icon = icon;
                                return (
                                    <div className="bg-linear-135 from-primary to-secondary text-fg rounded-md p-1">
                                        <Icon size={16} strokeWidth={2} />
                                    </div>
                                )
                            })()
                        )
                    ) : (
                        getIcon(type, isDir)
                    )}
                </div>
                
                <span className={`text-[13px] tracking-tight transition-colors  ${
                    isActive ? 'text-fg' : 'text-fg/60'
                }`}>
                    {name}
                    {isFile && <span className="text-[11px] text-fg/30 ml-1">({id})</span>}
                </span>
            </div>

            <div className="relative z-10 flex items-center gap-4">
                <span className={`text-[11px] font-medium transition-opacity ${
                    isActive ? 'text-fg/40' : 'text-fg/10'
                }`}>
                    {subtitle}
                </span>
                
                {isActive && (
                    <div className="flex items-center opacity-20">
                         <Kbd>↵</Kbd>
                    </div>
                )}
            </div>
        </motion.div>
    );
};