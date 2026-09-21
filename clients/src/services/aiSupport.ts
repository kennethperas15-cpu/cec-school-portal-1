// AI Support engine: instant local answers + optional OpenAI-compatible backend.
// Configure with VITE_AI_API_URL (chat-completions endpoint) and VITE_AI_API_KEY.
import api from './api';

const AI_URL = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_AI_API_URL ?? '';
const AI_KEY = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_AI_API_KEY ?? '';
const AI_MODEL = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_AI_MODEL ?? 'gpt-4o-mini';

type Faq = { keys: string[]; answer: string };

const FAQS: Faq[] = [
  { keys: ['enroll', 'regist', 'apply', 'admission'], answer: 'To enroll: Student portal → Online Enrollment (or Registration / Enrollment) → pick program, year and semester → Submit. It goes to Admin → Enrollment Approval. Track it in Status Tracker. New accounts get a 6-digit ID (students start with 2).' },
  { keys: ['pay', 'tuition', 'gcash', 'bank', 'gotyme', 'unionbank', 'metrobank', 'bpi', 'balance', 'receipt', 'or number'], answer: 'Pay at Student portal → Payment Portal. Methods: GCash, Maya, GoTyme Bank, UnionBank, Metrobank, BPI, or Cashier (Window 3). Enter the amount + reference no. — you get a popup receipt and it appears in Billing History.' },
  { keys: ['grade', 'report card', 'midterm', 'final', 'average'], answer: 'Students: Academic Records → Grades / Report Card. Teachers encode at Grading → Grade Encoding; averages auto-compute and Lock finalizes the sheet.' },
  { keys: ['schedule', 'timetable', 'class time', 'room'], answer: 'Students: Academic Records → Class Schedule. Teachers: Scheduling → Class Schedule; consultation hours live under Consultation Slots.' },
  { keys: ['id', 'school id', 'number', '2xxxxx', 'username'], answer: 'School IDs are 6 digits: students start with 2, teachers with 3, admins with 4. Your ID shows under your name in the sidebar. Use it (or your school email) to sign in.' },
  { keys: ['password', 'forgot', 'reset', 'recover'], answer: 'Use Password Recovery on the login page or your portal (Authentication → Password Recovery) to get a reset link by email.' },
  { keys: ['google', 'gmail', 'sign in with'], answer: 'Google sign-in needs the admin to set VITE_GOOGLE_CLIENT_ID (client) and GOOGLE_CLIENT_ID (server). After that the official Google button appears on the login page.' },
  { keys: ['photo', 'picture', 'avatar', 'face'], answer: 'Upload your photo at Profile Management → Upload photo (JPG/PNG under 2MB). Teachers see student faces in Class List; everyone sees faces in rosters and headers.' },
  { keys: ['attendance'], answer: 'Teachers record it at Attendance → Daily Attendance. Students view theirs at Academic Records → Attendance Records.' },
  { keys: ['library', 'book', 'borrow', 'reserve', 'fine'], answer: 'Library section: Book Catalog to find books, Reservations for pickup, Borrowing Tracker to return, Fines to settle penalties.' },
  { keys: ['document', 'cor', 'torr', 'transcript', 'certificate', 'good moral'], answer: 'Request at Support Services → Document Request (students) or upload requirements at Enrollment → Document Submission.' },
  { keys: ['human', 'registrar', 'contact', 'helpdesk', 'support', 'phone'], answer: 'CEC Helpdesk: support@cec.edu.ph • (032) 255-1234. Registrar: Windows 1–3, 8AM–5PM Mon–Fri.' },
];

export const localAnswer = (question: string): string | null => {
  const q = question.toLowerCase();
  for (const faq of FAQS) {
    if (faq.keys.some((k) => q.includes(k))) return faq.answer;
  }
  return null;
};

export const askAi = async (question: string, role: string): Promise<{ text: string; source: 'ai' | 'local' }> => {
  const fallback =
    localAnswer(question) ??
    `I can help with enrollment, payments (${['GCash', 'Maya', 'GoTyme', 'UnionBank', 'Metrobank'].join(', ')}), grades, schedules, school IDs, and accounts. Try asking about one of those — or contact support@cec.edu.ph for anything else.`;
  if (!AI_URL) return { text: fallback, source: 'local' };
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (AI_KEY) headers.Authorization = `Bearer ${AI_KEY}`;
    // Reuse the app axios instance when the URL is same-origin; else plain fetch
    const body = { model: AI_MODEL, messages: [{ role: 'system', content: `You are the CEC School Portal support assistant for a ${role}. Answer briefly and concretely using portal module names.` }, { role: 'user', content: question }], max_tokens: 300 };
    const res = AI_URL.startsWith('http') ? await fetch(AI_URL, { method: 'POST', headers, body: JSON.stringify(body) }).then((r) => r.json())
      : (await api.post(AI_URL, body)).data;
    const text = res?.choices?.[0]?.message?.content?.trim();
    return text ? { text, source: 'ai' } : { text: fallback, source: 'local' };
  } catch {
    return { text: fallback, source: 'local' };
  }
};
