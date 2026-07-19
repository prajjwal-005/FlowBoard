'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Catches render errors in arbitrary subtrees (modals, DnD, etc.) —
// Next's route-level error.tsx only catches errors during route rendering,
// not everything nested under a client component tree.
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
            <AlertTriangle className="w-6 h-6 text-error" />
            <p className="text-body text-foreground">Something went wrong.</p>
            <Button onClick={this.reset} size="sm" variant="outline">
              Try again
            </Button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}