import type { CSSProperties } from 'react';

/**
 * The admin console's shared visual tokens. They live here so a page split out
 * of AdminDashboard.tsx (the academic records panel) renders identically instead
 * of drifting from the shell around it.
 */
export const card: CSSProperties = { background: '#fff', border: '1px solid #e8eef7', borderRadius: 20, boxShadow: '0 12px 34px rgba(15,31,56,.05)', padding: 28, maxWidth: 1120, margin: '0 auto' };
export const box: CSSProperties = { border: '1px solid #eef2f8', borderRadius: 14, padding: 18, marginTop: 14, background: '#fbfcfe' };
export const btn: CSSProperties = { background: 'linear-gradient(135deg, #0B3D91, #123f7d)', color: '#fff', border: 0, borderRadius: 12, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 10px 22px rgba(11,61,145,.22)' };
export const ghost: CSSProperties = { border: '1px solid #e2e7ef', background: '#fff', borderRadius: 10, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#33415c' };
export const inp: CSSProperties = { border: '1.5px solid #e4ebf5', borderRadius: 12, padding: '10px 13px', fontSize: 13, width: '100%', background: '#f7f9fc', color: '#0f1f38' };
