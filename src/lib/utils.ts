import { evaluate } from "mathjs";
import { open } from "@tauri-apps/plugin-shell";

/**
 * Checks if a string is a math expression and returns the result
 */
export const calculateExpression = (query: string): string | null => {
    if (!query) return null;
    
    try {
        // Check for numbers + operators or the "to" keyword for unit conversion
        const isMath = /[0-9]/.test(query) && /[\+\-\*\/\^]/.test(query);
        const isUnit = query.includes(" to ");
        
        if (isMath || isUnit) {
            const res = evaluate(query);
            return res?.toString() || null;
        }
    } catch {
        return null;
    }
    return null;
};

/**
 * Simple helper to scroll an element into view within its parent
 */
export const scrollToActive = (container: HTMLElement | null, index: number) => {
    if (!container) return;
    
    const activeItem = container.querySelector(`[data-index="${index}"]`) as HTMLElement;
    
    if (activeItem) {
        activeItem.scrollIntoView({ 
            block: "nearest", 
        });
    }
};


export const detectColor = (query: string): string | null => {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const rgbRegex = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/;

    if (hexRegex.test(query)) return query;
    
    const rgbMatch = query.match(rgbRegex);
    if (rgbMatch) {
        const [_, r, g, b] = rgbMatch;
        return `#${((1 << 24) + (+r << 16) + (+g << 8) + +b).toString(16).slice(1)}`;
    }

    return null;
};

export const handleLinkClick = async (url: string) => {
  await open(url);
};
