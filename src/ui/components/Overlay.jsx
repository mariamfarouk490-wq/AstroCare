import { useEffect, useId } from 'react';
import GlassPanel from './GlassPanel.jsx';
import Button from './Button.jsx';

function useEscape(onClose) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}

/** Side sheet on the right. Esc or the scrim closes it. */
export function Sheet({ title, eyebrow, aside, onClose, children }) {
  useEscape(onClose);
  const id = useId();
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <GlassPanel as="aside" strong solid className="sheet" role="dialog" aria-labelledby={id}>
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
    </>
  );
}

/** Centred dialog. Esc or the scrim closes it. */
export function Modal({ title, onClose, children }) {
  useEscape(onClose);
  const id = useId();
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <GlassPanel strong solid className="modal" role="dialog" aria-modal="true" aria-labelledby={id}>
        <h2 id={id} className="title-2 modal__title">
          {title}
        </h2>
        {children}
      </GlassPanel>
    </>
  );
}
