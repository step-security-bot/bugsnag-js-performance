import { createClient } from '../lib/core'

describe('Core', () => {
  describe('createClient()', () => {
    it('returns a BugsnagPerformance client', () => {
      const testProcessor = { add: jest.fn() }
      const testClient = createClient({ processor: testProcessor })
      expect(testClient).toStrictEqual({
        start: expect.any(Function),
        startSpan: expect.any(Function)
      })
    })

    describe('BugsnagPerformance', () => {
      describe('start()', () => {
        beforeEach(() => {
          jest.restoreAllMocks()
          jest.spyOn(console, 'debug')
          jest.spyOn(console, 'info')
          jest.spyOn(console, 'warn')
          jest.spyOn(console, 'error')
        })

        it('accepts a string', () => {
          const testProcessor = { add: jest.fn() }
          const testClient = createClient({ processor: testProcessor })
          testClient.start('test-api-key')

          expect(console.warn).not.toHaveBeenCalled()
        })

        it('accepts a minimal valid configuration object', () => {
          const testProcessor = { add: jest.fn() }
          const testClient = createClient({ processor: testProcessor })
          testClient.start({ apiKey: 'test-api-key' })

          expect(console.warn).not.toHaveBeenCalled()
        })

        it('accepts a complete configuration object', () => {
          const testProcessor = { add: jest.fn() }
          const testClient = createClient({ processor: testProcessor })
          const logger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
          }

          testClient.start({
            apiKey: 'test-api-key',
            endpoint: '/test',
            releaseStage: 'test',
            logger
          })

          expect(logger.warn).not.toHaveBeenCalled()
        })

        const invalidParameters = [
          { type: 'bigint', value: BigInt(9007199254740991) },
          { type: 'boolean', value: true },
          { type: 'function', value: () => {} },
          { type: 'number', value: 12345 },
          { type: 'object', value: { property: 'test' } },
          { type: 'object', value: [] },
          { type: 'symbol', value: Symbol('test') }
        ]

        test.each(invalidParameters)('warns if config.endpoint is invalid ($type)', ({ value, type }) => {
          jest.spyOn(console, 'warn').mockImplementation()
          const testProcessor = { add: jest.fn() }
          const testClient = createClient({ processor: testProcessor })
          // @ts-expect-error endpoint should be a string
          testClient.start({ apiKey: 'test-api-key', endpoint: value })
          expect(console.warn).toHaveBeenCalledWith(`Invalid configuration. endpoint should be a string, got ${type}`)
        })

        test.each(invalidParameters)('warns if config.releaseStage is invalid ($type)', ({ value, type }) => {
          jest.spyOn(console, 'warn').mockImplementation()
          const testProcessor = { add: jest.fn() }
          const testClient = createClient({ processor: testProcessor })
          // @ts-expect-error releaseStage should be a string
          testClient.start({ apiKey: 'test-api-key', releaseStage: value })
          expect(console.warn).toHaveBeenCalledWith(`Invalid configuration. releaseStage should be a string, got ${type}`)
        })

        test.each(invalidParameters)('warns if config.logger is invalid ($type)', ({ value, type }) => {
          jest.spyOn(console, 'warn').mockImplementation()
          const testProcessor = { add: jest.fn() }
          const testClient = createClient({ processor: testProcessor })
          // @ts-expect-error logger should be a logger object
          testClient.start({ apiKey: 'test-api-key', logger: value })
          expect(console.warn).toHaveBeenCalledWith(`Invalid configuration. logger should be a Logger object, got ${type}`)
        })

        test.each(invalidParameters)('uses config.logger if it is valid', ({ value, type }) => {
          const testProcessor = { add: jest.fn() }
          const testClient = createClient({ processor: testProcessor })

          const logger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
          }

          // @ts-expect-error logger should be a logger object
          testClient.start({ apiKey: 'test-api-key', logger, endpoint: value, releaseStage: value })

          expect(logger.warn).toHaveBeenCalledWith(`Invalid configuration. endpoint should be a string, got ${type}`)
          expect(logger.warn).toHaveBeenCalledWith(`Invalid configuration. releaseStage should be a string, got ${type}`)
        })

        const invalidParameters = [
          { type: 'bigint', value: BigInt(9007199254740991) },
          { type: 'boolean', value: true },
          { type: 'function', value: () => {} },
          { type: 'number', value: 12345 },
          { type: 'object', value: { property: 'test' } },
          { type: 'object', value: [] },
          { type: 'symbol', value: Symbol('test') }
        ]

        test.each(invalidParameters)('warns if config.endpoint is invalid ($type)', ({ value, type }) => {
          jest.spyOn(console, 'warn')
          const testClient = createClient()
          // @ts-expect-error endpoint should be a string
          testClient.start({ apiKey: 'test-api-key', endpoint: value })
          expect(console.warn).toHaveBeenCalledWith(`Invalid configuration. endpoint should be a string, got ${String(type)}`)
        })

        test.each(invalidParameters)('warns if config.releaseStage is invalid ($type)', ({ value, type }) => {
          jest.spyOn(console, 'warn')
          const testClient = createClient()
          // @ts-expect-error releaseStage should be a string
          testClient.start({ apiKey: 'test-api-key', releaseStage: value })
          expect(console.warn).toHaveBeenCalledWith(`Invalid configuration. releaseStage should be a string, got ${String(type)}`)
        })

        it('throws if no configuration is provided', () => {
          const testProcessor = { add: jest.fn() }
          const testClient = createClient({ processor: testProcessor })
          // @ts-expect-error no configuration provided
          expect(() => { testClient.start() }).toThrow('No Bugsnag API Key set')
        })

        it.each([
          { type: 'a bigint', config: BigInt(9007199254740991) },
          { type: 'a function', config: () => {} },
          { type: 'a number', config: 12345 },
          { type: 'a date', config: new Date() },
          { type: 'boolean (true)', config: true },
          { type: 'boolean (false)', config: false },
          { type: 'null', config: null },
          { type: 'an invalid configuration object', config: { property: 'test' } },
          { type: 'an array', config: [] },
          { type: 'a symbol', config: Symbol('test') }
        ])('throws if provided configuration is $type', ({ config }) => {
          const testProcessor = { add: jest.fn() }
          const testClient = createClient({ processor: testProcessor })
          // @ts-expect-error invalid configuration provided
          expect(() => { testClient.start(config) }).toThrow('No Bugsnag API Key set')
        })
      })
    })
  })
})
