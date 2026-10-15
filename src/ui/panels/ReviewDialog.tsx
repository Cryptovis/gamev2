import {useWindowLifecycle,WINDOW_LAYERS} from '../windows/useWindowLifecycle';
import {LocaleText,translateLive} from '../../i18n/localeText';
import { useRef } from "react";
import { createPortal } from "react-dom";
import { useGameStore } from "../../store/gameStore";
import {ReviewVisual,reviewVisualKind,type ReviewVisualKind} from '../icons/ReviewVisual';
import {AssetThumbnail} from '../icons/AssetThumbnail';
export interface ReviewContent {
  title: string;
  summary: string;
  metrics?: string[][];
  warnings?: string[];
  visual?: ReviewVisualKind;
  outcome?: 'success';
  asset?: string;
  metricTones?: Record<string,'positive'|'negative'|'neutral'>;
}
export function ReviewDialog({
  title,
  summary,
  metrics = [],
  warnings = [],
  onCancel,
  onConfirm,
  confirmLabel = "CONFIRM",
  allowed = true,
  visual,
  outcome,
  asset,
  metricTones={},
  actions=[],
  children,
  className="",
}: {
  onCancel: () => void;
  onConfirm?: (commandId:string) => void;
  confirmLabel?: string;
  allowed?: boolean;
  className?:string;
  children?:import("react").ReactNode;
  actions?:Array<{label:string;onClick:()=>void;disabled?:boolean}>;
} & ReviewContent) {
  const ref = useRef<HTMLElement>(null),
    submitted = useRef(false),
    commandId=useRef(crypto.randomUUID());
  useWindowLifecycle(ref,{onClose:onCancel,layer:WINDOW_LAYERS.review,pause:true});
  return createPortal(
    <div className="review-backdrop">
      <section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={translateLive(title)}
        className={`review-dialog ${onConfirm?'review-confirmation':'review-result'} ${outcome?'receipt-success':''} ${className}`}
      >
        <header>
          <small><LocaleText value={"COMMAND REVIEW"}/></small>
          <button data-guide="review-dismiss" aria-label={translateLive("Close review")} onClick={onCancel}><LocaleText value={"×"}/></button>
        </header>
        {asset?<div className="review-visual receipt-art" aria-hidden="true"><AssetThumbnail asset={asset} size={72}/><span className="receipt-check">✓</span></div>:<ReviewVisual kind={visual??reviewVisualKind(title+' '+summary)} signed={!onConfirm&&/signed|agreed/i.test(title)}/>}
        <h2><LocaleText value={title}/></h2>
        <p><LocaleText value={summary}/></p>
        <div className="review-metrics">
          {metrics.map(([label, value], index) => (
            <div key={label+index} data-metric={label} data-tone={metricTones[label]??'neutral'}>
              <small><LocaleText value={label}/></small>
              <strong><LocaleText value={value}/></strong>
            </div>
          ))}
        </div>
        {children}
        <div className="review-notes">
          {warnings.map((w) => (
            <p key={w}><LocaleText value={w}/></p>
          ))}
        </div>
        <footer>
          <button data-guide="review-dismiss" onClick={onCancel}>
            <LocaleText value={onConfirm ? "BACK / CANCEL" : "CLOSE"}/>
          </button>
          {actions.map(action=><button key={action.label} disabled={action.disabled} onClick={action.onClick}><LocaleText value={action.label}/></button>)}
          {onConfirm && (
            <button
              data-guide="review-confirm" className="primary"
              disabled={!allowed}
              onClick={() => {
                if (submitted.current) return;
                submitted.current = true;
                onConfirm(commandId.current);
              }}
            >
              <LocaleText value={confirmLabel}/>
            </button>
          )}
        </footer>
      </section>
    </div>,
    document.body,
  );
}
export function ActionReceipt() {
  const receipt=useGameStore(s=>s.actionReceipt),showReceipt=useGameStore(s=>s.showReceipt);
  if (!receipt) return null;
  return <ReviewDialog {...receipt} onCancel={() => showReceipt(null)} />;
}
