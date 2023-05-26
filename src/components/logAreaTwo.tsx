import React, { useContext, useEffect, useState } from 'react'
import { Text, Newline, Box } from 'ink'
import Divider from './divider.js'
import { AppContext } from './Context.js'
import type App from '../app.js'

export default function LogAreaTwo(): JSX.Element {
	let app: App = useContext(AppContext)
	let [hasPlayed, setPlayed] = useState<boolean>(false)
	let [historicalActions, setHistoricalActions] = useState<RedisData.Action[]>([])

	useEffect(() => {

		let handleGamePlayedUpdate = () => {
			setPlayed(true)
		}

		let handleGameJoinedUpdate = () => {
			setHistoricalActions([])
		}

		let handleActionUpdate = (newAction: RedisData.Action) => {
			setHistoricalActions((historicalActions) => [newAction, ...historicalActions])
		}

		app.gameStateEventEmitter.on('joined', handleGameJoinedUpdate)
		app.gameStateEventEmitter.on('playing', handleGamePlayedUpdate)
		app.actionEmitter.on('update', handleActionUpdate)
		return () => {
			app.gameStateEventEmitter.off('joined', handleGameJoinedUpdate)
			app.gameStateEventEmitter.off('playing', handleGamePlayedUpdate)
			app.actionEmitter.off('update', handleActionUpdate)
		}
	}, [])

	if (!hasPlayed) {
		return Instructions
	}

	return (
		<>
			<Box flexDirection='column' alignItems="center">
				<Divider title="ACTIONS" />
			</Box>
			<Box overflowY="hidden" flexDirection='column' flexShrink={100}>
				{historicalActions.map((action) => (
					<Text>
						{action.actions.map((item) => (<Text>{item.start} ➞ {item.end}; </Text>))}
					</Text>
				))}
			</Box>
		</>
	)
}

const Instructions =
	<>
		<Box flexDirection='column' alignItems="center">
			<Divider title="ACTIONS" />
		</Box>
		<Newline />
		<Text>Actions will appear here when the game begins.</Text>
	</>
