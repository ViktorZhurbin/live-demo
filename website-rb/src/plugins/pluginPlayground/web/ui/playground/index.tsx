import { FilesProvider } from '../../context/Files'
import { PlaygroundProps } from '../../../shared/types'
import { Playground } from './Playground/Playground'

type PlaygroundStringifiedProps = {
  [Key in keyof PlaygroundProps]: string
}

const WrappedPlayground = (props: PlaygroundStringifiedProps) => {
  const parsedProps = parseProps(props)

  return (
    <FilesProvider initialValue={parsedProps}>
      <Playground />
    </FilesProvider>
  )
}

/**
 * Parse props, as they come JSON.stringified.
 * Without stringification having code strings (props.files) in MDX tends to break things.
 */
function parseProps(props: PlaygroundStringifiedProps): PlaygroundProps {
  return Object.fromEntries(
    Object.entries(props).map(([key, value]) => {
      return [key, JSON.parse(value)]
    })
  ) as PlaygroundProps
}

export default WrappedPlayground
