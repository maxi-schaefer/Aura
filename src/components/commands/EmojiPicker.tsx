import { useEffect, useState, useMemo, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VList, VListHandle } from "virtua";
import emojiData from "unicode-emoji-json";
import { writeText } from '@tauri-apps/plugin-clipboard-manager';


const EMOJIS = Object.entries(emojiData).map(([char, info]: any) => ({
    char,
    name: info.name,
    group: info.group,
}));

const COLUMNS = 10;

const EmojiButton = memo(({ emoji, isSelected, onHover, onClick, forwardRef }: any) => (
    <button
        ref={forwardRef}
        onMouseEnter={onHover}
        onClick={() => onClick(emoji.char)}
        className={`
            relative aspect-square flex items-center justify-center text-2xl
            rounded-xl transition-all duration-200 outline-none
            ${isSelected ? "text-white z-10" : "text-white/60 hover:bg-white/5"}
        `}
    >
        <span className="relative z-10 pointer-events-none">{emoji.char}</span>
        {isSelected && (
            <>
                <div className="absolute inset-0 border border-white/20 rounded-xl pointer-events-none" />
                <div className="absolute inset-0 scale-95 border border-white/10 rounded-xl pointer-events-none" />
            </>
        )}
    </button>
));

export const EmojiPicker = ({ query }: { query: string }) => {
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
    const vListRef = useRef<VListHandle>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

    // Logic to build rows including headers
    const { flatList, rows, rowMetadata } = useMemo(() => {
        const q = query.toLowerCase();
        const filtered = EMOJIS.filter(e => e.name.includes(q));
        
        const groups: Record<string, typeof EMOJIS> = {};
        filtered.forEach(e => {
            if (!groups[e.group]) groups[e.group] = [];
            groups[e.group].push(e);
        });

        const allRows: any[] = [];
        const metadata: any[] = [];
        let currentFlatIdx = 0;

        Object.entries(groups).forEach(([groupName, emojis]) => {
            // Push Header Row
            allRows.push({ type: 'header', label: groupName });
            metadata.push({ type: 'header' });

            // Push Emoji Rows
            for (let i = 0; i < emojis.length; i += COLUMNS) {
                const chunk = emojis.slice(i, i + COLUMNS);
                const rowStartIndex = currentFlatIdx;
                allRows.push({ type: 'emojis', items: chunk, startIndex: rowStartIndex });
                metadata.push({ type: 'emojis', startIndex: rowStartIndex, count: chunk.length });
                currentFlatIdx += chunk.length;
            }
        });

        return { flatList: filtered, rows: allRows, rowMetadata: metadata };
    }, [query]);

    // Keyboard Nav
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!flatList.length) return;
            let next = selectedIdx;
            if (e.key === "ArrowRight") next = Math.min(selectedIdx + 1, flatList.length - 1);
            else if (e.key === "ArrowLeft") next = Math.max(selectedIdx - 1, 0);
            else if (e.key === "ArrowDown") next = Math.min(selectedIdx + COLUMNS, flatList.length - 1);
            else if (e.key === "ArrowUp") next = Math.max(selectedIdx - COLUMNS, 0);
            else if (e.key === "Enter") onCopy(flatList[selectedIdx].char);

            if (next !== selectedIdx) {
                e.preventDefault();
                setSelectedIdx(next);
                
                // Find which virtual row this index belongs to
                const rowIndex = rowMetadata.findIndex(m => 
                    m.type === 'emojis' && next >= m.startIndex && next < m.startIndex + m.count
                );
                if (rowIndex !== -1) {
                    vListRef.current?.scrollToIndex(rowIndex, { align: "center" });
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [flatList, selectedIdx, rowMetadata]);

    useEffect(() => setSelectedIdx(0), [query]);

    const onCopy = (char: string) => {
        setCopyFeedback(char);
        writeText(char);
        setTimeout(() => setCopyFeedback(null), 1000);
    };

    const activeEmoji = flatList[selectedIdx];

    // Position calc with container safety
    const [_, setIndicator] = useState({ top: 0, left: 0, opacity: 0 });

    useEffect(() => {
        const el = itemRefs.current.get(selectedIdx);
        const container = containerRef.current;
        if (el && container) {
            const rect = el.getBoundingClientRect();
            const cRect = container.getBoundingClientRect();
            setIndicator({
                top: rect.top - cRect.top + container.scrollTop,
                left: rect.left - cRect.left,
                opacity: 1
            });
        } else {
            setIndicator(prev => ({ ...prev, opacity: 0 }));
        }
    }, [selectedIdx, rows]); // Update when rows change or selection moves

    return (
        <div className="relative h-112.5 w-full rounded-xl custom-scrollbar border border-white/5 shadow-2xl overflow-hidden font-sans">
            <div 
                ref={containerRef} 
                className="h-full overflow-y-auto custom-scrollbar relative p-4 scroll-smooth"
                onScroll={() => {
                    // Update indicator pos on scroll to prevent "lagging behind"
                    const el = itemRefs.current.get(selectedIdx);
                    const container = containerRef.current;
                    if (el && container) {
                        const rect = el.getBoundingClientRect();
                        const cRect = container.getBoundingClientRect();
                        setIndicator({
                            top: rect.top - cRect.top + container.scrollTop,
                            left: rect.left - cRect.left,
                            opacity: 1
                        });
                    }
                }}
            >

                <VList ref={vListRef} className="z-10 relative custom-scrollbar">
                    {rows.map((row, rowIdx) => (
                        <div key={`${row.type}-${rowIdx}-${query}`}>
                            {row.type === 'header' ? (
                                <div className="py-4 px-2 text-[10px]  uppercase tracking-[0.3em] text-white/20 italic">
                                    {row.label}
                                </div>
                            ) : (
                                <div className="grid grid-cols-10 gap-2 mb-2">
                                    {row.items.map((emoji: any, colIdx: number) => {
                                        const idx = row.startIndex + colIdx;
                                        return (
                                            <EmojiButton
                                                key={emoji.char}
                                                emoji={emoji}
                                                isSelected={idx === selectedIdx}
                                                forwardRef={(el: any) => {
                                                    if (el) itemRefs.current.set(idx, el);
                                                    else itemRefs.current.delete(idx);
                                                }}
                                                onHover={() => setSelectedIdx(idx)}
                                                onClick={onCopy}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </VList>
            </div>

            {/* Footer Info */}
            <div className="absolute bottom-0 inset-x-0 h-12 bg-linear-to-t from-black to-transparent pointer-events-none flex items-center justify-between px-6">
                <span className="text-[10px]  text-white/30 uppercase tracking-widest">
                    {activeEmoji?.name || "Browse"}
                </span>
            </div>

            <AnimatePresence>
                {copyFeedback && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center"
                    >
                        <span className="text-7xl drop-shadow-2xl">{copyFeedback}</span>
                        <span className="text-[10px]  mt-4 text-white/40 tracking-[.5em]">COPIED</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};