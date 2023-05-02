import { type InternalConfiguration, type Plugin, type SpanFactory } from '@bugsnag/js-performance-core'
import { type BrowserConfiguration } from './config'

export interface PageLoadSpan {
  end: (time: number) => void
}

export class PageLoadSpanPlugin implements Plugin<BrowserConfiguration> {
  private spanFactory: SpanFactory
  private document: Document
  private location: Location

  constructor (document: Document, location: Location, spanFactory: SpanFactory) {
    this.document = document
    this.location = location
    this.spanFactory = spanFactory
  }

  configure (configuration: InternalConfiguration<BrowserConfiguration>) {
    if (!configuration.autoInstrumentFullPageLoads) return

    const pageLoadSpan: PageLoadSpan = {
      end: (endTime) => {
        const route = configuration.routingProvider.resolveRoute(window.location.pathname)

        const startTime = 0 // TODO: Get correct start time
        const span = this.spanFactory.startSpan(`[FullPageLoad]${route}`, startTime)

        // Browser attributes
        span.setAttribute('bugsnag.span.category', 'full_page_load')
        span.setAttribute('bugsnag.browser.page.referrer', this.document.referrer)
        span.setAttribute('bugsnag.browser.page.route', route)
        span.setAttribute('bugsnag.browser.page.title', this.document.title)
        span.setAttribute('bugsnag.browser.page.url', this.location.href)

        this.spanFactory.endSpan(span, endTime)
      }
    }

    configuration.routingProvider.initialize({ pageLoadSpan })
  }
}
