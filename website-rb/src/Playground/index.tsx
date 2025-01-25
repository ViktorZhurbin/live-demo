import 'rspress-plugin-code-playground/web/index.css'
import {
  EditorCodeMirror,
  FilesProvider,
  PlaygroundStringifiedProps,
  PlaygroundWrapper,
  ResizablePanels,
  parseProps,
} from 'rspress-plugin-code-playground/web'

const Playground = (props: PlaygroundStringifiedProps) => {
  const parsedProps = parseProps(props)

  return (
    <FilesProvider initialValue={parsedProps}>
      <PlaygroundWrapper>
        <ResizablePanels editor={<EditorCodeMirror />} />
      </PlaygroundWrapper>
    </FilesProvider>
  )
}

export default Playground
