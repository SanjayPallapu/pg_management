import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { recoverFromStaleChunk, reloadLatestApp } from "@/lib/chunkRecovery";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  errorStack: string;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false, errorMessage: '', errorStack: '' };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || String(error), errorStack: error?.stack || '' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info.componentStack);
    recoverFromStaleChunk(error);
  }

  private handleReload = () => {
    void reloadLatestApp();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false });
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background px-4 py-10 text-foreground">
        <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your data is safe. Reload the app and continue from the latest saved state.
          </p>
          {this.state.errorMessage && (
            <div className="mt-3 w-full rounded-lg bg-destructive/10 p-3 text-left">
              <p className="text-xs font-bold text-destructive mb-1">Error:</p>
              <p className="text-xs text-destructive break-words">{this.state.errorMessage}</p>
              {this.state.errorStack && (
                <pre className="mt-2 text-[9px] text-muted-foreground overflow-auto max-h-32 whitespace-pre-wrap">{this.state.errorStack.split('\n').slice(0, 6).join('\n')}</pre>
              )}
            </div>
          )}
          <div className="mt-5 flex w-full flex-col gap-2">
            <Button onClick={this.handleReload} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reload App
            </Button>
            <Button variant="outline" onClick={this.handleGoHome}>
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
