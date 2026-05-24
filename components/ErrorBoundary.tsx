'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode; // Optional custom fallback UI
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Simple Error Boundary that catches rendering errors in its child component tree.
 * It displays a fallback UI with a retry button that attempts to reset the error state.
 * This component is intended for client-side use only (hence 'use client').
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(_: Error) {
    // Update state so the next render shows the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // You can log the error to an external service here.
    console.error('ErrorBoundary caught an error', error, info);
    this.setState({ error });
  }

  handleReset() {
    // Reset error state to attempt re-render of children.
    this.setState({ hasError: false, error: undefined });
  }

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      return (
        <div className="p-6 bg-red-50 text-red-800 rounded-md">
          <h2 className="text-lg font-bold mb-2">Algo deu errado.</h2>
          {error && <pre className="whitespace-pre-wrap mb-2 text-sm">{error.message}</pre>}
          {fallback ?? (
            <button
              onClick={this.handleReset}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Tentar novamente
            </button>
          )}
        </div>
      );
    }

    return children;
  }
}
