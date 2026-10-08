import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './ui/styles/openCommand.css';
import './ui/styles/decisionsWorld.css';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import "./ui/styles/guidedCommand.css";
import "./ui/styles/civicCommand.css";

import "./ui/styles/realPresident.css";

import "./ui/styles/tacticalCommand.css";
import "./ui/styles/commandPolish.css";
