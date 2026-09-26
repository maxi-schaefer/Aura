import { open } from "@tauri-apps/plugin-shell";
import { parseColor, toHex } from "./color";

/**
 * Canonical hex for a query that explicitly spells out a colour.
 *
 * Colour names are excluded on purpose: "red" and "gold" are ordinary
 * search terms, so only #hex, rgb() and hsl() produce an inline result.
 */
export const detectColor = (query: string): string | null => {
    const rgb = parseColor(query, { allowNames: false });
    return rgb ? toHex(rgb) : null;
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