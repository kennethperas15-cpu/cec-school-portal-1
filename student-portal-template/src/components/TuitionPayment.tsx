import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  Clock,
  Loader2,
  Printer,
  QrCode as QrCodeIcon,
  Receipt as ReceiptIcon,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { cecRaiseReceipt, cecReceipts, type PortalItem } from '../lib/api';
import { useStore } from '../store';

/**
 * Tuition payment — cash only.
 *
 * The student fills the form, the app raises a PLEASE PAY receipt against the
 * live portal_items table (`module: "receipt"`), and the EDP office verifies it
 * from the admin dashboard once the cash is in hand. The printed QR and the
 * reference number are the same pair the counter reconciles against, so nothing
 * is issued unless the EDP queue actually accepted it.
 */

const PURPOSES = [
  'Tuition Fee — Full Payment',
  'Tuition Fee — Partial Payment',
  'Miscellaneous / Other Fees',
  'Balance Settlement',
] as const;

const MAX_AMOUNT = 500_000;

type Issued = { ref: string; amount: string; purpose: string; term: string; at: string; qr: string };

const peso = (value: string | number): string =>
  `₱${Number(String(value).replace(/,/g, '')).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const refOf = (item: PortalItem): string => item.detail?.match(/Ref\s+(OR-\d{4}-\d{5})/)?.[1] ?? '—';

const amountOf = (item: PortalItem): string => item.title.match(/₱\s?([\d,]+(?:\.\d+)?)/)?.[1] ?? '';

const whenOf = (item: PortalItem): string => {
  if (!item.created_at) return '—';
  const at = new Date(item.created_at);
  return Number.isNaN(at.getTime()) ? '—' : at.toLocaleString();
};

const isVerified = (item: PortalItem): boolean => (item.status ?? '').toLowerCase() === 'verified';

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-slate-200 py-2 last:border-0">
    <span className="text-xs font-medium text-slate-500">{label}</span>
    <span className="text-right text-sm font-semibold text-slate-800">{value}</span>
  </div>
);

export const TuitionPayment = () => {
  const { session, user, profile, periodLabel, notify } = useStore();

  const token = session?.accessToken ?? '';
  const studentName = profile.name || '—';
  const studentRef = user?.schoolId || user?.id || '';
  const owner = `${studentName} (${studentRef || '—'})`;
  const term = periodLabel || '—';

  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState<string>(PURPOSES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [issued, setIssued] = useState<Issued | null>(null);
  const [receipts, setReceipts] = useState<PortalItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  /* Receipts this student has raised. The endpoint is school-wide, so filter to
     the owner tag the student portal writes. */
  useEffect(() => {
    let live = true;
    const load = async () => {
      const result = await cecReceipts();
      if (!live) return;
      if (result.ok) {
        const tag = studentRef ? `(${studentRef})` : '';
        setReceipts(tag ? result.data.filter((item) => (item.owner ?? '').includes(tag)) : []);
      }
      setLoadingHistory(false);
    };
    void load();
    return () => {
      live = false;
    };
  }, [studentRef]);

  const refreshHistory = async () => {
    setLoadingHistory(true);
    const result = await cecReceipts();
    if (result.ok) {
      const tag = studentRef ? `(${studentRef})` : '';
      setReceipts(tag ? result.data.filter((item) => (item.owner ?? '').includes(tag)) : []);
    }
    setLoadingHistory(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const value = Number(amount.replace(/[,\s]/g, ''));
    if (!amount.trim() || Number.isNaN(value) || value <= 0) {
      setError('Enter the amount you are paying, e.g. 12500.');
      return;
    }
    if (value > MAX_AMOUNT) {
      setError(`That is above the ${peso(MAX_AMOUNT)} single-receipt limit. Raise two receipts instead.`);
      return;
    }
    if (!token) {
      setError('Your session has ended. Sign in again on the CEC website.');
      return;
    }

    const ref = `OR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const at = new Date().toLocaleString();

    // QR encoding the reference number — the same code the CEC portal issues for
    // cash receipts, so the EDP counter reads one format.
    let qr = '';
    try {
      const { default: QRCode } = await import('qrcode');
      qr = await QRCode.toDataURL(ref, { width: 180, margin: 1 });
    } catch {
      /* the printed reference number still stands on its own */
    }

    setBusy(true);
    const result = await cecRaiseReceipt(token, {
      title: `OR — ${peso(value)} • Cash (EDP)`,
      detail: `Ref ${ref} • ${purpose} • ${term} • ${studentName} • ${studentRef || '—'} • ${at}`,
      status: 'PLEASE PAY',
      owner,
    });
    setBusy(false);

    if (!result.ok) {
      // No row, no receipt: the EDP cannot verify what it never received.
      setError(
        result.status === 401
          ? 'Your session has ended. Sign in again on the CEC website.'
          : `${result.message} Nothing was issued — try again once the portal is reachable.`,
      );
      return;
    }

    setIssued({ ref, amount: peso(value), purpose, term, at, qr });
    setAmount('');
    notify('Receipt issued — pay cash at the EDP office');
    void refreshHistory();
  };

  const statusPill = (item: PortalItem) =>
    isVerified(item) ? (
      <span className="chip bg-emerald-50 text-emerald-700">
        <BadgeCheck className="h-3.5 w-3.5" /> Verified
      </span>
    ) : (
      <span className="chip bg-amber-50 text-amber-700">
        <Clock className="h-3.5 w-3.5" /> Awaiting EDP
      </span>
    );

  return (
    <section id="payments" className="card scroll-mt-24 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="icon-chip h-9 w-9 bg-[#EFF6FF] text-[#2563EB]">
            <Banknote className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h2 className="card-title">Tuition Payment</h2>
            <p className="card-sub">Raise a receipt, print it, then settle in cash at the EDP office.</p>
          </div>
        </div>
        <span className="pill border-emerald-200 bg-emerald-50 text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" /> Cash only
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* ------------------------------- Form ------------------------------- */}
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Student</span>
              <input className="field bg-slate-50" value={studentName} readOnly aria-readonly="true" />
            </label>
            <label className="block">
              <span className="field-label">School ID</span>
              <input className="field bg-slate-50" value={studentRef || '—'} readOnly aria-readonly="true" />
            </label>
          </div>

          <label className="block">
            <span className="field-label">Amount to pay (₱)</span>
            <input
              className="field"
              inputMode="decimal"
              placeholder="e.g. 12,500"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-label="Amount to pay in pesos"
            />
          </label>

          <label className="block">
            <span className="field-label">Payment for</span>
            <select className="field" value={purpose} onChange={(event) => setPurpose(event.target.value)}>
              {PURPOSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-line bg-slate-50 px-3.5 py-3 text-xs text-slate-600">
            <div className="flex items-center justify-between gap-3">
              <span>Term</span>
              <strong className="text-slate-800">{term}</strong>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <span>Mode of payment</span>
              <strong className="text-slate-800">Cash — EDP office</strong>
            </div>
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReceiptIcon className="h-4 w-4" />}
              {busy ? 'Issuing receipt…' : 'Generate receipt'}
            </button>
            {issued && (
              <button type="button" className="btn-soft" onClick={() => setIssued(null)}>
                New payment
              </button>
            )}
          </div>
        </form>

        {/* ------------------------------ Receipt ------------------------------ */}
        {issued ? (
          <div>
            <div id="cec-cash-receipt" className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
                <div>
                  <p className="font-serif text-sm font-semibold text-[#1B365D]">Cebu Eastern College</p>
                  <p className="text-[11px] tracking-wide text-slate-500 uppercase">Cash receipt request</p>
                </div>
                <span className="chip bg-amber-50 text-amber-700">PLEASE PAY</span>
              </div>

              <div className="mt-3">
                <Row label="Reference No." value={issued.ref} />
                <Row label="Student" value={studentName} />
                <Row label="School ID" value={studentRef || '—'} />
                <Row label="Term" value={issued.term} />
                <Row label="Payment for" value={issued.purpose} />
                <Row label="Amount" value={issued.amount} />
                <Row label="Issued" value={issued.at} />
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                {issued.qr ? (
                  <img src={issued.qr} alt={`QR code for receipt ${issued.ref}`} className="h-[92px] w-[92px]" />
                ) : (
                  <span className="icon-chip h-[92px] w-[92px] bg-white text-slate-300">
                    <QrCodeIcon className="h-8 w-8" />
                  </span>
                )}
                <p className="text-xs text-slate-600">
                  Print this and bring it with your cash to the <strong>EDP office</strong>. Staff scan the code, verify the
                  reference, and release an official receipt.
                </p>
              </div>

              <p className="mt-3 text-[11px] text-slate-500">
                Your balance clears only after the EDP office verifies this receipt — not when it is generated. No online
                gateways: cash only.
              </p>

              <div className="mt-4 flex gap-2">
                <button type="button" className="btn-soft" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" /> Print
                </button>
              </div>
            </div>

            <style>{`
              @media print {
                body * { visibility: hidden; }
                #cec-cash-receipt, #cec-cash-receipt * { visibility: visible; }
                #cec-cash-receipt {
                  position: absolute; left: 0; top: 0; width: 100%; max-width: 640px;
                  border: none; box-shadow: none;
                }
              }
            `}</style>
          </div>
        ) : (
          <div className="dashed-empty">
            <span className="icon-chip h-12 w-12 bg-white text-slate-300">
              <ReceiptIcon className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-slate-600">No receipt generated yet</p>
            <p className="max-w-xs text-xs text-slate-500">
              Fill in the amount and we will issue a PLEASE PAY receipt with a reference number and QR code for the EDP
              office.
            </p>
          </div>
        )}
      </div>

      {/* ----------------------------- My receipts ----------------------------- */}
      <div className="mt-6 border-t border-line pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            My receipts
            {receipts.length > 0 && <span className="pill">{receipts.length}</span>}
          </h3>
          <button type="button" className="btn-ghost text-xs" onClick={() => void refreshHistory()} disabled={loadingHistory}>
            <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {loadingHistory && receipts.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking the EDP queue…
          </p>
        ) : receipts.length === 0 ? (
          <p className="mt-4 text-xs text-slate-500">
            Nothing raised yet. Receipts you generate here appear to the EDP office for verification.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {receipts.slice(0, 5).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {amountOf(item) ? peso(amountOf(item)) : 'Cash payment'}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {refOf(item)} • {whenOf(item)}
                  </p>
                </div>
                {statusPill(item)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
