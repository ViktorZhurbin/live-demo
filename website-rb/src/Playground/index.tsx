import 'rspress-plugin-code-playground/web/index.css'
import {
  EditorCodeMirror,
  PlaygroundProvider,
  PlaygroundStringifiedProps,
  PlaygroundWrapper,
  ResizablePanels,
  parseProps,
} from 'rspress-plugin-code-playground/web'

const Playground = (props: PlaygroundStringifiedProps) => {
  const parsedProps = parseProps(props)

  return (
    <PlaygroundProvider initialValue={parsedProps}>
      <PlaygroundWrapper>
        <ResizablePanels editor={<EditorCodeMirror />} />
      </PlaygroundWrapper>
    </PlaygroundProvider>
  )
}

export default Playground
