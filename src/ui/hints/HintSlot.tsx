import {createContext,useContext} from 'react';
/** The header slot (right before the close button) of the window that contains the caller, or null. */
export const WindowHintSlot=createContext<HTMLElement|null>(null);
export const useWindowHintSlot=()=>useContext(WindowHintSlot);
