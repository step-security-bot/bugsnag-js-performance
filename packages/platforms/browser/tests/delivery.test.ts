/**
 * @jest-environment jsdom
 */

import { type TracePayload } from '@bugsnag/core-performance'
import { ControllableBackgroundingListener } from '@bugsnag/js-performance-test-utilities'
import createBrowserDeliveryFactory from '../lib/delivery'

// the format of the Bugsnag-Sent-At header: YYYY-MM-DDTHH:mm:ss.sssZ
const SENT_AT_FORMAT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

describe('Browser Delivery', () => {
  it('delivers a span', () => {
    const fetch = jest.fn(() => Promise.resolve({} as unknown as Response))
    const backgroundingListener = new ControllableBackgroundingListener()

    const deliveryPayload: TracePayload = {
      body: {
        resourceSpans: [{
          resource: { attributes: [{ key: 'test-key', value: { stringValue: 'test-value' } }] },
          scopeSpans: [{
            spans: [{
              name: 'test-span',
              kind: 1,
              spanId: 'test-span-id',
              traceId: 'test-trace-id',
              endTimeUnixNano: '56789',
              startTimeUnixNano: '12345',
              attributes: [{ key: 'test-span', value: { intValue: '12345' } }],
              events: []
            }]
          }]
        }]
      },
      headers: {
        'Bugsnag-Api-Key': 'test-api-key',
        'Content-Type': 'application/json',
        'Bugsnag-Span-Sampling': '1:1'
      }
    }

    const deliveryFactory = createBrowserDeliveryFactory(fetch, backgroundingListener)
    const delivery = deliveryFactory('/test')
    delivery.send(deliveryPayload)

    expect(fetch).toHaveBeenCalledWith('/test', {
      method: 'POST',
      keepalive: false,
      body: JSON.stringify(deliveryPayload.body),
      headers: {
        'Bugsnag-Api-Key': 'test-api-key',
        'Bugsnag-Span-Sampling': '1:1',
        'Content-Type': 'application/json',
        'Bugsnag-Sent-At': expect.stringMatching(SENT_AT_FORMAT)
      }
    })
  })

  it('delivers a span with keepalive = true when the app is backgrounded', () => {
    const fetch = jest.fn(() => Promise.resolve({} as unknown as Response))
    const backgroundingListener = new ControllableBackgroundingListener()

    const deliveryPayload: TracePayload = {
      body: {
        resourceSpans: [{
          resource: { attributes: [{ key: 'test-key', value: { stringValue: 'test-value' } }] },
          scopeSpans: [{
            spans: [{
              name: 'test-span',
              kind: 1,
              spanId: 'test-span-id',
              traceId: 'test-trace-id',
              endTimeUnixNano: '56789',
              startTimeUnixNano: '12345',
              attributes: [{ key: 'test-span', value: { intValue: '12345' } }],
              events: []
            }]
          }]
        }]
      },
      headers: {
        'Bugsnag-Api-Key': 'test-api-key',
        'Content-Type': 'application/json',
        'Bugsnag-Span-Sampling': '1:1'
      }
    }

    const deliveryFactory = createBrowserDeliveryFactory(fetch, backgroundingListener)
    const delivery = deliveryFactory('/test')

    backgroundingListener.sendToBackground()

    delivery.send(deliveryPayload)

    expect(fetch).toHaveBeenCalledWith('/test', {
      method: 'POST',
      keepalive: true,
      body: JSON.stringify(deliveryPayload.body),
      headers: {
        'Bugsnag-Api-Key': 'test-api-key',
        'Bugsnag-Span-Sampling': '1:1',
        'Content-Type': 'application/json',
        'Bugsnag-Sent-At': expect.stringMatching(SENT_AT_FORMAT)
      }
    })
  })

  it('delivers a span with keepalive = false when the app is returned to the foreground', () => {
    const fetch = jest.fn(() => Promise.resolve({} as unknown as Response))
    const backgroundingListener = new ControllableBackgroundingListener()

    const deliveryPayload: TracePayload = {
      body: {
        resourceSpans: [{
          resource: { attributes: [{ key: 'test-key', value: { stringValue: 'test-value' } }] },
          scopeSpans: [{
            spans: [{
              name: 'test-span',
              kind: 1,
              spanId: 'test-span-id',
              traceId: 'test-trace-id',
              endTimeUnixNano: '56789',
              startTimeUnixNano: '12345',
              attributes: [{ key: 'test-span', value: { intValue: '12345' } }],
              events: []
            }]
          }]
        }]
      },
      headers: {
        'Bugsnag-Api-Key': 'test-api-key',
        'Content-Type': 'application/json',
        'Bugsnag-Span-Sampling': '1:1'
      }
    }

    const deliveryFactory = createBrowserDeliveryFactory(fetch, backgroundingListener)
    const delivery = deliveryFactory('/test')

    backgroundingListener.sendToBackground()
    backgroundingListener.sendToForeground()

    delivery.send(deliveryPayload)

    expect(fetch).toHaveBeenCalledWith('/test', {
      method: 'POST',
      keepalive: false,
      body: JSON.stringify(deliveryPayload.body),
      headers: {
        'Bugsnag-Api-Key': 'test-api-key',
        'Bugsnag-Span-Sampling': '1:1',
        'Content-Type': 'application/json',
        'Bugsnag-Sent-At': expect.stringMatching(SENT_AT_FORMAT)
      }
    })
  })

  it.each([
    ['0', 0],
    ['0.0', 0],
    ['1', 1],
    ['1.0', 1],
    ['0.1', 0.1],
    ['0.25', 0.25],
    ['0.9', 0.9],
    // whitespace is not important
    ['   1.0   ', 1.0],
    // invalid values should return 'undefined'
    ['-0.1', undefined],
    ['1.1', undefined],
    [':)', undefined]
  ])('returns the sampling rate if the response headers contain one (%f)', async (header, expected) => {
    const headers = new Headers()
    headers.set('Bugsnag-Sampling-Probability', header)

    const fetch = jest.fn(() => Promise.resolve({ status: 200, headers } as unknown as Response))
    const backgroundingListener = new ControllableBackgroundingListener()

    const deliveryFactory = createBrowserDeliveryFactory(fetch, backgroundingListener)
    const delivery = deliveryFactory('/test')
    const deliveryPayload: TracePayload = {
      body: { resourceSpans: [] },
      headers: {
        'Bugsnag-Api-Key': 'test-api-key',
        'Content-Type': 'application/json',
        'Bugsnag-Span-Sampling': '1.0:0'
      }
    }

    const response = await delivery.send(deliveryPayload)

    expect(fetch).toHaveBeenCalledWith('/test', {
      method: 'POST',
      keepalive: false,
      body: JSON.stringify({ resourceSpans: [] }),
      headers: {
        'Bugsnag-Api-Key': 'test-api-key',
        'Bugsnag-Span-Sampling': '1.0:0',
        'Content-Type': 'application/json',
        'Bugsnag-Sent-At': expect.stringMatching(SENT_AT_FORMAT)
      }
    })

    expect(response).toStrictEqual({
      state: 'success',
      samplingProbability: expected
    })
  })

  it('returns no sampling rate if the probability response header is missing', async () => {
    const headers = new Headers()
    headers.set('Some-Other-Header', 'hello')

    const fetch = jest.fn(() => Promise.resolve({ status: 200, headers } as unknown as Response))
    const backgroundingListener = new ControllableBackgroundingListener()

    const deliveryFactory = createBrowserDeliveryFactory(fetch, backgroundingListener)
    const delivery = deliveryFactory('/test')
    const payload: TracePayload = {
      body: { resourceSpans: [] },
      headers: {
        'Bugsnag-Api-Key': 'test-api-key',
        'Content-Type': 'application/json',
        'Bugsnag-Span-Sampling': '1.0:0'
      }
    }

    const response = await delivery.send(payload)

    expect(response).toStrictEqual({
      state: 'success',
      samplingProbability: undefined
    })
  })
})
