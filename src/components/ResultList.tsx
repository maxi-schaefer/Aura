import { Result } from "../types/result";
import { ResultItem } from "./ResultItem";
import { useMemo } from "react";

interface Props {
    results: Result[];
    selectedIndex: number;
    setSelectedIndex: (i: number) => void;
    onExecute: (fromClick?: boolean) => void;
}

export const ResultList = ({ results, selectedIndex, setSelectedIndex, onExecute }: Props) => {
    // Group results and keep track of their original index in the results array
    const grouped = useMemo(() => {
        const groups: Record<string, { item: Result; globalIndex: number }[]> = {};
        results.forEach((item, globalIndex) => {
            if (!groups[item.group]) groups[item.group] = [];
            groups[item.group].push({ item, globalIndex });
        });
        return groups;
    }, [results]);

    return (
        <div className="flex flex-col pb-2">
            {Object.entries(grouped).map(([group, entries]) => (
                <div key={group} className="mt-2">
                    <header className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-white/20 font-bold font-mono">
                        {group}
                    </header>
                    <div className="space-y-0.5">
                        {entries.map(({ item, globalIndex }) => (
                            <ResultItem
                                id={item.id}
                                globalIndex={globalIndex}
                                key={item.id}
                                name={item.title}
                                subtitle={item.subtitle}
                                type={item.type}
                                isActive={selectedIndex === globalIndex}
                                onMouseEnter={() => setSelectedIndex(globalIndex)}
                                onClick={onExecute}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};