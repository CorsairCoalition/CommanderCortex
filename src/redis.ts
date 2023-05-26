/// <reference path="./app.d.ts" />

import { createClient, RedisClientType } from '@redis/client'
import { Log } from './utils.js'
import EventEmitter from 'node:events'

export default class Redis {

	private static publisher: RedisClientType
	private static subscriber: RedisClientType
	private static CHANNEL_PREFIX: string
	private static gameKeyspace: string
	public static readonly connectionEventEmitter = new EventEmitter()

	public static initilize(redisConfig: Config.Redis) {
		Redis.CHANNEL_PREFIX = redisConfig.CHANNEL_PREFIX
		Redis.subscriber = createClient({
			username: process.env['REDIS_USERNAME'] || redisConfig.USERNAME,
			password: process.env['REDIS_PASSWORD'] || redisConfig.PASSWORD,
			socket: {
				host: process.env['REDIS_HOST'] || redisConfig.HOST,
				port: redisConfig.PORT,
				tls: redisConfig.TLS,
				servername: process.env['REDIS_HOST'] || redisConfig.HOST,
			}
		})
		Redis.subscriber.on('error', (error: Error) => Log.stderr(`[Redis] ${error}`))
		let redisConnectionEvents = ['connect', 'ready', 'reconnecting', 'end', 'error']
		for (let event of redisConnectionEvents) {
			Redis.subscriber.on(event, Redis.redisEventHandler(event))
		}
		Redis.subscriber.connect()

		Redis.publisher = createClient({
			username: process.env['REDIS_USERNAME'] || redisConfig.USERNAME,
			password: process.env['REDIS_PASSWORD'] || redisConfig.PASSWORD,
			socket: {
				host: process.env['REDIS_HOST'] || redisConfig.HOST,
				port: redisConfig.PORT,
				tls: redisConfig.TLS,
				servername: process.env['REDIS_HOST'] || redisConfig.HOST,
			}
		})
		Redis.publisher.on('error', (error: Error) => Log.stderr(`[Redis] ${error}`))
		Redis.publisher.connect()
	}

	private static redisEventHandler = (type: string) => (data: any) => Redis.connectionEventEmitter.emit('status', type, data)

	public static async ping() {
		await Redis.publisher.ping()
	}

	public static listPush(list: RedisData.LIST, data: any) {
		Redis.publisher.rPush(Redis.gameKeyspace + '-' + list, JSON.stringify(data))
		Redis.publisher.expire(Redis.gameKeyspace + '-' + list, 60 * 60 * 24 * 365)
	}

	public static setKeys(keyValues: Record<string, any>) {
		// JSON.stringify each value
		for (let key in keyValues) {
			keyValues[key] = JSON.stringify(keyValues[key])
		}
		return Redis.publisher.hSet(Redis.gameKeyspace, keyValues)
	}

	public static async getKeys(...keys: Array<string>) {
		// JSON.parse each value
		let values = await Redis.publisher.hmGet(Redis.gameKeyspace, keys)
		for (let key in values) {
			values[key] = JSON.parse(values[key])
		}
		return values
	}

	public static async getAllKeys() {
		// JSON.parse each value
		let values = await Redis.publisher.hGetAll(Redis.gameKeyspace)
		for (let key in values) {
			values[key] = JSON.parse(values[key])
		}
		return values
	}

	public static expireKeyspace(timeInSeconds: number) {
		return Redis.publisher.expire(Redis.gameKeyspace, timeInSeconds)
	}

	public static publish(channel: RedisData.CHANNEL, data: any) {
		return Redis.publisher.publish(Redis.CHANNEL_PREFIX + '-' + channel, JSON.stringify(data))
	}

	public static setKeyspaceName(keyspace: string) {
		Redis.gameKeyspace = `${Redis.CHANNEL_PREFIX}-${keyspace}`
	}

	public static async subscribe(channel: RedisData.CHANNEL, callback: (data: any) => void) {
		const CHANNEL_NAME: string = Redis.CHANNEL_PREFIX + '-' + channel
		Log.debug('[Redis] subscribe:', CHANNEL_NAME)
		let handleResponse = (message: string) => {
			let data: any
			try {
				data = JSON.parse(message)
			} catch (error) {
				Log.stderr('[JSON] received:', message, ', error:', error)
				return
			}
			callback(data)
		}
		await Redis.subscriber.subscribe(CHANNEL_NAME, handleResponse)
		Log.debug('[Redis] subscribed:', CHANNEL_NAME)
		return CHANNEL_NAME
	}

	public static async subscribeDiscovery(callback: (data: any) => void) {
		const CHANNEL_NAME = RedisData.CHANNEL.DISCOVERY
		Log.debug('[Redis] subscribe:', CHANNEL_NAME)
		let handleResponse = (message: string) => {
			let data: any
			try {
				data = JSON.parse(message)
			} catch (error) {
				Log.stderr('[JSON] received:', message, ', error:', error)
				return
			}
			callback(data)
		}
		await Redis.subscriber.subscribe(CHANNEL_NAME, handleResponse)
		Log.debug('[Redis] subscribed:', CHANNEL_NAME)
		return CHANNEL_NAME
	}

	public static async unsubscribeDiscovery() {
		await Redis.subscriber.unsubscribe(RedisData.CHANNEL.DISCOVERY)
		Log.debug('[Redis] unsubscribed:', RedisData.CHANNEL.DISCOVERY)
	}

	public static quit() {
		let promises = []
		if (Redis.subscriber.isReady) {
			Log.stdout('Closing Redis subscriber...')
			promises.push(Redis.subscriber.quit())
		}
		if (Redis.publisher.isReady) {
			Log.stdout('Closing Redis publisher...')
			promises.push(Redis.publisher.quit())
		}
		return Promise.all(promises).then(() => {
			Log.stdout('Redis connection closed.')
		})
	}
}
