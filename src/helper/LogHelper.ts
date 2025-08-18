import 'colorts/lib/string';
import * as util from 'util'

export function logError(message: string) {
    console.log(`${getLevel('error')} ${getTimeStamp()} ${util.format(message)}`.red)
}

export function logSuccess(message: string) {
    console.log(`${getLevel('info')} ${getTimeStamp()} ${util.format(message)}`.green)
}

export function logRegular(message: string) {
    console.log(`${getLevel('info')} ${getTimeStamp()} ${util.format(message)}`.white)
}

export function logNotice(message: string) {
    console.log(`${getLevel('info')} ${getTimeStamp()} ${util.format(message)}`.magenta)
}

export function logWarn(message: string) {
    console.log(`${getLevel('warn')} ${getTimeStamp()} ${util.format(message)}`.yellow)
}

export function logCustom(message: string, level = "info") {
    console.log(`${getLevel(level)} ${getTimeStamp()} ${util.format(message)}`)
}

export function logEmpty() {
    console.log('')
}

function getLevel(level: string) {
    return `[${level}]`.grey
}

function getTimeStamp() {
    const date = new Date()
    return `[${date.toISOString()}]`.grey
}