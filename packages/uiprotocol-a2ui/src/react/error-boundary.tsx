import type { ReactNode } from "react";
import { Component } from "react";

interface NodeErrorBoundaryProps {
  fallback: ReactNode;
  onError: (error: Error) => void;
  children: ReactNode;
}

interface NodeErrorBoundaryState {
  hasError: boolean;
}

export class NodeErrorBoundary extends Component<
  NodeErrorBoundaryProps,
  NodeErrorBoundaryState
> {
  state: NodeErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(): NodeErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    this.props.onError(error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
