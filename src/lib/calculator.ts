import { evaluate, format as formatMath } from "mathjs";

export interface CalculationResult {
    /** Canonical value, safe to paste back into a calculator. */
    raw: string;
    /** Locale-formatted value, for display only. */
    display: string;
}

/** Significant digits kept before formatting, enough to hide float noise. */
const PRECISION = 12;

/** Above/below these magnitudes, digit grouping hurts more than it helps. */
const MAX_GROUPED = 1e15;
const MIN_GROUPED = 1e-6;

/** A whole numeric token, including decimals and exponents. */
const NUMBER_TOKEN = /\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

const HAS_DIGIT = /\d/;
const OPERATOR = /[+\-*/^%]/;
const FUNCTION_CALL = /\b[a-z][a-z0-9_]*\s*\(/i;
const FACTORIAL = /\d\s*!/;
const CONVERSION = /\s(?:to|in)\s/i;
/** Only multi-letter constants: a bare "e" is far more likely to be a search. */
const BARE_CONSTANT = /^(?:pi|tau|phi)$/i;

/** 2026-01-15 or 15.01.2026 — a date, not a division. */
const DATE_LIKE = /^(?:\d{4}[-./]\d{1,2}[-./]\d{1,4}|\d{1,2}[-./]\d{1,2}[-./]\d{2,4})$/;
/** 1.2.3 / v2.0.1 — a version, not a number. */
const VERSION_LIKE = /^v?\d+(?:\.\d+){2,}$/i;

function formatNumber(value: number): string {
    if (!Number.isFinite(value)) return String(value);

    const magnitude = Math.abs(value);
    if (magnitude !== 0 && (magnitude >= MAX_GROUPED || magnitude < MIN_GROUPED)) {
        return value.toExponential();
    }

    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 10 }).format(value);
}

/**
 * Applies digit grouping to every number inside a string.
 *
 * Matches each numeric token whole — grouping the integer part separately
 * from its decimals produces nonsense in locales where the group separator
 * is "." (1234.5 becoming "1.234.5").
 */
export function groupNumbersInText(text: string): string {
    return text.replace(NUMBER_TOKEN, (token) => {
        const value = Number(token);
        return Number.isFinite(value) ? formatNumber(value) : token;
    });
}

function toResult(value: unknown): CalculationResult | null {
    if (value === null || value === undefined) return null;
    if (typeof value === "function" || typeof value === "boolean") return null;

    if (typeof value === "number") {
        if (!Number.isFinite(value)) return null;
        const raw = formatMath(value, { precision: PRECISION });
        return { raw, display: formatNumber(Number(raw)) };
    }

    // Units, fractions, bignumbers and complex numbers format themselves.
    const raw = formatMath(value as never, { precision: PRECISION });
    if (typeof raw !== "string" || raw.length === 0) return null;

    return { raw, display: groupNumbersInText(raw) };
}

function looksLikeExpression(query: string): boolean {
    if (DATE_LIKE.test(query) || VERSION_LIKE.test(query)) return false;
    if (BARE_CONSTANT.test(query)) return true;

    return (
        (HAS_DIGIT.test(query) && OPERATOR.test(query)) ||
        FUNCTION_CALL.test(query) ||
        FACTORIAL.test(query) ||
        CONVERSION.test(query)
    );
}

/**
 * Evaluates a query as a maths expression or unit conversion.
 *
 * Returns null when the query is not an expression, or when evaluating it
 * does not produce a displayable value.
 */
export function evaluateExpression(query: string): CalculationResult | null {
    const trimmed = query.trim();
    if (!trimmed || !looksLikeExpression(trimmed)) return null;

    try {
        return toResult(evaluate(trimmed));
    } catch {
        return null;
    }
}
