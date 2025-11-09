import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.resetErrorBoundary = this.resetErrorBoundary.bind(this);
  }

  resetErrorBoundary() {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error || new Error('Unknown error'),
      errorInfo: errorInfo || { componentStack: 'No component stack available' }
    });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-2xl font-bold text-destructive mb-4">出现错误</h2>
            <p className="text-muted-foreground mb-4">
              应用程序遇到了意外错误，请刷新页面重试。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              刷新页面
            </button>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm font-mono text-muted-foreground">
                  错误详情 (开发模式)
                </summary>
                <pre className="text-xs text-destructive mt-2 overflow-auto max-h-40 bg-muted p-2 rounded">
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;