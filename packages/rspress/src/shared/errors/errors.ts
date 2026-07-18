/**
 * Error building and normalization, ported from castro/core/src/utils/errors.js.
 * Unlike castro's payload/renderer split, rspress owns the terminal at build
 * time, so `.message` must itself be the fully formatted, multi-line text.
 * Preview.tsx reaches into `.payload` for title/hint styling separately.
 */
import { errorMessages } from "./messages";
import type {
	ErrorCode,
	ErrorTokens,
	LiveDemoErrorContent,
	LiveDemoErrorPayload,
} from "./types";

function formatMessage(content: LiveDemoErrorContent): string {
	const lines = [`[live-demo] ${content.title}`];

	if (content.message) lines.push(content.message);
	if (content.notes) lines.push(...content.notes);
	if (content.hint) lines.push(`Hint: ${content.hint}`);

	return lines.join("\n");
}

/** Joins message + hint for throw sites that can't use LiveDemoError (see messages.ts header). */
export function formatSplicedMessage({
	message = "",
	hint,
}: LiveDemoErrorContent): string {
	return hint ? `${message} ${hint}`.trim() : message;
}

/**
 * Trailing constructor args, correlated to the code: a token-less code may
 * omit them entirely, every other code must pass its own token shape. Written
 * as a tuple so `code` and `tokens` stay tied to the same `K` — typing tokens
 * as a standalone parameter widens it to the union of every code's tokens,
 * which lets both a wrong shape and a missing one through.
 */
type ErrorArgs<K extends ErrorCode> = ErrorTokens[K] extends undefined
	? [tokens?: undefined, options?: { cause?: unknown }]
	: [tokens: ErrorTokens[K], options?: { cause?: unknown }];

export class LiveDemoError<K extends ErrorCode = ErrorCode> extends Error {
	payload: LiveDemoErrorPayload;

	constructor(code: K, ...args: ErrorArgs<K>) {
		const [tokens, options] = args as [ErrorTokens[K], { cause?: unknown }?];

		const content = errorMessages[code](tokens);

		super(formatMessage(content), options);

		this.name = "LiveDemoError";
		this.payload = { ...content, code };

		// Makes stack traces point to the throw site, not this constructor.
		// V8-only (Node, Chrome); absent in Safari/Firefox, so guard the call.
		Error.captureStackTrace?.(this, LiveDemoError);
	}
}

/**
 * Normalizes any thrown value into a payload.
 * Preserves .payload when present; wraps others as UNEXPECTED.
 */
export function toPayload(err: unknown): LiveDemoErrorPayload {
	if (err instanceof LiveDemoError) {
		return err.payload;
	}

	return {
		code: "UNEXPECTED",
		title: "Unexpected error",
		message: err instanceof Error ? err.message : String(err),
	};
}
