import { isEven } from "./even";

export function isOdd(n: number): boolean {
	return n === 0 ? false : isEven(n - 1);
}
