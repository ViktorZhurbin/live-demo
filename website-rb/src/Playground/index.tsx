import {
  LiveDemoEditor,
  LiveDemoProvider,
  LiveDemoStringifiedProps,
  LiveDemoWrapper,
  LiveDemoResizablePanels,
  parseProps,
} from 'rspress-plugin-live-demo/web'
import 'rspress-plugin-live-demo/web/index.css'

const LiveDemo = (props: LiveDemoStringifiedProps) => {
  const parsedProps = parseProps(props)

  return (
    <LiveDemoProvider initialValue={parsedProps}>
      <LiveDemoWrapper>
        <LiveDemoResizablePanels editor={<LiveDemoEditor />} />
      </LiveDemoWrapper>
    </LiveDemoProvider>
  )
}

export default LiveDemo
