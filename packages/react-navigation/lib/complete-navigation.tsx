import React, { type PropsWithChildren } from 'react'
import { NavigationContext } from './navigation-context'

interface Props extends PropsWithChildren {
  on: 'mount' | 'unmount' | boolean
}

/** End the current navigation span when the component is mounted, unmounted or the `on` prop is `true` */
export class CompleteNavigation extends React.Component<Props> {
  static contextType = NavigationContext

  declare context: React.ContextType<typeof NavigationContext>

  constructor (props: Props, context: React.ContextType<typeof NavigationContext>) {
    super(props)

    context.blockNavigationEnd()
  }

  componentDidMount () {
    if (this.props.on === 'mount') {
      setTimeout(() => {
        this.context.unblockNavigationEnd('mount')
      })
    }
  }

  componentWillUnmount () {
    if (this.props.on === 'unmount') {
      this.context.unblockNavigationEnd('unmount')
    }
  }

  componentDidUpdate (prevProps: Readonly<Props>) {
    if (typeof this.props.on === 'boolean') {
      if (this.props.on && !prevProps.on) {
        this.context.unblockNavigationEnd('condition')
      }
    }
  }

  render () {
    return this.props.children
  }
}
