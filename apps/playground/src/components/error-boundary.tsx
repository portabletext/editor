import * as React from 'react'

export type ErrorBoundaryFallbackUI<FallbackProps> = (
  props: {
    dismiss: () => void
    error: Error
  } & FallbackProps,
) => JSX.Element

export class ErrorBoundary<FallbackProps> extends React.Component<
  {
    children: React.ReactNode
    fallbackProps: FallbackProps
    fallback: ErrorBoundaryFallbackUI<FallbackProps>
    onError: ({error, errorInfo}: {error: Error; errorInfo: React.ErrorInfo}) => void
  },
  {error?: Error}
> {
  public override state = {
    error: undefined,
  }

  public static getDerivedStateFromError(error: Error) {
    return {error}
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError({error, errorInfo})
  }

  override render() {
    if (this.state.error) {
      return (
        <this.props.fallback
          {...this.props.fallbackProps}
          error={this.state.error}
          dismiss={() => {
            this.setState({error: undefined})
          }}
        />
      )
    }

    return this.props.children
  }
}
