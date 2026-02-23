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

  componentDidCatch(error: unknown): void {
    const normalized =
      error instanceof Error
        ? error
        : new Error(typeof error === "string" ? error : String(error));
    this.props.onError(normalized);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
