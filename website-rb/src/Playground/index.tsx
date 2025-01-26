import 'rspress-plugin-live-demo/web/index.css'
import {
  EditorCodeMirror,
  PlaygroundProvider,
  PlaygroundStringifiedProps,
  PlaygroundWrapper,
  ResizablePanels,
  parseProps,
} from 'rspress-plugin-live-demo/web'

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
