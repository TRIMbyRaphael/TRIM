import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-cloudDancer text-stretchLimo">
          <h1 className="text-lg font-bold mb-2">오류가 발생했습니다</h1>
          <p className="text-sm text-micron mb-4 break-all">{this.state.error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-stretchLimo text-white rounded-lg"
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
