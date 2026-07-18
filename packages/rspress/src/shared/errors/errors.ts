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
	message,
	hint,
}: LiveDemoErrorContent): string {
	return hint ? `${message} ${hint}` : (message ?? "");
}

export class LiveDemoError extends Error {
	payload: LiveDemoErrorPayload;

	constructor(
		code: ErrorCode,
		tokens?: ErrorTokens[typeof code],
		options?: { cause?: unknown },
	) {
		const content = errorMessages[code](tokens as never);

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
