import type { Plugin, SpanFactory, SpanInternal } from '@bugsnag/core-performance'
import type { ReactNativeConfiguration } from '@bugsnag/react-native-performance'
import type { NavigationDelegate } from 'react-native-navigation/lib/dist/src/NavigationDelegate'

type Reason = 'immediate' | 'mount' | 'unmount' | 'condition'

const NAVIGATION_START_TIMEOUT = 1000
const NAVIGATION_COMPLETE_TIMEOUT = 100

class ReactNativeNavigationPlugin implements Plugin<ReactNativeConfiguration> {
  private Navigation: NavigationDelegate
  private currentNavigationSpan?: SpanInternal
  private startTime?: number
  private startTimeout?: NodeJS.Timeout
  private endTimeout?: NodeJS.Timeout
  private componentsWaiting = 0
  private spanFactory?: SpanFactory<ReactNativeConfiguration>

  constructor (Navigation: NavigationDelegate) {
    this.Navigation = Navigation
  }

  private clearActiveSpan () {
    clearTimeout(this.startTimeout)
    clearTimeout(this.endTimeout)
    this.startTime = undefined
    this.currentNavigationSpan = undefined
  }

  /** Trigger the end of the current navigation span after 100ms */
  private triggerNavigationEnd = (spanFactory: SpanFactory<ReactNativeConfiguration>, endedBy: Reason, endTime = performance.now()) => {
    clearTimeout(this.endTimeout)

    this.endTimeout = setTimeout(() => {
      if (this.componentsWaiting === 0 && this.currentNavigationSpan) {
        this.currentNavigationSpan.setAttribute('bugsnag.navigation.ended_by', endedBy)
        spanFactory.endSpan(this.currentNavigationSpan, endTime)
        this.clearActiveSpan()
      }
    }, NAVIGATION_COMPLETE_TIMEOUT)
  }

  /**
   * Blocks the current navigation by incrementing the count of components waiting
   */
  blockNavigationEnd = () => {
    this.componentsWaiting += 1
  }

  /**
   * Unblocks the current navigation by decrementing the count of components waiting and setting the reason
   */
  unblockNavigationEnd = (endedBy: Reason) => {
    const renderTime = performance.now()

    this.componentsWaiting = Math.max(this.componentsWaiting - 1, 0)

    if (this.spanFactory) {
      this.triggerNavigationEnd(this.spanFactory, endedBy, renderTime)
    }
  }

  configure (configuration: ReactNativeConfiguration, spanFactory: SpanFactory<ReactNativeConfiguration>) {
    this.spanFactory = spanFactory

    // Potential for a navigation to occur
    this.Navigation.events().registerCommandListener((name, params) => {
      this.clearActiveSpan()
      this.startTime = performance.now()
      this.startTimeout = setTimeout(() => {
        this.clearActiveSpan()
      }, NAVIGATION_START_TIMEOUT)
    })

    // Navigation has occurred
    this.Navigation.events().registerComponentDidAppearListener(event => {
      if (typeof this.startTime === 'number') {
        const routeName = event.componentName
        this.currentNavigationSpan = spanFactory.startSpan('[Navigation]' + routeName, {
          startTime: this.startTime,
          isFirstClass: false,
          parentContext: null
        })

        this.currentNavigationSpan.setAttribute('bugsnag.span.category', 'navigation')
        this.currentNavigationSpan.setAttribute('bugsnag.navigation.route', routeName)
        this.currentNavigationSpan.setAttribute('bugsnag.navigation.triggered_by', '@bugsnag/react-native-navigation-performance')

        this.triggerNavigationEnd(spanFactory, 'immediate')
      }
    })
  }
}

export default ReactNativeNavigationPlugin
