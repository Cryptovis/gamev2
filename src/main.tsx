import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './ui/styles/openCommand.css';
import './ui/styles/decisionsWorld.css';
import { App } from './app/App';
import { ErrorBoundary } from './ui/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary title="The game hit an unexpected error." actions={[{ label: 'Reload the game', onClick: () => location.reload() }]}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

import "./ui/styles/guidedCommand.css";
import "./ui/styles/civicCommand.css";

import "./ui/styles/realPresident.css";

import "./ui/styles/tacticalCommand.css";
import "./ui/styles/commandPolish.css";

import "./ui/styles/flowCommand.css";
import "./ui/styles/entryScreen.css";
import "./ui/styles/commodityExchange.css";
