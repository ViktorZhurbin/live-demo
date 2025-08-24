// import { useColorMode } from "@docusaurus/theme-common";

// Local types to avoid workspace dependency issues
type LiveDemoStringifiedProps = {
  files: string;
  entryFileName: string;
};

const LiveDemo = (props: LiveDemoStringifiedProps) => {
  // const { colorMode } = useColorMode();
  const isDark = true;

  // Parse the stringified props
  const files = JSON.parse(props.files);
  const entryFileName = JSON.parse(props.entryFileName);

  return (
    <div
      style={{ border: "1px solid #ccc", padding: "16px", borderRadius: "4px" }}
    >
      <h4>Live Demo (Docusaurus Plugin) {isDark ? "🌙" : "☀️"}</h4>
      <p>Entry file: {entryFileName}</p>
      <p>Files: {Object.keys(files).join(", ")}</p>
      <pre>{files[entryFileName]}</pre>
    </div>
  );
};

export default LiveDemo;
