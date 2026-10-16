import { useState, type FormEvent } from 'react';
import { AlertCircle, ArrowLeft, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { CEC_WEBSITE_URL, cecForgotPassword } from '../lib/api';
import { useStore } from '../store';
import { Modal } from './ui/Modal';

type ForgotProps = { open: boolean; onClose: () => void };

/** Password recovery against the live API (school ID + the Gmail on record). */
const ForgotPassword = ({ open, onClose }: ForgotProps) => {
  const { notify } = useStore();
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setNote('Enter your school ID or CEC email.');
      return;
    }
    setBusy(true);
    const result = await cecForgotPassword(identifier.trim(), email.trim());
    setBusy(false);
    if (!result.ok) {
      setNote(result.message);
      return;
    }
    setNote('');
    notify(
      result.data.emailSent
        ? 'If the details match our records, recovery instructions were sent.'
        : 'Request recorded — contact the registrar if no email arrives.',
      'info',
    );
    setIdentifier('');
    setEmail('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Password recovery"
      subtitle="We email reset instructions when the details match our records"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-soft" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="forgot-form" className="btn-primary" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Send instructions
          </button>
        </div>
      }
    >
      <form id="forgot-form" className="space-y-4" onSubmit={submit}>
        <label className="block">
          <span className="field-label">School ID or CEC email</span>
          <input
            className="field"
            placeholder="2212779 or juan.delacruz.307588@cec.edu.ph"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="field-label">Gmail on record</span>
          <input
            type="email"
            className="field"
            placeholder="juan.delacruz@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {note && (
          <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
            {note}
          </p>
        )}
      </form>
    </Modal>
  );
};

export const Login = () => {
  const { signIn, signingIn, authError, clearAuthError } = useStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState('');
  const [forgot, setForgot] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Enter your school ID (or CEC email) and your password.');
      return;
    }
    setError('');
    await signIn(identifier, password);
  };

  const shown = error || authError;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0E2340] px-4 py-10">
      <div className="pointer-events-none absolute -left-32 -top-40 h-[420px] w-[420px] rounded-full bg-[#1E3A8A]/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-24 h-[460px] w-[460px] rounded-full bg-[#2563EB]/25 blur-3xl" />

      <div className="relative w-full max-w-[430px] animate-fade-in">
        <div className="rounded-3xl border border-white/10 bg-white p-7 shadow-navy sm:p-8">
          <div className="flex items-center gap-3">
            <img
              src={`${import.meta.env.BASE_URL}cec-logo.png`}
              alt="Cebu Eastern College seal"
              width={52}
              height={52}
              className="h-13 w-13 shrink-0 object-contain"
              style={{ height: 52, width: 52 }}
            />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[15px] font-bold text-slate-900">Cebu Eastern College</p>
              <p className="truncate text-[11px] font-medium text-slate-500">Student Portal</p>
            </div>
          </div>

          <h1 className="mt-6 font-serif text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Use the school account issued by the CEC registrar — your 7-digit student ID or your CEC email.
          </p>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block">
              <span className="field-label">School ID or CEC email</span>
              <span className="relative block">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="field pl-10"
                  placeholder="2212779 or juan.delacruz.307588@cec.edu.ph"
                  value={identifier}
                  autoComplete="username"
                  autoFocus
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (shown) {
                      setError('');
                      clearAuthError();
                    }
                  }}
                />
              </span>
            </label>

            <label className="block">
              <span className="field-label">Password</span>
              <span className="relative block">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={reveal ? 'text' : 'password'}
                  className="field pl-10 pr-11"
                  placeholder="••••••••"
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (shown) {
                      setError('');
                      clearAuthError();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setReveal((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label={reveal ? 'Hide password' : 'Show password'}
                >
                  {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>

            {shown && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs font-medium leading-relaxed text-rose-600"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {shown}
              </p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={signingIn}>
              {signingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {signingIn ? 'Verifying with the CEC portal…' : 'Sign in'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setForgot(true)}
            className="mt-4 w-full text-center text-xs font-semibold text-[#2563EB] transition hover:underline"
          >
            Forgot your password?
          </button>
        </div>

        <a
          href={CEC_WEBSITE_URL}
          className="mt-5 flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-200/80 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to the CEC website
        </a>
      </div>

      <ForgotPassword open={forgot} onClose={() => setForgot(false)} />
    </div>
  );
};
