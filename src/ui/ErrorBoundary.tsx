import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';
import { LocaleText } from '../i18n/localeText';

interface Action { label: string; onClick: () => void }
interface Props { children: ReactNode; title: string; actions?: Action[]; fallback?: (error:Error)=>ReactNode }
interface State { error: Error | null; attempt: number }

/**
 * Catches render errors below it so one failing panel no longer unmounts the whole game and leaves a blank page.
 * Shows the error text so players can report it, plus "Try again" (remount) and any caller actions.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error boundary caught an error:', error, info.componentStack);
  }

  render() {
    const { error, attempt } = this.state;
    if (!error) return <Fragment key={attempt}>{this.props.children}</Fragment>;
    if (this.props.fallback) return this.props.fallback(error);
    return (
      <div className="error-boundary" role="alert" data-testid="error-boundary">
        <h3><LocaleText value={this.props.title} /></h3>
        <p><LocaleText value="Your saved progress is safe. Try again, or send this message to the developer:" /></p>
        <pre>{error.message || String(error)}</pre>
        <div className="error-boundary-actions">
          <button onClick={() => this.setState({ error: null, attempt: attempt + 1 })}><LocaleText value="Try again" /></button>
          {this.props.actions?.map(action => <button key={action.label} onClick={action.onClick}><LocaleText value={action.label} /></button>)}
        </div>
      </div>
    );
  }
}
