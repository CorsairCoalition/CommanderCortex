import React, { useContext, useEffect, useState } from 'react'
import { Text, Newline, Box } from 'ink'
import Divider from './divider.js'
import { AppContext } from './Context.js'
import type App from '../app.js'

export default function LogAreaOne(): JSX.Element {

	let app: App = useContext(AppContext)
	let [hasPlayed, setPlayed] = useState<boolean>(false)
	let [recommendations, setRecommendations] = useState<RedisData.Recommendation[]>([])

	useEffect(() => {

		let handleGamePlayedUpdate = () => {
			setPlayed(true)
		}

		let handleGameJoinedUpdate = () => {
			setRecommendations([])
		}

		let handleRecommendationUpdate = (recommendation: RedisData.Recommendation) => {
			setRecommendations((recommendations) => [recommendation, ...recommendations])
		}

		app.gameStateEventEmitter.on('joined', handleGameJoinedUpdate)
		app.gameStateEventEmitter.on('playing', handleGamePlayedUpdate)
		app.recommendationEmitter.on('update', handleRecommendationUpdate)
		return () => {
			app.gameStateEventEmitter.off('joined', handleGameJoinedUpdate)
			app.gameStateEventEmitter.off('playing', handleGamePlayedUpdate)
			app.recommendationEmitter.off('update', handleRecommendationUpdate)
		}
	}, [])

	if (!hasPlayed) {
		return Instructions
	}

	return (
		<>
			<Box flexDirection='column' alignItems="center">
				<Divider title="RECOMMENDATIONS" />
			</Box>
			<Box overflowY="hidden" flexDirection='column' flexShrink={100}>
				{recommendations.map((recommendation, index) => (
					<Text key={index}>
						<Text color='gray'>{recommendation.date.toLocaleTimeString()} </Text>
						<Text color='magentaBright'>{recommendation.recommender} </Text>
						{recommendation.actions.map((item) => (<Text>{item.start} ➞ {item.end}; </Text>))}
					</Text>
				))}
			</Box>
		</>
	)
}

const Instructions =
	<>
		<Box flexDirection='column' alignItems="center">
			<Divider title="INSTRUCTIONS" />
		</Box>
		<Newline />
		<Box overflowY="hidden">
			<Text>
				Press Tab, Left, Right or numbers to select a command. <Newline />
				Use Enter or Space to execute. <Newline />
				<Newline />
				Select the number of additional rounds to play. <Newline />
				Press "Stop" to stop playing after the current round. <Newline />
				Press "Quit" to stop immediately and exit. <Newline />
				<Newline />
				See config.json for additional options.
			</Text>
		</Box>
	</>
