import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log para console com detalhes completos
        console.error('🔴 [ErrorBoundary] Erro capturado:', {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack
        });

        this.setState({
            error,
            errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            const isDev = import.meta.env.DEV;

            return (
                <div className="min-h-screen bg-background flex items-center justify-center p-6">
                    <div className="max-w-2xl w-full bg-destructive/10 border border-destructive rounded-lg p-6">
                        <h1 className="text-2xl font-bold text-destructive mb-4">
                            ⚠️ Erro de Renderização
                        </h1>

                        <p className="text-muted-foreground mb-4">
                            Algo deu errado ao renderizar esta página.
                        </p>

                        {isDev && this.state.error && (
                            <div className="space-y-4">
                                <div className="bg-background rounded p-4 border">
                                    <h3 className="font-semibold mb-2">Erro:</h3>
                                    <pre className="text-sm text-destructive overflow-auto">
                                        {this.state.error.message}
                                    </pre>
                                </div>

                                {this.state.error.stack && (
                                    <div className="bg-background rounded p-4 border">
                                        <h3 className="font-semibold mb-2">Stack Trace:</h3>
                                        <pre className="text-xs text-muted-foreground overflow-auto max-h-64">
                                            {this.state.error.stack}
                                        </pre>
                                    </div>
                                )}

                                {this.state.errorInfo?.componentStack && (
                                    <div className="bg-background rounded p-4 border">
                                        <h3 className="font-semibold mb-2">Component Stack:</h3>
                                        <pre className="text-xs text-muted-foreground overflow-auto max-h-64">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => window.location.reload()}
                            className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                        >
                            Recarregar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
