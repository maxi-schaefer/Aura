import { FileText, Folder } from "lucide-react";
import { CalculatorResult } from "./CalculatorResult";
import { ColorResult } from "./ColorResult";
import { CommandResult } from "./CommandResult";
import { ResultItem } from "./ResultItem";
import { FileResult } from "./FileResult";

type FileItem = {
    name: string;
    path: string;
    is_dir: boolean;
}

interface ResultListProps {
    query: string;
    selectedIndex: number;
    filteredApps: any[];
    filteredAliases: [string, string][];
    calculation: string | null;
    detectedColor: string | null;
    commandResult: string | null;
    fileResults: FileItem[] | null;
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
    setSelectedIndex,
    fileResults
}: ResultListProps) => {
    const isAliasMode = query.startsWith("@");
    const isCommandMode = query.startsWith(">");

    const fileCount = fileResults?.length || 0;

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
            {/* Special Results (Calculation/Color) */}
            {detectedColor && <ColorResult color={detectedColor} isActive={selectedIndex === 0} />}
            {calculation && (
                <CalculatorResult
                    result={calculation} 
                    isActive={selectedIndex === 0} 
                    onMouseEnter={() => setSelectedIndex(0)} 
                />
            )}

            {/* File Search Results */}
            {fileResults && fileResults.map((file, i) => {
                const visualIndex = hasSpecialResult ? i + 1 : i;
                return (
                    <FileResult
                        key={file.path}
                        name={file.name}
                        path={file.path}
                        isDir={file.is_dir}
                        isActive={selectedIndex === visualIndex}
                        onMouseEnter={() => setSelectedIndex(visualIndex)}
                        onClick={onExecute}
                    />
                );
            })}
            
            {/* Application Results */}
            {filteredApps.map((item, index) => {
                // Adjust index based on everything above it
                const visualIndex = (hasSpecialResult ? 1 : 0) + fileCount + index;
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

            {/* Browser Fallback */}
            {!hasSpecialResult && fileCount === 0 && filteredApps.length === 0 && query.length > 0 && (
                <ResultItem
                    name={`Search Google for "${query}"`}
                    type="Browser"
                    isActive={selectedIndex === 0}
                    onMouseEnter={() => setSelectedIndex(0)}
                    onClick={onExecute}
                />
            )}
        </>
    );
};