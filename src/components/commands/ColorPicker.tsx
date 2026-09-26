import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { Check, Copy, Pipette } from "lucide-react";
import {
    Rgb,
    contrastRatio,
    nameOf,
    parseColor,
    readableTextColor,
    shades,
    toHex,
    toHslString,
    toRgbString,
} from "../../lib/color";

const DEFAULT_COLOR = "#7c5cff";

const WHITE: Rgb = { r: 255, g: 255, b: 255, a: 1 };
const BLACK: Rgb = { r: 0, g: 0, b: 0, a: 1 };

/** WCAG 2.1 thresholds for normal-size text. */
const AA = 4.5;
const AAA = 7;

const ContrastBadge = ({ label, ratio }: { label: string; ratio: number }) => {
    const grade = ratio >= AAA ? "AAA" : ratio >= AA ? "AA" : "Fail";
    const tone =
        ratio >= AAA
            ? "text-emerald-300 bg-emerald-400/10"
            : ratio >= AA
              ? "text-amber-300 bg-amber-400/10"
              : "text-red-300 bg-red-400/10";

    return (
        <div className="flex items-center gap-2">
            <span className="text-[11px] text-fg/30 w-12">{label}</span>
            <span className="text-[12px] tabular-nums text-fg/70 w-12">
                {ratio.toFixed(2)}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${tone}`}>
                {grade}
            </span>
        </div>
    );
};

export const ColorPicker = ({ query }: { query: string }) => {
    const [picked, setPicked] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [pickError, setPickError] = useState<string | null>(null);

    // A new query means the user is typing a colour, so drop any screen pick.
    useEffect(() => {
        setPicked(null);
        setPickError(null);
    }, [query]);

    useEffect(() => {
        if (!copied) return;
        const timer = setTimeout(() => setCopied(null), 1200);
        return () => clearTimeout(timer);
    }, [copied]);

    const source = (picked ?? query).trim();
    const color = useMemo(
        () => parseColor(source || DEFAULT_COLOR, { allowBareHex: true }),
        [source]
    );

    const canPick = typeof window !== "undefined" && typeof window.EyeDropper === "function";

    const pickFromScreen = async () => {
        if (!window.EyeDropper) return;
        setPickError(null);
        try {
            const { sRGBHex } = await new window.EyeDropper().open();
            setPicked(sRGBHex);
        } catch {
            // Closing the picker with Escape rejects; that is not an error.
        }
    };

    const copy = async (value: string) => {
        await writeText(value);
        setCopied(value);
    };

    const pickButton = (
        <button
            onClick={pickFromScreen}
            disabled={!canPick}
            title={canPick ? "Pick a colour from anywhere on screen" : "Not supported by this webview"}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-[12px] text-fg/70 transition-colors enabled:hover:bg-white/10 enabled:hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
            <Pipette size={14} />
            Pick from screen
        </button>
    );

    if (!color) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <div className="text-[13px] text-fg/50">
                    <span className="text-fg/80 font-medium">{source}</span> is not a colour
                </div>
                <div className="text-[11px] text-fg/25 leading-relaxed">
                    Try <span className="text-fg/50 font-mono">#1e90ff</span>,{" "}
                    <span className="text-fg/50 font-mono">rgb(30 144 255)</span>,{" "}
                    <span className="text-fg/50 font-mono">hsl(210 100% 56%)</span> or{" "}
                    <span className="text-fg/50 font-mono">dodgerblue</span>
                </div>
                {pickButton}
            </div>
        );
    }

    const hex = toHex(color);
    const textColor = readableTextColor(color);
    const cssName = nameOf(color);

    const formats = [
        { label: "HEX", value: hex },
        { label: "RGB", value: toRgbString(color) },
        { label: "HSL", value: toHslString(color) },
        ...(cssName ? [{ label: "NAME", value: cssName }] : []),
    ];

    return (
        <div className="flex flex-col gap-5">
            {/* Swatch */}
            <motion.div
                layout
                className="relative w-full h-40 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center"
                style={{ backgroundColor: hex }}
            >
                <span
                    className="text-3xl font-semibold tracking-tight tabular-nums"
                    style={{ color: textColor }}
                >
                    {hex.toUpperCase()}
                </span>

                {picked && (
                    <span
                        className="absolute top-3 left-3 px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold opacity-60"
                        style={{ color: textColor }}
                    >
                        Picked from screen
                    </span>
                )}
            </motion.div>

            <div className="flex items-center justify-between gap-4">
                {pickButton}
                {pickError && <span className="text-[11px] text-red-300/80">{pickError}</span>}
            </div>

            {/* Formats */}
            <div className="rounded-xl border border-white/5 bg-white/1 divide-y divide-white/5 overflow-hidden">
                {formats.map(({ label, value }) => (
                    <button
                        key={label}
                        onClick={() => copy(value)}
                        className="w-full flex items-center justify-between px-4 py-3 group hover:bg-white/3 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-fg/25 w-10 text-left">
                                {label}
                            </span>
                            <span className="text-[13px] font-mono text-fg/80">{value}</span>
                        </div>

                        <AnimatePresence mode="wait" initial={false}>
                            {copied === value ? (
                                <motion.span
                                    key="done"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="text-emerald-300"
                                >
                                    <Check size={14} />
                                </motion.span>
                            ) : (
                                <motion.span
                                    key="copy"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-fg/15 group-hover:text-fg/50 transition-colors"
                                >
                                    <Copy size={14} />
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                ))}
            </div>

            {/* Shades */}
            <div className="space-y-2">
                <h3 className="text-[11px] font-semibold text-fg/20 uppercase tracking-widest ml-1">
                    Shades
                </h3>
                <div className="flex rounded-lg overflow-hidden border border-white/5">
                    {shades(color).map((shade, i) => {
                        const shadeHex = toHex(shade);
                        return (
                            <button
                                key={i}
                                onClick={() => copy(shadeHex)}
                                title={shadeHex}
                                style={{ backgroundColor: shadeHex }}
                                className="flex-1 h-10 transition-transform hover:scale-y-125 cursor-pointer"
                            />
                        );
                    })}
                </div>
            </div>

            {/* Contrast */}
            <div className="space-y-2">
                <h3 className="text-[11px] font-semibold text-fg/20 uppercase tracking-widest ml-1">
                    Contrast
                </h3>
                <div className="flex gap-8 px-4 py-3 rounded-xl border border-white/5 bg-white/1">
                    <ContrastBadge label="On white" ratio={contrastRatio(color, WHITE)} />
                    <ContrastBadge label="On black" ratio={contrastRatio(color, BLACK)} />
                </div>
            </div>
        </div>
    );
};
