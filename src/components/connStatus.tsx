import React, { useContext, useEffect, useState } from 'react'
import { Text, Newline } from 'ink'
import { AppContext } from './Context.js'
import type App from '../app.js'
import { Redis, Log } from '@corsaircoalition/common'

const ConnStatusMessages = {
	connect: '🔌 Connecting',
	ready: '✅ Connected',
	end: '⛔ Disconnected',
	error: '🚫 Error',
	reconnecting: '🔌 Reconnecting',
	unknown: '❓ Unknown',
	na: '🤨 N/A',
}

const GamePhaseMessages: Record<Game.Phase, string> = {
	[Game.Phase.INITIALIZING]: '❓ Unknown',
	[Game.Phase.CONNECTED]: '✅ Ready to play',
	[Game.Phase.JOINED_LOBBY]: '🚪 Waiting in Lobby',
	[Game.Phase.PLAYING]: '⚡ Playing',
}

interface ConnStatusProps {
	customGameId?: string
}

export default function ConnStatus({ customGameId }: ConnStatusProps): JSX.Element {

	let app: App = useContext(AppContext)

	let [redisStatus, setRedisStatus] = useState<string>(ConnStatusMessages.unknown)
	let [ioStatus, setIoStatus] = useState<string>(ConnStatusMessages.unknown)
	let [gameServerStatus, setGameServerStatus] = useState<string>(ConnStatusMessages.unknown)
	let [gamePhase, setGamePhase] = useState<Game.Phase>(app.gameState.gamePhase)

	useEffect(() => {
		let handleGamePhaseUpdate = (gamePhase: Game.Phase) => setGamePhase(gamePhase)

		let handleRedisConnectionStatus = (status: string) => {
			if (status in ConnStatusMessages) {
				setRedisStatus(ConnStatusMessages[status])
			} else {
				Log.stderr(`Unknown Redis Connection Status: ${status}`)
				setRedisStatus(ConnStatusMessages.unknown)
			}

			setIoStatus(ConnStatusMessages.unknown)
			setGameServerStatus(ConnStatusMessages.unknown)
			setGamePhase(Game.Phase.INITIALIZING)

			if (status === 'ready') {
				// send a ping to SergeantSocket
				Redis.publish(app.botId, RedisData.CHANNEL.COMMAND, { status: true })
			}
		}

		let handleGameState = (state: RedisData.State) => {
			setIoStatus(ConnStatusMessages.ready)

			if (state.disconnected) {
				setGameServerStatus(ConnStatusMessages.end)
				return
			}

			setGameServerStatus(ConnStatusMessages.ready)
		}

		app.gameStateEventEmitter.on('phase', handleGamePhaseUpdate)

		Redis.connectionEventEmitter.on('status', handleRedisConnectionStatus)
		Redis.subscribe(app.botId, RedisData.CHANNEL.STATE, handleGameState)

		// initial ping
		Redis.ping()
			.then(() => setRedisStatus(ConnStatusMessages.ready))
			.catch(() => setRedisStatus(ConnStatusMessages.reconnecting))

		return () => {
			Redis.connectionEventEmitter.off('status', handleRedisConnectionStatus)
			// TODO: unsubscribe from RedisData.CHANNEL.STATE
			// or use Redis.ConnectionStateEmitter instead
			app.gameStateEventEmitter.off('phase', handleGamePhaseUpdate)
		}
	}, [])

	return (
		<Text>
			Bot ID: {app.botId}<Newline />
			<Newline />
			Redis: {redisStatus}<Newline />
			IO Module: {ioStatus}<Newline />
			GIO Server: {gameServerStatus}<Newline />
			Game Status: {GamePhaseMessages[gamePhase]}<Newline />
			<Newline />
			{customGameId && <Text>Spectate or play at <Text underline color="cyan">https://bot.generals.io/games/{customGameId}</Text></Text>}
		</Text>
	)
}
