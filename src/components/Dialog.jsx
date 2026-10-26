import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const DialogCtx = createContext(null);

/**
 * Themed replacements for window.confirm / window.alert.
 *   const ok = await confirm({ title, message, confirmText, danger })
 *   await alert({ title, message })
 */
export const useConfirm = () => useContext(DialogCtx).confirm;
export const useAlert = () => useContext(DialogCtx).alert;

export function DialogProvider({ children }) {
  const [req, setReq] = useState(null); // { kind, title, message, confirmText, cancelText, danger, resolve }
  const ref = useRef(), okRef = useRef(), cancelRef = useRef();

  const ask = useCallback((kind, opts) => new Promise((resolve) => {
    setReq({ kind, ...(typeof opts === 'string' ? { message: opts } : opts), resolve });
  }), []);
  const confirm = useCallback((o) => ask('confirm', o), [ask]);
  const alert = useCallback((o) => ask('alert', o), [ask]);

  useEffect(() => {
    const d = ref.current;
    // a destructive confirm focuses the safe choice
    if (req && !d.open) { d.showModal(); (req.danger ? cancelRef : okRef).current?.focus(); }
  }, [req]);

  function done(result) {
    if (!req) return;
    req.resolve(result);
    ref.current.close();
    setReq(null);
  }

  return (
    <DialogCtx.Provider value={{ confirm, alert }}>
      {children}
      <dialog className="dlg mdl" ref={ref} aria-labelledby="mdlTitle" aria-describedby="mdlMsg"
        onCancel={(e) => { e.preventDefault(); done(false); }}
        onClick={(e) => { if (e.target === ref.current) done(false); }}>
        {req && (
          <div className={`mdl-in ${req.danger ? 'danger' : ''}`}>
            <span className="mdl-icon" aria-hidden="true">
              {req.danger
                ? <svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                : <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.4 5c2.1 0 3.7 1.2 4.6 2.7h2C13.9 6.2 15.5 5 17.6 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z" fill="currentColor" /></svg>}
            </span>
            <h2 id="mdlTitle">{req.title || (req.kind === 'confirm' ? 'Are you sure?' : 'Heads up')}</h2>
            {req.message && <p id="mdlMsg">{req.message}</p>}
            <div className="dlg-actions">
              {req.kind === 'confirm' && (
                <button ref={cancelRef} className="btn" type="button" onClick={() => done(false)}>{req.cancelText || 'Cancel'}</button>
              )}
              <button ref={okRef} className={`btn ${req.danger ? 'danger' : 'primary'}`} type="button" onClick={() => done(true)}>
                {req.confirmText || (req.kind === 'confirm' ? 'Confirm' : 'OK')}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </DialogCtx.Provider>
  );
}
