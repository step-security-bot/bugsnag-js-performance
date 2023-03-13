export interface Logger {
  debug: (msg: string) => void
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}

function isObject (obj: unknown): obj is Record<string, unknown> {
  return !!obj && typeof obj === 'object'
}

function isLogger (object: unknown): object is Logger {
  return isObject(object) &&
      typeof object.debug === 'function' &&
      typeof object.info === 'function' &&
      typeof object.warn === 'function' &&
      typeof object.error === 'function'
}

export interface Configuration {
  apiKey: string
  endpoint?: string
  releaseStage?: string
  logger?: Logger
}

export type InternalConfiguration = Required<Configuration>

export interface ConfigOption<Type> {
  message: string
  defaultValue: Type
  validate: (value: unknown) => boolean
}

// TODO: Figure out how to make generic version of this
export interface CoreSchema {
  apiKey: ConfigOption<string>
  endpoint: ConfigOption<string>
  releaseStage: ConfigOption<string>
  logger: ConfigOption<Logger>
}

const isString = (value: unknown) => typeof value === 'string'

export const schema: CoreSchema = {
  endpoint: {
    defaultValue: 'https://otlp.bugsnag.com/v1/traces',
    message: 'should be a valid URL. Bugsnag will not send any requests.',
    validate: isString
  },
  apiKey: {
    defaultValue: '',
    message: 'No Bugsnag API Key set',
    validate: isString
  },
  logger: {
    defaultValue: {
      debug (message: string) { console.debug(message) },
      info (message: string) { console.info(message) },
      warn (message: string) { console.warn(message) },
      error (message: string) { console.error(message) }
    },
    message: 'should be a Logger object',
    validate: isLogger
  },
  releaseStage: {
    defaultValue: 'production',
    message: 'should be a string.',
    validate: isString
  }
}
