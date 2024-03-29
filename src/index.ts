#!/usr/bin/env node

import { Command } from 'commander'
import App from './app.js'
import fs from 'node:fs/promises'
import {renderUI} from './components/ui.js'
import { Log } from '@corsaircoalition/common'

const packageJsonPath = new URL('../package.json', import.meta.url)
const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'))

const outStream = (await fs.open('out.log', 'a')).createWriteStream()
const errStream = (await fs.open('err.log', 'a')).createWriteStream()

Log.setOutStream(outStream, errStream)
Log.stdout(`[initilizing] ${pkg.name} v${pkg.version}`)

// command line parser
const program = new Command()
program
	.name(pkg.name)
	.version(pkg.version)
	.description(pkg.description)
	.option('-d, --debug', 'enable debugging', false)
	.arguments('<configFile>')
	.showHelpAfterError()
	.action(run)

let app: App

async function run(configFile: string) {
	// read and process command line options
	const options = program.opts()
	const config = JSON.parse(await fs.readFile(configFile, 'utf8'))
	const gameConfig = config.gameConfig
	const redisConfig = config.redisConfig
	gameConfig.BOT_ID_PREFIX = gameConfig.BOT_ID_PREFIX || 'cortex'
	gameConfig.setUsername = options['setUsername']
	Log.enableDebugOutput(options['debug'])

	// debug output
	Log.debug("[debug] debugging enabled")
	Log.debugObject('Game configuration', gameConfig)
	Log.debugObject('Command Line Options', options)

	// start the application to initiate redis and socket connections
	app = new App(gameConfig, redisConfig)
	Log.stdout(`[initilizing] botId: ${app.botId}`)

	Log.clearScreen()
	renderUI(app)
}

await program.parseAsync()

// gracefully exit on SIGINT and SIGTERM
process.once('SIGINT', async () => {
	Log.stderr('Interrupted. Exiting gracefully.')
	await app?.quit()
})

process.once('SIGTERM', async () => {
	Log.stderr('Terminated. Exiting gracefully.')
	await app?.quit()
})

process.on('exit', () => {
	Log.stderr('Exiting now.')
})
