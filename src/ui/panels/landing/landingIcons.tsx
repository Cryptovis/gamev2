// Small inline icons for the utility dock. Decorative: the buttons that use them carry their own text labels.
const props={width:18,height:18,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true,focusable:false};

export const MoonIcon=()=><svg {...props}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>;
export const SunIcon=()=><svg {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
export const SpeakerIcon=()=><svg {...props}><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>;
export const SpeakerOffIcon=()=><svg {...props}><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6M16 9l6 6"/></svg>;
export const NotesIcon=()=><svg {...props}><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/></svg>;
export const DossierIcon=()=><svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
export const PlusIcon=()=><svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
export const ScrollIcon=()=><svg {...props}><path d="M8 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8"/><path d="M8 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2"/><path d="M11 9h6M11 13h6"/></svg>;
