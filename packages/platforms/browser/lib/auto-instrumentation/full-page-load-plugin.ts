import {
  type BackgroundingListener,
  type InternalConfiguration,
  type Plugin,
  type SpanFactory
} from '@bugsnag/core-performance'
import { type BrowserConfiguration } from '../config'
import { type OnSettle } from '../on-settle'
import { type WebVitals } from '../web-vitals'

export class FullPageLoadPlugin implements Plugin<BrowserConfiguration> {
  private readonly spanFactory: SpanFactory
  private readonly document: Document
  private readonly location: Location
  private readonly onSettle: OnSettle
  private readonly webVitals: WebVitals

  // if the page was backgrounded at any point in the loading process a page
  // load span is invalidated as the browser will deprioritise the page
  private wasBackgrounded: boolean = false

  constructor (
    document: Document,
    location: Location,
    spanFactory: SpanFactory,
    webVitals: WebVitals,
    onSettle: OnSettle,
    backgroundingListener: BackgroundingListener
  ) {
    this.document = document
    this.location = location
    this.spanFactory = spanFactory
    this.webVitals = webVitals
    this.onSettle = onSettle

    backgroundingListener.onStateChange(state => {
      if (!this.wasBackgrounded && state === 'in-background') {
        this.wasBackgrounded = true
      }
    })
  }

  configure (configuration: InternalConfiguration<BrowserConfiguration>) {
    // don't report a page load span if the option is turned off or the page was
    // backgrounded at any point in the loading process
    if (!configuration.autoInstrumentFullPageLoads || this.wasBackgrounded) {
      return
    }

    const span = this.spanFactory.startSpan('[FullPageLoad]', { startTime: 0 })
    const url = new URL(this.location.href)

    this.onSettle((endTime: number) => {
      if (this.wasBackgrounded) return

      const route = configuration.routingProvider.resolveRoute(url)
      span.name += `${route}`

      // Browser attributes
      span.setAttribute('bugsnag.span.category', 'full_page_load')
      span.setAttribute('bugsnag.browser.page.referrer', this.document.referrer)
      span.setAttribute('bugsnag.browser.page.route', route)

      this.webVitals.attachTo(span)
      this.spanFactory.endSpan(span, endTime)
    })
  }
}
