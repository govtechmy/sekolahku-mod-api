import type { LoggerOptions as PinoLoggerOptions, TransportTargetOptions } from 'pino'

import { env } from './env.config'

export function loggerOptions(isProduction: boolean): PinoLoggerOptions {
  const options: PinoLoggerOptions = {
    level: env.logLevel,
  }
  if (!isProduction) {
    const transport: TransportTargetOptions = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    }
    options.transport = transport
  }
  return options
}
