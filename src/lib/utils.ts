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

export const parseTimerString = (str: string): number => {
    const units: Record<string, number> = {
        h: 3600,
        m: 60,
        s: 1,
    };

    // Regex matches numbers followed by h, m, or s (e.g., "1h", "10m", "5s")
    const matches = str.toLowerCase().matchAll(/(\d+)(h|m|s)/g);
    let totalSeconds = 0;
    let hasMatch = false;

    for (const match of matches) {
        hasMatch = true;
        const value = parseInt(match[1]);
        const unit = match[2];
        totalSeconds += value * units[unit];
    }

    // Fallback: If no units found (like just "10"), treat as minutes for backward compatibility
    if (!hasMatch) {
        return (parseInt(str) || 0) * 60;
    }

    return totalSeconds;
};