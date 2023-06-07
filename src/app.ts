import { GameState, Log, Redis, hashUserId, later } from '@corsaircoalition/common'
import EventEmitter from 'node:events'

export default class App {
	public readonly botId: string
	private readonly gameConfig: Config.Game
	public gameState: GameState

	public gameCount = {
		pending: 0,
		won: 0,
		lost: 0,
	}

	public readonly replayIdList: string[] = []

	public gameCountEventEmitter = new EventEmitter()
	public gameStateEventEmitter = new EventEmitter()
	public recommendationEmitter = new EventEmitter()
	public actionEmitter = new EventEmitter()

	constructor(gameConfig: Config.Game, redisConfig: Config.Redis) {
		Redis.initilize(redisConfig)
		this.gameConfig = gameConfig
		this.botId = gameConfig.BOT_ID_PREFIX + '-' + hashUserId(gameConfig.userId)

		this.gameState = new GameState(this.botId, true)

		this.gameState.on('connected', this.playOneGame)
		this.gameState.on('disconnected', () => {
			later(5000).then(() => Redis.publish(this.botId, RedisData.CHANNEL.COMMAND, { status: true }))
		})
		this.gameState.on('joined', () => {
			this.gameStateEventEmitter.emit('joined')
		})
		this.gameState.on('playing', () => {
			this.gameStateEventEmitter.emit('playing')
		})
		this.gameState.on('left', () => {
			later(1000).then(() => this.playOneGame())
		})
		this.gameState.on('game_lost', () => {
			this.gameCount.lost++
			this.gameCountEventEmitter.emit('update', this.gameCount)
		})
		this.gameState.on('game_won', () => {
			this.gameCount.won++
			this.gameCountEventEmitter.emit('update', this.gameCount)
		})
		this.gameState.on('game_start', (replay_id) => {
			this.gameCount.pending--
			this.replayIdList.unshift(replay_id)
			this.gameCountEventEmitter.emit('update', this.gameCount)
			this.gameStateEventEmitter.emit('playing')
			this.gameStateEventEmitter.emit('replay', this.replayIdList)
		})
		this.gameState.on('phase', (phase) => this.gameStateEventEmitter.emit('phase', phase))
		this.gameState.on('update', (state) => this.gameStateEventEmitter.emit('update', state))

		Redis.subscribe(this.botId, RedisData.CHANNEL.RECOMMENDATION, this.handleRecommendations)
		Redis.subscribe(this.botId, RedisData.CHANNEL.ACTION, this.handleActions)
	}

	// receive recommendations and relay them to ACTION channel
	private handleRecommendations = (data: RedisData.Recommendation) => {
		Log.debug("[recommendation]", JSON.stringify(data))
		if(data.date) {
			data.date = new Date(data.date)
		} else {
			data.date = new Date()
		}
		if (this.gameState.gamePhase === Game.Phase.PLAYING) {
			this.recommendationEmitter.emit('update', data)
		}
	}

	// receive recommendations and relay them to ACTION channel
	private handleActions = (data: RedisData.Action) => {
		Log.debug("[recommendation]", JSON.stringify(data))
		if (this.gameState.gamePhase === Game.Phase.PLAYING) {
			this.actionEmitter.emit('update', data)
		}
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
		Redis.publish(this.botId, RedisData.CHANNEL.COMMAND, joinCommand)
	}

	public stopGames = () => {
		this.gameCount.pending = 0
		this.gameCountEventEmitter.emit('update', this.gameCount)
	}

	public quit = async () => {
		await Redis.quit()
	}
}
