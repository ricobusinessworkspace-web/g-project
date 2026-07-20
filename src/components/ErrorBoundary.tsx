import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', wordBreak: 'break-all', fontFamily: 'monospace', background: '#1c1c1e', height: '100vh', overflow: 'auto' }}>
          <h2>App Crashed!</h2>
          <p>{this.state.error?.message}</p>
          <pre style={{ fontSize: '10px' }}>{this.state.error?.stack}</pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px', padding: '10px 20px', background: 'white', color: 'black', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
