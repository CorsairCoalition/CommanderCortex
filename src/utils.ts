import fs from 'fs'

export function later(delay: number) {
	return new Promise(function (resolve) {
		setTimeout(resolve, delay)
	})
}

export function random(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1) + min)
}

const OUT_LOG = 'out.log'

export class Log {

	static debugEnabled: boolean = false
	static outStream: fs.WriteStream = fs.createWriteStream(OUT_LOG, { flags: 'a' })

	static setDebugOutput(debug: boolean) {
		Log.debugEnabled = debug
	}

	static clearScreen() {
		process.stdout.write('\x1b[2J')
	}

	static stdout(...args: string[]) {
		Log.outStream.write(new Date().toISOString() + ' ' + args.join(' ') + '\n')
	}

	static stderr(...args: string[]) {
		Log.outStream.write(new Date().toISOString() + ' ' + args.join(' ') + '\n')
	}

	static debug(...args: string[]) {
		if (!Log.debugEnabled) return
		Log.outStream.write(new Date().toISOString() + ' ' + args.join(' ') + '\n')
	}

	static debugObject(label: string, obj: any) {
		if (!Log.debugEnabled) return
		Log.outStream.write(new Date().toISOString() + ' ' + label + '\n')
		Log.outStream.write(JSON.stringify(obj, null, 2) + '\n')
	}
}
