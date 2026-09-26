import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { parseColor, readableTextColor, toHex } from "../lib/color";

/**
 * The swatch that follows the cursor during a native screen pick.
 *
 * Rendered in its own click-through window, positioned from Rust; this
 * component only reflects the colour currently under the cursor.
 */
export default function PickerOverlay() {
    const [hex, setHex] = useState("#000000");

    useEffect(() => {
        const pending = listen<string>("picker://preview", (event) => {
            setHex(event.payload);
        });

        return () => {
            pending.then((unlisten) => unlisten());
        };
    }, []);

    const parsed = parseColor(hex, { allowBareHex: true });
    const swatch = parsed ? toHex(parsed) : "#000000";
    const label = parsed ? readableTextColor(parsed) : "#ffffff";

    return (
        <div className="w-screen h-screen p-1 select-none pointer-events-none">
            <div className="w-full h-full flex items-center gap-3 px-3 rounded-xl border border-white/15 bg-black/70 backdrop-blur-md shadow-2xl">
                <div
                    className="size-8 rounded-lg border border-white/20 shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: swatch }}
                >
                    {/* A dot keeps the swatch legible against a matching backdrop. */}
                    <span
                        className="size-1.5 rounded-full opacity-40"
                        style={{ backgroundColor: label }}
                    />
                </div>

                <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-mono font-medium text-white/90 tabular-nums">
                        {swatch.toUpperCase()}
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.12em] text-white/35">
                        Click to pick · Esc
                    </span>
                </div>
            </div>
        </div>
    );
}
