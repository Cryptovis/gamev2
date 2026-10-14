import {createContext} from 'react';
/** React context crosses portals, keeping retained parent workspaces suspended even when country IDs overlap. */
export const WorkspaceActivityContext=createContext(true);
