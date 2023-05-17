import { NetworkRequestPlugin } from '../lib/auto-instrumentation/network-request-plugin'
import { MockSpanFactory, createConfiguration } from '@bugsnag/js-performance-test-utilities'
import { RequestTracker, type RequestStartCallback } from '../lib/request-tracker/request-tracker'
import { type BrowserConfiguration } from '../lib/config'

const ENDPOINT = 'http://traces.endpoint'
const TEST_URL = 'http://test-url.com/'

class MockRequestTracker extends RequestTracker {
  onStart = jest.fn((startCallback: RequestStartCallback) => {
    super.onStart(startCallback)
  })
}

describe('network span plugin', () => {
  let xhrTracker: MockRequestTracker
  let fetchTracker: MockRequestTracker
  let spanFactory: MockSpanFactory

  beforeEach(() => {
    xhrTracker = new MockRequestTracker()
    fetchTracker = new MockRequestTracker()
    spanFactory = new MockSpanFactory()
  })

  it('tracks requests when autoInstrumentNetworkRequests = true', () => {
    const plugin = new NetworkRequestPlugin(spanFactory, fetchTracker, xhrTracker)
    expect(xhrTracker.onStart).not.toHaveBeenCalled()
    expect(fetchTracker.onStart).not.toHaveBeenCalled()

    plugin.configure(createConfiguration<BrowserConfiguration>({
      endpoint: ENDPOINT,
      autoInstrumentNetworkRequests: true
    }))

    expect(xhrTracker.onStart).toHaveBeenCalled()
    expect(fetchTracker.onStart).toHaveBeenCalled()
  })

  it('starts a span on request start', () => {
    const plugin = new NetworkRequestPlugin(spanFactory, fetchTracker, xhrTracker)

    plugin.configure(createConfiguration<BrowserConfiguration>({
      endpoint: ENDPOINT,
      autoInstrumentNetworkRequests: true
    }))

    fetchTracker.start({ method: 'GET', url: TEST_URL, startTime: 1 })
    expect(spanFactory.startSpan).toHaveBeenCalledWith('[HTTP]/GET', 1)

    xhrTracker.start({ method: 'POST', url: TEST_URL, startTime: 2 })
    expect(spanFactory.startSpan).toHaveBeenCalledWith('[HTTP]/POST', 2)
  })

  it('ends a span on request end', () => {
    const plugin = new NetworkRequestPlugin(spanFactory, fetchTracker, xhrTracker)

    plugin.configure(createConfiguration<BrowserConfiguration>({
      endpoint: ENDPOINT,
      autoInstrumentNetworkRequests: true
    }))

    const endRequest = fetchTracker.start({ method: 'GET', url: TEST_URL, startTime: 1 })
    expect(spanFactory.startSpan).toHaveBeenCalledWith('[HTTP]/GET', 1)

    expect(spanFactory.endSpan).not.toHaveBeenCalled()
    endRequest({ status: 200, endTime: 2, state: 'success' })
    expect(spanFactory.endSpan).toHaveBeenCalledWith(spanFactory.createdSpans[0], 2)
  })

  it('does not track requests when autoInstrumentNetworkRequests = false', () => {
    const plugin = new NetworkRequestPlugin(spanFactory, fetchTracker, xhrTracker)

    plugin.configure(createConfiguration<BrowserConfiguration>({
      endpoint: ENDPOINT,
      autoInstrumentNetworkRequests: false
    }))

    expect(xhrTracker.onStart).not.toHaveBeenCalled()
    expect(fetchTracker.onStart).not.toHaveBeenCalled()
  })

  it('does not track requests to the configured traces endpoint', () => {
    const plugin = new NetworkRequestPlugin(spanFactory, fetchTracker, xhrTracker)

    plugin.configure(createConfiguration<BrowserConfiguration>({
      endpoint: ENDPOINT,
      autoInstrumentNetworkRequests: true
    }))

    fetchTracker.start({ method: 'GET', url: `${ENDPOINT}/traces`, startTime: 1 })
    expect(spanFactory.startSpan).not.toHaveBeenCalled()
  })

  it('does not track requests to an ignored url (string)', () => {
    const plugin = new NetworkRequestPlugin(spanFactory, fetchTracker, xhrTracker)

    plugin.configure(createConfiguration<BrowserConfiguration>({
      endpoint: ENDPOINT,
      autoInstrumentNetworkRequests: true,
      networkInstrumentationIgnoreUrls: [TEST_URL]
    }))

    fetchTracker.start({ method: 'GET', url: TEST_URL, startTime: 1 })
    expect(spanFactory.startSpan).not.toHaveBeenCalled()
  })

  it('does not track requests to an ignored url (regex)', () => {
    const plugin = new NetworkRequestPlugin(spanFactory, fetchTracker, xhrTracker)

    const urlsToIgnore = [
      // exactly 'https://www.bugsnag.com'
      /^https:\/\/www.bugsnag.com$/,
      // 'http://www.bugsnag.com' anywhere in the URL
      /http:\/\/www.bugsnag.com/
    ]

    plugin.configure(createConfiguration<BrowserConfiguration>({
      endpoint: ENDPOINT,
      autoInstrumentNetworkRequests: true,
      networkInstrumentationIgnoreUrls: urlsToIgnore
    }))

    // matches the first URL to exclude
    fetchTracker.start({ method: 'GET', url: 'https://www.bugsnag.com', startTime: 1 })
    expect(spanFactory.startSpan).not.toHaveBeenCalled()

    // matches the second URL to exclude
    fetchTracker.start({ method: 'GET', url: 'http://example.com/a/b/c?x=http://www.bugsnag.com', startTime: 1 })
    expect(spanFactory.startSpan).not.toHaveBeenCalled()

    // does not match the URLs to exclude
    fetchTracker.start({ method: 'GET', url: TEST_URL, startTime: 1 })
    expect(spanFactory.startSpan).toHaveBeenCalledWith('[HTTP]/GET', 1)
  })

  it('discards the span if the status is 0', () => {
    const plugin = new NetworkRequestPlugin(spanFactory, fetchTracker, xhrTracker)

    plugin.configure(createConfiguration<BrowserConfiguration>({
      endpoint: ENDPOINT,
      autoInstrumentNetworkRequests: true
    }))

    const endRequest = xhrTracker.start({ method: 'GET', url: TEST_URL, startTime: 1 })
    expect(spanFactory.startSpan).toHaveBeenCalledWith('[HTTP]/GET', 1)

    endRequest({ endTime: 2, state: 'error' })
    expect(spanFactory.endSpan).not.toHaveBeenCalled()
  })

  it('discards the span if there is an error', () => {
    const plugin = new NetworkRequestPlugin(spanFactory, fetchTracker, xhrTracker)

    plugin.configure(createConfiguration<BrowserConfiguration>({
      endpoint: ENDPOINT,
      autoInstrumentNetworkRequests: true
    }))

    const endRequest = fetchTracker.start({ method: 'GET', url: TEST_URL, startTime: 1 })
    expect(spanFactory.startSpan).toHaveBeenCalledWith('[HTTP]/GET', 1)

    endRequest({ state: 'error', error: new Error('woopsy'), endTime: 2 })
    expect(spanFactory.endSpan).not.toHaveBeenCalled()
  })
})
