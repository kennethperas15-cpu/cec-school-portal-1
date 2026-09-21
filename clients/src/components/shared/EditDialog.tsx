import { FormEvent, useEffect, useState } from 'react';

type EditRequest = { title: string; value: string; onSave: (value: string) => void };
const eventName = 'cec:edit-request';
export const openEditDialog = (title: string, value: string, onSave: (value: string) => void) => {
  window.dispatchEvent(new CustomEvent<EditRequest>(eventName, { detail: { title, value, onSave } }));
};

export const EditDialog = () => {
  const [request, setRequest] = useState<EditRequest | null>(null);
  const [value, setValue] = useState('');
  useEffect(() => {
    const handler = (event: Event) => {
      const next = (event as CustomEvent<EditRequest>).detail;
      setRequest(next);
      setValue(next.value);
    };
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, []);
  if (!request) return null;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = value.trim();
    if (!next) return;
    request.onSave(next);
    setRequest(null);
  };
  return <div className="edit-dialog-backdrop" role="presentation"><form className="edit-dialog" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="edit-dialog-title"><h3 id="edit-dialog-title">{request.title}</h3><label>Value<input autoFocus value={value} onChange={(event) => setValue(event.target.value)} required /></label><div className="edit-dialog-actions"><button type="button" onClick={() => setRequest(null)}>Cancel</button><button type="submit">Save changes</button></div></form></div>;
};
