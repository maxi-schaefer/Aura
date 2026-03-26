import { CalculatorResult } from "./CalculatorResult";
import { ColorResult } from "./ColorResult";
import { CommandResult } from "./CommandResult";
import { ResultItem } from "./ResultItem";

interface ResultListProps {
    query: string;
    selectedIndex: number;
    filteredApps: any[];
    filteredAliases: [string, string][];
    calculation: string | null;
    detectedColor: string | null;
    commandResult: string | null;
    onExecute: () => void;
    setSelectedIndex: (i: number) => void;
}

export const ResultList = ({
    query,
    selectedIndex,
    filteredApps,
    filteredAliases,
    calculation,
    detectedColor,
    commandResult,
    onExecute,
    setSelectedIndex
}: ResultListProps) => {
    const isAliasMode = query.startsWith("@");
    const isCommandMode = query.startsWith(">");

    // 1. Alias Mode Logic
    if (isAliasMode) {
        return (
        <>
            {filteredAliases.map(([key, url], index) => (
            <ResultItem
                key={key}
                name={`@${key}`}
                type={url}
                isActive={selectedIndex === index}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={onExecute}
            />
            ))}
        </>
        );
    }

    // 2. Command Mode Logic
    if (isCommandMode) {
        return <CommandResult result={commandResult} />;
    }

    // 3. Standard Search Mode Logic
    const hasSpecialResult = !!(calculation || detectedColor);
    
    return (
        <>
        {detectedColor && <ColorResult color={detectedColor} isActive={selectedIndex === 0} />}
        {calculation && (
            <CalculatorResult
                result={calculation} 
                isActive={selectedIndex === 0} 
                onMouseEnter={() => setSelectedIndex(0)} 
            />
        )}
        
        {filteredApps.map((item, index) => {
            const visualIndex = hasSpecialResult ? index + 1 : index;
            return (
            <ResultItem
                key={item.path}
                name={item.name}
                type="Application"
                isActive={selectedIndex === visualIndex}
                onMouseEnter={() => setSelectedIndex(visualIndex)}
                onClick={onExecute}
            />
            );
        })}

        {!hasSpecialResult && filteredApps.length === 0 && query.length > 0 && (
            <ResultItem
            name={`Browse for "${query}"`}
            type="Browser"
            isActive={selectedIndex === 0}
            onMouseEnter={() => setSelectedIndex(0)}
            onClick={onExecute}
            />
        )}
        </>
    );
};