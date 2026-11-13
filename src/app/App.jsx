import { Component, useState } from 'react';
import { StoreProvider } from '../state/store.js';
import AppShell from '../ui/shell/AppShell.jsx';
import { createContainer } from './container.js';

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fatal">
        <h1 className="title-2">AstroCare could not start</h1>
        <pre>{this.state.error.message}</pre>
      </div>
    );
  }
}

export default function App() {
  const [{ store }] = useState(createContainer);
  return (
    <ErrorBoundary>
      <StoreProvider store={store}>
        <AppShell />
      </StoreProvider>
    </ErrorBoundary>
  );
}
