import React, { useContext } from 'react'
import { Box, Text, useFocus, useFocusManager, useInput } from 'ink'
import { AppContext } from './Context.js'
import type App from '../app.js'

const enum ButtonId {
	PLAY1 = 'Play +1',
	PLAY10 = 'Play +10',
	PLAY100 = 'Play +100',
	STOP_PLAYING = 'Stop',
	QUIT = 'Quit',
}

export default function CommandBox(): JSX.Element {

	const { focus, focusPrevious, focusNext } = useFocusManager()

	let app: App = useContext(AppContext)

	useInput((input, key) => {
		switch (input) {
			case '1':
				focus(ButtonId.PLAY1)
				return
			case '2':
				focus(ButtonId.PLAY10)
				return
			case '3':
				focus(ButtonId.PLAY100)
				return
			case '4':
				focus(ButtonId.STOP_PLAYING)
				return
			case '5':
				focus(ButtonId.QUIT)
				return
		}

		if (key.leftArrow) {
			focusPrevious()
			return
		}

		if (key.rightArrow) {
			focusNext()
			return
		}
	})

	const handleQuit = async () => {
		await app.quit()
		process.exit(0)
	}

	const playGames = (numGames: number) => () => { app.playGames(numGames) }

	return (
		<Box flexGrow={1} flexDirection='row' alignItems='center' columnGap={3} paddingX={3}>
			<Button id={ButtonId.PLAY1} onClick={playGames(1)} />
			<Button id={ButtonId.PLAY10} onClick={playGames(10)} />
			<Button id={ButtonId.PLAY100} onClick={playGames(100)} />
			<Button id={ButtonId.STOP_PLAYING} onClick={app.stopGames} />
			<Button id={ButtonId.QUIT} onClick={handleQuit} />
		</Box>
	)
}

type ButtonProps = {
	readonly id: ButtonId
	readonly onClick: () => void
}

function Button({ id, onClick }: ButtonProps): JSX.Element {
	const { isFocused } = useFocus({ id })

	useInput((input, key) => {
		if (isFocused && (key.return || input === ' ')) {
			onClick()
		}
	})

	return (
		<Box alignItems='center' flexDirection='column' flexGrow={1} borderStyle={isFocused ? 'double' : 'single'}>
			{isFocused ? <Text inverse bold>{id}</Text> : <Text>{id}</Text>}
		</Box>
	)
}
