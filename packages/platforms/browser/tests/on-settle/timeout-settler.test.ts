/**
 * @jest-environment jsdom
 */

import TimeoutSettler from '../../lib/on-settle/timeout-settler'

describe('TimeoutSettler', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  it('settles when the given timeout has elapsed', async () => {
    const settleCallback = jest.fn()
    const settler = new TimeoutSettler(10)

    settler.subscribe(settleCallback)

    // advance by 9ms - 1ms short of when the timeout should fire
    for (let i = 0; i < 9; ++i) {
      await jest.advanceTimersByTimeAsync(1)
      expect(settleCallback).not.toHaveBeenCalled()
    }

    expect(settler.isSettled()).toBe(false)

    await jest.advanceTimersByTimeAsync(1)
    expect(settleCallback).toHaveBeenCalled()
    expect(settler.isSettled()).toBe(true)
  })

  it('can handle multiple callbacks', async () => {
    const callbacks = [jest.fn(), jest.fn(), jest.fn(), jest.fn(), jest.fn()]

    const settler = new TimeoutSettler(100)
    expect(settler.isSettled()).toBe(false)

    for (const callback of callbacks) {
      settler.subscribe(callback)
      expect(callback).not.toHaveBeenCalled()
    }

    await jest.advanceTimersByTimeAsync(100)
    expect(settler.isSettled()).toBe(true)

    for (const callback of callbacks) {
      expect(callback).toHaveBeenCalled()
    }
  })

  it('can subscribe a callback', async () => {
    const settleCallback1 = jest.fn()
    const settleCallback2 = jest.fn()

    const settler = new TimeoutSettler(50)
    expect(settler.isSettled()).toBe(false)

    settler.subscribe(settleCallback1)
    settler.subscribe(settleCallback2)

    settler.unsubscribe(settleCallback1)

    await jest.advanceTimersByTimeAsync(100)
    expect(settler.isSettled()).toBe(true)

    expect(settleCallback1).not.toHaveBeenCalled()
    expect(settleCallback2).toHaveBeenCalled()
  })

  it('calls callbacks immediately if already settled', async () => {
    const settleCallback1 = jest.fn()
    const settleCallback2 = jest.fn()

    const settler = new TimeoutSettler(50)
    expect(settler.isSettled()).toBe(false)

    await jest.advanceTimersByTimeAsync(150)
    expect(settler.isSettled()).toBe(true)

    settler.subscribe(settleCallback1)
    settler.subscribe(settleCallback2)

    expect(settleCallback1).toHaveBeenCalled()
    expect(settleCallback2).toHaveBeenCalled()
  })

  it('can be cancelled', async () => {
    const settleCallback = jest.fn()
    const settler = new TimeoutSettler(10)

    settler.subscribe(settleCallback)

    settler.cancel()

    await jest.advanceTimersByTimeAsync(10)

    expect(settleCallback).not.toHaveBeenCalled()
    expect(settler.isSettled()).toBe(false)
  })
})
