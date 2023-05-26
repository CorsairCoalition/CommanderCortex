/// <reference path="./app.d.ts" />

import { Log, later } from './utils.js'
import Redis from './redis.js'
import crypto from 'node:crypto'
import EventEmitter from 'node:events'

interface GameStateObj {
	gamePhase: Game.Phase
	replay_id: string
	playerIndex: number | null
	turn: number
	usernames: string[] | null
	scores: GeneralsIO.Score[] | null
	won: boolean | null
}

export default class App {
	public readonly botId: string
	private readonly gameConfig: Config.Game

	public gameCount = {
		pending: 0,
		won: 0,
		lost: 0,
	}

	public gameState: GameStateObj = {
		gamePhase: Game.Phase.INITIALIZING,
		replay_id: "",
		playerIndex: null,
		turn: 0,
		usernames: null,
		scores: null,
		won: null,
	}

	public readonly replayIdList: string[] = []

	public gameCountEventEmitter = new EventEmitter()
	public gameStateEventEmitter = new EventEmitter()
	public recommendationEmitter = new EventEmitter()
	public actionEmitter = new EventEmitter()

	constructor(gameConfig: Config.Game, redisConfig: Config.Redis) {
		this.gameConfig = gameConfig
		// create a unique botId by hashing gameConfig.userId
		this.botId = gameConfig.BOT_ID_PREFIX + '-' + crypto.createHash('sha256').update(gameConfig.userId).digest('base64').replace(/[^\w\s]/gi, '').slice(-7)
		redisConfig.CHANNEL_PREFIX = this.botId
		// this.gameConfig = gameConfig
		Redis.initilize(redisConfig)
		Redis.subscribe(RedisData.CHANNEL.RECOMMENDATION, this.handleRecommendations)
		Redis.subscribe(RedisData.CHANNEL.STATE, this.handleStateUpdates)
		Redis.subscribe(RedisData.CHANNEL.GAME_UPDATE, this.handleGameUpdates)
	}

	public playGames = (count: number) => {
		this.gameCount.pending += count
		this.gameCountEventEmitter.emit('update', this.gameCount)
		if (this.gameState.gamePhase === Game.Phase.CONNECTED) {
			this.playOneGame()
		}
	}

	private playOneGame = () => {
		if (this.gameCount.pending <= 0) {
			return
		}
		if (this.gameState.gamePhase !== Game.Phase.CONNECTED) {
			Log.stderr('[playOneGame] cannot play while', this.gameState.gamePhase)
			return
		}
		let joinCommand: RedisData.Command.Any = {
			join: {
				gameType: 'custom',
				gameId: this.gameConfig.customGameId
			}
		}
		Redis.publish(RedisData.CHANNEL.COMMAND, joinCommand)
	}

	public stopGames = () => {
		this.gameCount.pending = 0
		this.gameCountEventEmitter.emit('update', this.gameCount)
	}

	private handleStateUpdates = async (data: RedisData.State) => {
		Log.debugObject('handleStateUpdates', data)
		let type: string = Object.keys(data)[0]
		switch (type) {
			case 'connected':
				this.gameState.gamePhase = Game.Phase.CONNECTED
				this.playOneGame()
				break
			case 'disconnected':
				this.gameState.gamePhase = Game.Phase.INITIALIZING
				later(5000).then(() => Redis.publish(RedisData.CHANNEL.COMMAND, { status: true }))
				break
			case 'joined':
				this.gameState.gamePhase = Game.Phase.JOINED_LOBBY
				this.gameStateEventEmitter.emit('joined')
				break
			case 'left':
				this.gameState.gamePhase = Game.Phase.CONNECTED
				later(1000).then(() => this.playOneGame())
				break
			case 'playing':
				this.gameState.gamePhase = Game.Phase.PLAYING
				break
			case 'game_lost':
				this.gameState.gamePhase = Game.Phase.CONNECTED
				this.gameState.won = false
				this.gameCount.lost++
				break
			case 'game_won':
				this.gameState.gamePhase = Game.Phase.CONNECTED
				this.gameState.won = true
				this.gameCount.won++
				break
			case 'game_start':
				this.gameStateEventEmitter.emit('playing')
				this.gameState.gamePhase = Game.Phase.PLAYING
				this.gameCount.pending--
				this.gameState = {
					gamePhase: Game.Phase.PLAYING,
					replay_id: data.game_start.replay_id,
					playerIndex: data.game_start.playerIndex,
					turn: 0,
					usernames: data.game_start.usernames,
					scores: null,
					won: null,
				}
				this.replayIdList.unshift(data.game_start.replay_id)
				this.gameStateEventEmitter.emit('replay', this.replayIdList)
				break
		}
		this.gameCountEventEmitter.emit('update', this.gameCount)
		this.gameStateEventEmitter.emit('update', this.gameState)
		this.gameStateEventEmitter.emit('phase', this.gameState.gamePhase)
	}

	private handleGameUpdates = async (data: GeneralsIO.GameUpdate) => {
		this.gameState.turn = data.turn
		this.gameState.scores = data.scores
		this.gameState = {
			...this.gameState,
			turn: data.turn,
			scores: data.scores,
		}
		this.gameStateEventEmitter.emit('update', this.gameState)
	}

	// receive recommendations and relay them to ACTION channel
	private handleRecommendations = (data: RedisData.Recommendation) => {
		if (this.gameState.gamePhase !== Game.Phase.PLAYING) {
			Log.stderr(`[recommendation] not in game`)
			return
		}

		Log.debug("[recommendation]", JSON.stringify(data))

		data.date = new Date()
		this.recommendationEmitter.emit('update', data)

		// for now, publish all recommendations
		// future work: be selective about what recommendations become actions
		Redis.publish(RedisData.CHANNEL.ACTION, data)
		this.actionEmitter.emit('update', data)
	}

	public quit = async () => {
		await Redis.quit()
	}
}
