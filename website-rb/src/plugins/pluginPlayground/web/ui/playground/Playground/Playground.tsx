import { useFullscreen } from '@mantine/hooks'
import { EntryFiles } from '@pluginPlayground/shared/constants'
import clsx from 'clsx'
import {
  EditorCodeMirror,
  PlaygroundProvider,
  PlaygroundWrapper,
  ResizablePanels,
  FileTabs,
} from 'rspress-plugin-code-playground/web'
import 'rspress-plugin-code-playground/web/index.css'
import { useIsPlaygroundPage } from '../../../hooks/location'
import { useFiles } from '../../../hooks/useCurrentFiles'
import { ControlPanel } from '../../controlPanel/ControlPanel/ControlPanel'
import styles from './Playground.module.css'

export const Playground = () => {
  const fullscreen = useFullscreen()
  const isPlaygroundPage = useIsPlaygroundPage()

  const wrapperClass = clsx({
    [styles.fullHeight]: isPlaygroundPage,
  })

  const { currentFiles, language } = useFiles()

  const editor = (
    <>
      <FileTabs hideSingleTab />
      <EditorCodeMirror />
    </>
  )

  return (
    <PlaygroundProvider
      initialValue={{
        files: currentFiles,
        entryFileName: EntryFiles[language],
      }}
    >
      <PlaygroundWrapper ref={fullscreen.ref} className={wrapperClass}>
        <ControlPanel fullscreen={fullscreen} />
        <ResizablePanels editor={editor} />
      </PlaygroundWrapper>
    </PlaygroundProvider>
  )
}
