import React, { useContext, useEffect, useState } from 'react'
import { Text, Newline, Box } from 'ink'
import { AppContext } from './Context.js'
import type App from '../app.js'

interface GameStateObj {
	gamePhase: Game.Phase
	replay_id: string
	playerIndex: number | null
	turn: number
	usernames: string[] | null
	scores: GeneralsIO.Score[] | null
	won: boolean | null
}

interface GameCountObj {
	pending: number
	won: number
	lost: number
}

export default function GameStats(): JSX.Element {

	let app: App = useContext(AppContext)
	let [gameCount, setGameCount] = useState<GameCountObj>(app.gameCount)
	let [gameState, setGameState] = useState<GameStateObj>(app.gameState)
	let [replays, setReplays] = useState<string[]>([])

	useEffect(() => {
		let handleGameCountUpdate = (gameCount: GameCountObj) => setGameCount({ ...gameCount })
		let handleGameStateUpdate = (gameState: GameStateObj) => setGameState({ ...gameState })

		app.gameCountEventEmitter.on('update', handleGameCountUpdate)
		app.gameStateEventEmitter.on('update', handleGameStateUpdate)
		app.gameStateEventEmitter.on('replay', (replays: string[]) => setReplays([...replays]))

		return () => {
			app.gameCountEventEmitter.off('update', handleGameCountUpdate)
			app.gameStateEventEmitter.off('update', handleGameStateUpdate)
		}
	}, [])

	return (
		<>
			<Text>
				<Newline />
				<Text>{gameCount.won} Won / {gameCount.lost} Lost / {gameCount.won + gameCount.lost} Played / {gameCount.pending} Queued</Text><Newline />
				<Newline />

				<Text bold>Current Game</Text><Newline /><Newline />
				Turn: {gameState.turn}<Newline />
				{(gameState.scores && gameState.scores.length > 0) && <Text>
					Army: {gameState.scores[gameState.playerIndex].total} Self / {gameState.scores[1 - gameState.playerIndex].total} Enemy<Newline />
					Tiles: {gameState.scores[gameState.playerIndex].tiles} Self / {gameState.scores[1 - gameState.playerIndex].tiles} Enemy<Newline />
				</Text>}
				{(gameState.won === true || gameState.won === false) &&
					<Text>Outcome: {gameState.won ? '🔥 Game Won' : '😐 Game Lost'}</Text>}
				<Newline />
			</Text>
			<ReplayBox replays={replays} />
		</>
	)
}

function ReplayBox({ replays }: { replays: string[] }): JSX.Element {
	if (!replays.length) return <></>
	return (
		<Box flexDirection="column" overflowY='hidden' flexShrink={1000}>
			<Text bold>Recent Games</Text><Newline />
			{replays.map((replayId, index) => <Text key={index}>https://generals.io/replays/{replayId}</Text>)}
		</Box>
	)
}
