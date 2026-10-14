import {initializeAppearance} from './presentation/appearance';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './ui/styles/openCommand.css';
import './ui/styles/decisionsWorld.css';
import { App } from './app/App';
import { ErrorBoundary } from './ui/ErrorBoundary';

void initializeAppearance().then(()=>createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary title="The game hit an unexpected error." actions={[{ label: 'Reload the game', onClick: () => location.reload() }]}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
));

import "./ui/styles/guidedCommand.css";
import "./ui/styles/civicCommand.css";

import "./ui/styles/realPresident.css";

import "./ui/styles/tacticalCommand.css";
import "./ui/styles/commandPolish.css";

import "./ui/styles/flowCommand.css";
import "./ui/styles/entryScreen.css";
import "./ui/styles/setupScreen.css";
import "./ui/styles/commodityExchange.css";

import "./ui/styles/researchReadiness.css";

import "./ui/styles/windowLayers.css";

import "./ui/styles/sectionMenu.css";

import "./ui/styles/clearCommand.css";

import "./ui/styles/marketPolicies0903.css";

import "./ui/styles/commandCredit0904.css";

import "./ui/styles/commandWindows0905.css";

import "./ui/styles/commandIntelligence0907.css";

import "./ui/styles/compactWorkspaces0908.css";
import "./ui/styles/motion0910.css";
import "./ui/styles/typography0910.css";
import "./ui/styles/targetHub0915.css";
import "./ui/styles/executiveDesk0916.css";
import "./ui/styles/cardUi0918.css";
import "./ui/styles/livingWorld0919.css";
import "./ui/styles/mapDesk0917.css";

import "./ui/styles/appearancePhase7.css";
