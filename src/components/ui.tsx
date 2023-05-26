import React, { useEffect, useState } from 'react'
import { render, Box, useStdout, useStdin } from 'ink'
import BigText from 'ink-big-text'
import CommandBox from './commandBox.js'
import GameStats from './gameStats.js'
import Divider from './divider.js'
import ConnStatus from './connStatus.js'
import LogAreaOne from './logAreaOne.js'
import LogAreaTwo from './logAreaTwo.js'
import { AppContext } from './Context.js'
import type App from '../app.js'

interface UIProps {
	app: App
}

export function UI({ app }: UIProps): JSX.Element {
	const { setRawMode, isRawModeSupported } = useStdin()
	const { stdout } = useStdout()
	const [height, setHeight] = useState<number>(stdout.rows)

	useEffect(() => {
		if (isRawModeSupported) {
			setRawMode(true)
		}
		const handleResize = () => setHeight(stdout.rows)
		stdout.on('resize', handleResize)
		return () => {
			stdout.off('resize', handleResize)
			setRawMode(false)
		}
	}, [stdout])

	return (
		<Box flexDirection="column" flexGrow={1} width="100%" height={height - 1} paddingX={1}>
			<AppContext.Provider value={app}>
				<Box flexDirection="column" alignItems="center" paddingTop={1} minHeight={7}>
					<BigText font='tiny' text="Commander Cortex" />
				</Box>
				<Box columnGap={1} flexGrow={1} overflowY='hidden'>
					{/* Left Column */}
					<Box flexDirection="column" width="60%">
						<Box flexDirection="column" paddingX={1} borderStyle='round' minHeight={6}>
							<Box flexDirection='column' alignItems="center">
								<Divider title="COMMANDS" />
							</Box>
							<CommandBox />
						</Box>
						<Box flexDirection='column' paddingX={1} borderStyle='round' flexGrow={1} overflowY='hidden'>
							<LogAreaOne />
						</Box>
						<Box flexDirection='column' paddingX={1} borderStyle='round' flexGrow={1} overflowY='hidden'>
							<LogAreaTwo />
						</Box>
					</Box>

					{/* Right Column */}
					<Box flexDirection="column" width="40%">
						<Box borderStyle='round' paddingX={1} flexDirection='column'>
							<Box flexDirection='column' alignItems="center">
								<Divider title="STATUS" width={40} />
							</Box>
							<ConnStatus customGameId='cortex' />
						</Box>
						<Box borderStyle='round' paddingX={1} flexGrow={1} flexDirection='column'>
							<Box flexDirection='column' alignItems="center">
								<Divider title="STATISTICS" width={40} />
							</Box>
							<GameStats />
						</Box>
					</Box>
				</Box>
			</AppContext.Provider>
		</Box>
	)
}

export function renderUI(app: App) {
	return render(<UI app={app} />)
}
