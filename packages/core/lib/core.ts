import { SpanAttributes, type ResourceAttributeSource, type SpanAttributesSource } from './attributes'
import { type Clock } from './clock'
import { type Configuration, type CoreSchema, type InternalConfiguration, type Logger } from './config'
import { type IdGenerator } from './id-generator'
import { BufferingProcessor, type Processor, type ProcessorFactory } from './processor'
import { Kind, type Span, type SpanInternal, type Time } from './span'

export interface BugsnagPerformance {
  start: (config: Configuration | string) => void
  startSpan: (name: string, startTime?: Time) => Span
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

const defaultLogger: Logger = {
  debug (message: string) { console.debug(message) },
  info (message: string) { console.info(message) },
  warn (message: string) { console.warn(message) },
  error (message: string) { console.error(message) }
}

function validate (config: unknown): InternalConfiguration {
  if (typeof config === 'string') { config = { apiKey: config } }

  if (!isObject(config) || typeof config.apiKey !== 'string') {
    throw new Error('No Bugsnag API Key set')
  }

  const cleanConfiguration: InternalConfiguration = {
    apiKey: config.apiKey,
    endpoint: 'https://otlp.bugsnag.com/v1/traces',
    releaseStage: 'production', // TODO: this should have a sensible default based on platform
    logger: defaultLogger
  }

  if (isLogger(config.logger)) {
    cleanConfiguration.logger = config.logger
  } else if (config.logger !== undefined) {
    cleanConfiguration.logger.warn(`Invalid configuration. logger should be a Logger object, got ${typeof config.logger}`)
  }

  if (typeof config.endpoint === 'string') {
    cleanConfiguration.endpoint = config.endpoint
  } else if (config.endpoint !== undefined) {
    cleanConfiguration.logger.warn(`Invalid configuration. endpoint should be a string, got ${typeof config.endpoint}`)
  }

  if (typeof config.releaseStage === 'string') {
    cleanConfiguration.releaseStage = config.releaseStage
  } else if (config.releaseStage !== undefined) {
    cleanConfiguration.logger.warn(`Invalid configuration. releaseStage should be a string, got ${typeof config.releaseStage}`)
  }

  return cleanConfiguration
}

function sanitizeTime (clock: Clock, time?: Time): number {
  if (typeof time === 'number') {
    // no need to change anything - we want to store numbers anyway
    // we assume this is nanosecond precision
    return time
  }

  if (time instanceof Date) {
    return clock.convert(time)
  }

  return clock.now()
}

export interface ClientOptions<SchemaType extends CoreSchema> {
  clock: Clock
  idGenerator: IdGenerator
  processorFactory: ProcessorFactory
  resourceAttributesSource: ResourceAttributeSource
  spanAttributesSource: SpanAttributesSource
  schema: SchemaType
}

export function createClient<PlatformSchema extends CoreSchema> (options: ClientOptions<PlatformSchema>): BugsnagPerformance {
  const bufferingProcessor = new BufferingProcessor()
  let processor: Processor = bufferingProcessor

  return {
    start: (config: Configuration | string) => {
      const configuration = validate(config)
      processor = options.processorFactory.create(configuration)
      bufferingProcessor.spans.forEach(span => {
        processor.add(span)
      })
    },
    startSpan: (name, startTime) => {
      const spanInternal: SpanInternal = {
        name,
        kind: Kind.Client, // TODO: How do we define the current kind?
        id: options.idGenerator.generate(64),
        traceId: options.idGenerator.generate(128),
        startTime: sanitizeTime(options.clock, startTime),
        attributes: new SpanAttributes(options.spanAttributesSource())
      }

      return {
        // TODO Expose internal span to platforms using Symbol / WeakMap?
        end: (endTime) => {
          processor.add({ ...spanInternal, endTime: sanitizeTime(options.clock, endTime) })
        }
      }
    }
  }
}

export function createNoopClient (): BugsnagPerformance {
  const noop = () => {}

  return {
    start: noop,
    startSpan: () => ({ end: noop })
  }
}
