import {
  type RequestTracker,
  type RequestStartContext,
  type RequestEndContext,
  type RequestEndCallback
} from '../request-tracker/request-tracker'
import { type SpanFactory, type Plugin, type InternalConfiguration } from '@bugsnag/js-performance-core'
import { type BrowserConfiguration } from '../config'

export class NetworkRequestPlugin implements Plugin<BrowserConfiguration> {
  private ignoredUrls: RegExp[] = []

  constructor (
    private spanFactory: SpanFactory,
    private fetchTracker: RequestTracker,
    private xhrTracker: RequestTracker
  ) {}

  configure (configuration: InternalConfiguration<BrowserConfiguration>) {
    if (configuration.autoInstrumentNetworkRequests) {
      this.ignoredUrls = configuration.networkInstrumentationIgnoreUrls.map(
        (url: string | RegExp): RegExp => typeof url === 'string' ? RegExp(url) : url
      ).concat(RegExp(configuration.endpoint))

      this.xhrTracker.onStart(this.trackRequest)
      this.fetchTracker.onStart(this.trackRequest)
    }
  }

  private trackRequest = (startContext: RequestStartContext): RequestEndCallback | undefined => {
    if (!this.shouldTrackRequest(startContext)) return

    // TODO: set span attributes
    const span = this.spanFactory.startSpan(
      `[HTTP]/${startContext.method.toUpperCase()}`,
      startContext.startTime
    )
    return (endContext: RequestEndContext) => {
      if (endContext.state === 'success') this.spanFactory.endSpan(span, endContext.endTime)
    }
  }

  private shouldTrackRequest (startContext: RequestStartContext): boolean {
    return !this.ignoredUrls.some(url => url.test(startContext.url))
  }
}
