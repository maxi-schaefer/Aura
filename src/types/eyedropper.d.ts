/**
 * The EyeDropper API, available in Chromium-based engines (so in WebView2).
 * Not yet part of TypeScript's DOM lib, and not present on every runtime —
 * always feature-detect `window.EyeDropper` before constructing one.
 */
interface EyeDropperOpenOptions {
    signal?: AbortSignal;
}

interface EyeDropperResult {
    /** The picked colour as "#rrggbb". */
    sRGBHex: string;
}

declare class EyeDropper {
    constructor();
    open(options?: EyeDropperOpenOptions): Promise<EyeDropperResult>;
}

interface Window {
    EyeDropper?: typeof EyeDropper;
}
