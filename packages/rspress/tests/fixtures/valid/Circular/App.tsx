import { isEven } from "./even";

export default function App() {
	return <div>{isEven(4) ? "EVEN" : "ODD"}</div>;
}
