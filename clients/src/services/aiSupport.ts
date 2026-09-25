// AI Support engine: instant local answers + optional OpenAI-compatible backend.
// Configure with VITE_AI_API_URL (chat-completions endpoint) and VITE_AI_API_KEY.
import api from './api';

const AI_URL = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_AI_API_URL ?? '';
const AI_KEY = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_AI_API_KEY ?? '';
const AI_MODEL = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_AI_MODEL ?? 'gpt-4o-mini';

type Faq = { keys: string[]; answer: string };

const FAQS: Faq[] = [
  { keys: ['enroll', 'regist', 'apply', 'admission'], answer: 'Enrollment guide:\n1. Open Enrollment → Online Enrollment (or Registration / Enrollment).\n2. Select your program, year level, and semester.\n3. Review the details and submit the application.\n4. Upload the requested requirements under Enrollment → Document Submission.\n5. Monitor Enrollment → Status Tracker for document verification, approval, and final enrollment.\nThe application is reviewed by Admin → Enrollment Approval. New student accounts receive a 6-digit school ID beginning with 2.' },
  { keys: ['pay', 'tuition', 'gcash', 'bank', 'gotyme', 'unionbank', 'metrobank', 'bpi', 'balance', 'receipt', 'or number'], answer: 'Payment guide:\n1. Open Financial → Payment Portal.\n2. Check your balance and enter the amount to pay.\n3. Choose GCash, Maya, GoTyme Bank, UnionBank, Metrobank, BPI, or Cashier (Window 3).\n4. Enter the transaction or reference number, then submit.\n5. Keep the popup receipt for your records and verify it later under Financial → Billing History. If the payment is not reflected, contact the cashier with your reference number, amount, date, and proof of payment.' },
  { keys: ['grade', 'report card', 'midterm', 'final', 'average'], answer: 'To view grades, open Academic Records → Grades / Report Card. The page shows your subject grades, computed averages, and final remarks. Teachers enter grades through Grading → Grade Encoding; the portal computes the average automatically. A teacher locks a completed sheet during finalization, so contact your teacher or registrar if a locked grade needs correction.' },
  { keys: ['schedule', 'timetable', 'class time', 'room'], answer: 'Students can open Academic Records → Class Schedule to see subjects, meeting times, and rooms. Teachers can open Scheduling → Class Schedule to manage class schedules. Teacher consultation hours are managed under Scheduling → Consultation Slots. Refresh the page after a schedule change if the new entry does not appear immediately.' },
  { keys: ['id', 'school id', 'number', '2xxxxx', 'username'], answer: 'School ID guide:\n- Students: 6 digits beginning with 2, for example 201589.\n- Teachers: IDs beginning with 3.\n- Admins: IDs beginning with 4.\nYour ID appears below your name in the portal sidebar. Use the school ID or registered school email when signing in. If you cannot remember it, contact the registrar or helpdesk so your identity can be verified.' },
  { keys: ['password', 'forgot', 'reset', 'recover'], answer: 'To reset your password, choose Password Recovery on the login page, or open Authentication → Password Recovery inside the portal. Enter the email address or account identifier associated with your account and submit the request. Check your inbox and spam folder for the reset link, then create a new password. Do not share the reset link with anyone.' },
  { keys: ['google', 'gmail', 'sign in with'], answer: 'Google sign-in is available only after the administrator configures the Google client and server settings. The client requires VITE_GOOGLE_CLIENT_ID and the server requires GOOGLE_CLIENT_ID. After configuration, the official Google sign-in button appears on the login page. If it is missing, use your normal school ID or email login and contact the administrator.' },
  { keys: ['photo', 'picture', 'avatar', 'face'], answer: 'To update your profile photo, open Authentication → Profile Management and choose Upload photo. Use a JPG or PNG image smaller than 2MB, then wait for the upload confirmation. Your photo can appear in your profile, headers, rosters, and class lists depending on your role. If the upload fails, check the file type and size before trying again.' },
  { keys: ['attendance'], answer: 'Students can review attendance under Academic Records → Attendance Records. Teachers record attendance through Attendance → Daily Attendance, where each student can be marked Present, Late, or Absent. If an attendance entry is incorrect, contact the teacher who recorded the class so the source record can be corrected.' },
  { keys: ['library', 'book', 'borrow', 'reserve', 'fine'], answer: 'Use the Library modules as follows:\n- Book Catalog: search available books.\n- Reservations: request a book for pickup.\n- Borrowing Tracker: review borrowed items and return status.\n- Fines / Penalties: review and settle outstanding charges.\nCheck the item status and any due date before visiting the library.' },
  { keys: ['document', 'cor', 'torr', 'transcript', 'certificate', 'good moral'], answer: 'For a school document, students open Support Services → Document Request, choose the document type, and submit the request details. For enrollment requirements, use Enrollment → Document Submission and upload the requested files in JPG, PNG, or PDF format when accepted. Track the request or verification status in the relevant tracker and keep the confirmation for follow-up.' },
  { keys: ['human', 'registrar', 'contact', 'helpdesk', 'support', 'phone'], answer: 'CEC Helpdesk contact:\nEmail: support@cec.edu.ph\nPhone: (032) 255-1234\nRegistrar office: Windows 1–3, 8:00 AM–5:00 PM, Monday–Friday.\nWhen asking for help, include your full name, school ID, portal module, what you were trying to do, and any reference number. Never send your password.' },
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
    `I can provide step-by-step help with enrollment, document submission, payments (${['GCash', 'Maya', 'GoTyme', 'UnionBank', 'Metrobank'].join(', ')}), grades, schedules, school IDs, attendance, library services, password recovery, and profile photos. Please include your role (student, teacher, or admin) and the module you are using. For account-specific issues, contact support@cec.edu.ph or (032) 255-1234.`;
  if (!AI_URL) return { text: fallback, source: 'local' };
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (AI_KEY) headers.Authorization = `Bearer ${AI_KEY}`;
    // Reuse the app axios instance when the URL is same-origin; else plain fetch
    const body = { model: AI_MODEL, messages: [{ role: 'system', content: `You are the CEC School Portal support assistant for a ${role}. Give detailed, practical answers using the exact portal module names. Use a short heading and numbered steps when explaining a process. Include requirements, what the user should expect after submitting, and what to do if something fails. Do not invent policies, deadlines, or personal account data. Keep the response under 450 words.` }, { role: 'user', content: question }], max_tokens: 600 };
    const res = AI_URL.startsWith('http') ? await fetch(AI_URL, { method: 'POST', headers, body: JSON.stringify(body) }).then((r) => r.json())
      : (await api.post(AI_URL, body)).data;
    const text = res?.choices?.[0]?.message?.content?.trim();
    return text ? { text, source: 'ai' } : { text: fallback, source: 'local' };
  } catch {
    return { text: fallback, source: 'local' };
  }
};
