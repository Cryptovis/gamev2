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
