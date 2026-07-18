import { isOdd } from "./odd";

export function isEven(n: number): boolean {
	return n === 0 ? true : isOdd(n - 1);
}
