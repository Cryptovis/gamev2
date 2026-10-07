import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useGameStore } from "../../store/gameStore";
export interface ReviewContent {
  title: string;
  summary: string;
  metrics?: string[][];
  warnings?: string[];
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
}: {
  onCancel: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  allowed?: boolean;
} & ReviewContent) {
  const ref = useRef<HTMLElement>(null),
    submitted = useRef(false),
    cancel = useRef(onCancel);
  cancel.current = onCancel;
  useEffect(() => {
    const s = useGameStore.getState(),
      speed = s.speed,
      previous = document.activeElement as HTMLElement | null;
    s.setSpeed(0);
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel.current();
      }
      if (e.key === "Tab") {
        const controls = Array.from(
            ref.current?.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ) ?? [],
          ),
          first = controls[0],
          last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      const now = useGameStore.getState();
      if (
        speed &&
        now.speed === 0 &&
        !now.activeAdvisor &&
        !now.activeEvent &&
        !now.world.tutorial.active
      )
        now.setSpeed(speed);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return createPortal(
    <div className="review-backdrop">
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="review-dialog"
      >
        <header>
          <small>COMMAND REVIEW</small>
          <button aria-label="Close review" onClick={onCancel}>
            ×
          </button>
        </header>
        <h2>{title}</h2>
        <p>{summary}</p>
        <div className="review-metrics">
          {metrics.map(([label, value]) => (
            <div key={label}>
              <small>{label}</small>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="review-notes">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
        <footer>
          <button onClick={onCancel}>
            {onConfirm ? "BACK / CANCEL" : "CLOSE"}
          </button>
          {onConfirm && (
            <button
              className="primary"
              disabled={!allowed}
              onClick={() => {
                if (submitted.current) return;
                submitted.current = true;
                onConfirm();
              }}
            >
              {confirmLabel}
            </button>
          )}
        </footer>
      </section>
    </div>,
    document.body,
  );
}
export function ActionReceipt() {
  const state = useGameStore(),
    receipt = state.actionReceipt;
  if (!receipt) return null;
  return <ReviewDialog {...receipt} onCancel={() => state.showReceipt(null)} />;
}
