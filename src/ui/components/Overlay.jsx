import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import GlassPanel from './GlassPanel.jsx';
import Button from './Button.jsx';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Esc closes, Tab stays inside the dialog, focus returns to the opener on close.
 * The dialog is rendered in document.body (portal): a fixed element inside a card with a
 * transform or backdrop-filter would be positioned and painted relative to that card.
 */
function useDialog(ref, onClose) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const opener = document.activeElement;
    const box = ref.current;
    const first = box?.querySelector(FOCUSABLE);
    (first ?? box)?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close.current?.();
        return;
      }
      if (e.key !== 'Tab' || !box) return;
      const items = [...box.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const [a, z] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [ref]);
}

/** Side sheet on the right. Esc or the scrim closes it. */
export function Sheet({ title, eyebrow, aside, onClose, children }) {
  const ref = useRef(null);
  useDialog(ref, onClose);
  const id = useId();
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <GlassPanel as="aside" strong solid className="sheet" role="dialog" aria-labelledby={id} ref={ref} tabIndex={-1}>
        <header className="sheet__head">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2 id={id} className="title-2">
              {title}
            </h2>
            {aside}
          </div>
          <Button icon="close" aria-label="Close" onClick={onClose} />
        </header>
        <div className="sheet__body">{children}</div>
      </GlassPanel>
    </>,
    document.body,
  );
}

/** Centred dialog: fixed header with a close button, scrolling body, optional fixed footer. Esc or the scrim closes it. */
export function Modal({ title, onClose, footer, children }) {
  const ref = useRef(null);
  useDialog(ref, onClose);
  const id = useId();
  return createPortal(
    <>
      <div className="scrim scrim--modal" onClick={onClose} />
      <GlassPanel strong solid className="modal" role="dialog" aria-modal="true" aria-labelledby={id} ref={ref} tabIndex={-1}>
        <header className="modal__head">
          <h2 id={id} className="title-2 modal__title">
            {title}
          </h2>
          <Button icon="close" aria-label="Close" onClick={onClose} />
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__foot">{footer}</footer>}
      </GlassPanel>
    </>,
    document.body,
  );
}
