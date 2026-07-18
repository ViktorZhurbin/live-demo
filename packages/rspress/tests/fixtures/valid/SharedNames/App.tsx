import { styles as buttonStyles } from "./buttons/styles";
import { styles as cardStyles } from "./cards/styles";

export default function App() {
	return <div>{buttonStyles + cardStyles}</div>;
}
