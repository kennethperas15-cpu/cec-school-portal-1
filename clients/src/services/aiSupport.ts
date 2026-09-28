// AI Support engine: instant local answers + optional OpenAI-compatible backend.
// Trilingual: English, Tagalog, Bisaya (Cebuano). The local layer detects the
// user's language and answers in it; the remote backend is instructed to reply
// in the same language. Configure remote with VITE_AI_API_URL / VITE_AI_API_KEY.
import api from './api';

const AI_URL = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_AI_API_URL ?? '';
const AI_KEY = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_AI_API_KEY ?? '';
const AI_MODEL = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_AI_MODEL ?? 'gpt-4o-mini';

export type SupportLang = 'en' | 'tl' | 'ceb';
export type LangPref = SupportLang | 'auto';

export const LANG_LABEL: Record<SupportLang, string> = { en: 'English', tl: 'Tagalog', ceb: 'Bisaya' };
const LANG_NAME: Record<SupportLang, string> = { en: 'English', tl: 'Tagalog', ceb: 'Bisaya (Cebuano)' };

// Distinctive markers weigh 2; words shared between Tagalog and Bisaya weigh 1 each side.
const CEB_MARKERS = ['unsa', 'unsaon', 'giunsa', 'ngano', 'nganong', 'gyud', 'kaayo', 'dili', 'wala\\s+ko', 'naa', 'palihug', '\\basa\\b', 'kanusa', 'kanus-a', 'pila\\s+man', 'magpalista', 'palista', 'gikinahanglan', 'nakalimot', 'kalimot', 'hulam', 'tabang', 'bayranan', 'iskwela'];
const TL_MARKERS = ['paano', '\\bano\\b', 'magkano', 'kailan', 'bakit', 'hindi', '\\bpo\\b', 'opo', 'paki', 'mayroon', 'meron', '\\bsaan\\b', 'nasaan', 'magpatala', 'patala', 'kailangan', 'nakalimutan', 'tulong', 'paaralan', 'magbayad'];
const SHARED_MARKERS = ['salamat', 'kumusta', 'kamusta', 'maayong', 'magandang', '\\bako\\b', '\\bikaw\\b', '\\bwala\\b', 'bayad', 'grado', 'resibo', 'dokumento', 'librar', 'aklat', 'libro', 'multa', 'klase', 'password'];

const countHits = (q: string, markers: string[]): number =>
  markers.reduce((n, m) => {
    try {
      return n + (new RegExp(m, 'i').test(q) ? (m.includes('\\b') || m.includes('\\s') ? 2 : 1) : 0);
    } catch {
      return n + (q.includes(m) ? 1 : 0);
    }
  }, 0);

/** Detect whether a question is English, Tagalog, or Bisaya. Defaults to English. */
export const detectLanguage = (text: string): SupportLang => {
  const q = ` ${text.toLowerCase()} `;
  const ceb = CEB_MARKERS.reduce((n, m) => {
    try {
      return n + (new RegExp(m, 'i').test(q) ? 2 : 0);
    } catch {
      return n + (q.includes(m) ? 2 : 0);
    }
  }, 0);
  const tl = TL_MARKERS.reduce((n, m) => {
    try {
      return n + (new RegExp(m, 'i').test(q) ? 2 : 0);
    } catch {
      return n + (q.includes(m) ? 2 : 0);
    }
  }, 0);
  const shared = countHits(q, SHARED_MARKERS);
  // Shared words alone cannot decide; distinctive markers break the tie.
  if (ceb === 0 && tl === 0) return 'en';
  if (ceb !== tl) return ceb > tl ? 'ceb' : 'tl';
  return shared > 0 ? 'tl' : 'en'; // ambiguous mixed usage leans Tagalog only when shared PH words present
};

export const resolveLang = (question: string, pref: LangPref = 'auto'): SupportLang =>
  pref === 'auto' ? detectLanguage(question) : pref;

type Faq = { keys: string[]; answer: Record<SupportLang, string> };

const FAQS: Faq[] = [
  {
    keys: ['enroll', 'regist', 'apply', 'admission', 'patala', 'magpatala', 'palista', 'magpalista', 'mag-enroll', 'pasok'],
    answer: {
      en: 'Enrollment guide:\n1. Open Enrollment → Online Enrollment (or Registration / Enrollment).\n2. Select your program, year level, and semester.\n3. Review the details and submit the application.\n4. Upload the requested requirements under Enrollment → Document Submission.\n5. Monitor Enrollment → Status Tracker for document verification, approval, and final enrollment.\nThe application is reviewed by Admin → Enrollment Approval. New student accounts receive a 7-digit school ID beginning with 2.',
      tl: 'Gabay sa pagpapatala:\n1. Buksan ang Enrollment → Online Enrollment (o Registration / Enrollment).\n2. Piliin ang program, year level, at semester.\n3. Suriin ang mga detalye at isumite ang aplikasyon.\n4. I-upload ang mga requirements sa Enrollment → Document Submission.\n5. Subaybayan ang Enrollment → Status Tracker para sa beripikasyon ng dokumento, pag-apruba, at pinal na enrollment.\nNirerebyu ang aplikasyon sa Admin → Enrollment Approval. Ang bagong student account ay makakatanggap ng 7-digit school ID na nagsisimula sa 2.',
      ceb: 'Giya sa pagpalista:\n1. Ablihi ang Enrollment → Online Enrollment (o Registration / Enrollment).\n2. Pilia ang program, year level, ug semester.\n3. Repasuhon ang mga detalye ug isumite ang aplikasyon.\n4. I-upload ang mga gikinahanglan nga dokumento sa Enrollment → Document Submission.\n5. Bantayi ang Enrollment → Status Tracker para sa beripikasyon sa dokumento, pag-apruba, ug pinal nga enrollment.\nGinarebyu ang aplikasyon sa Admin → Enrollment Approval. Ang bag-ong student account makadawat ug 7-digit school ID nga nagsugod sa 2.',
    },
  },
  {
    keys: ['pay', 'tuition', 'gcash', 'bank', 'gotyme', 'unionbank', 'metrobank', 'bpi', 'balance', 'receipt', 'or number', 'bayad', 'magbayad', 'resibo', 'balanse', 'bayaran', 'bayranan'],
    answer: {
      en: 'Payment guide:\n1. Open Financial → Payment Portal.\n2. Check your balance and enter the amount to pay.\n3. Choose GCash, Maya, GoTyme Bank, UnionBank, Metrobank, BPI, or Cashier (Window 3).\n4. Enter the transaction or reference number, then submit.\n5. Keep the popup receipt for your records and verify it later under Financial → Billing History. If the payment is not reflected, contact the cashier with your reference number, amount, date, and proof of payment.',
      tl: 'Gabay sa pagbabayad:\n1. Buksan ang Financial → Payment Portal.\n2. Tingnan ang balanse at ilagay ang halagang babayaran.\n3. Pumili ng GCash, Maya, GoTyme Bank, UnionBank, Metrobank, BPI, o Cashier (Window 3).\n4. Ilagay ang transaction o reference number, pagkatapos ay isumite.\n5. Itago ang popup receipt at beripikahin ito sa Financial → Billing History. Kung hindi pa rin lumalabas ang bayad, makipag-ugnayan sa cashier dala ang reference number, halaga, petsa, at patunay ng bayad.',
      ceb: 'Giya sa pagbayad:\n1. Ablihi ang Financial → Payment Portal.\n2. Tan-awa ang balanse ug ibutang ang kantidad nga bayran.\n3. Pilia ang GCash, Maya, GoTyme Bank, UnionBank, Metrobank, BPI, o Cashier (Window 3).\n4. Ibutang ang transaction o reference number, dayon isumite.\n5. Tipigi ang popup receipt ug beripikaha kini sa Financial → Billing History. Kung dili pa makita ang bayad, kontaka ang cashier dala ang reference number, kantidad, petsa, ug pamatuod sa bayad.',
    },
  },
  {
    keys: ['grade', 'report card', 'midterm', 'final', 'average', 'grado', 'marka', 'grades'],
    answer: {
      en: 'To view grades, open Academic Records → Grades / Report Card. The page shows your subject grades, computed averages, and final remarks. Teachers enter grades through Grading → Grade Encoding; the portal computes the average automatically. A teacher locks a completed sheet during finalization, so contact your teacher or registrar if a locked grade needs correction.',
      tl: 'Para makita ang mga grado, buksan ang Academic Records → Grades / Report Card. Makikita rito ang mga grado sa bawat subject, ang computed average, at final remarks. Nag-eencode ang mga guro sa Grading → Grade Encoding; awtomatikong kinukuwenta ng portal ang average. Nila-lock ng guro ang natapos na grade sheet, kaya makipag-ugnayan sa guro o registrar kung may kailangang itama.',
      ceb: 'Para makita ang mga grado, ablihi ang Academic Records → Grades / Report Card. Makita dinhi ang mga grado sa matag subject, ang computed average, ug final remarks. Ga-encode ang mga magtutudlo sa Grading → Grade Encoding; awtomatikong gakuwenta sa portal ang average. Ginalock sa magtutudlo ang nahuman nga grade sheet, busa kontaka ang magtutudlo o registrar kung naay kailangang tul-iron.',
    },
  },
  {
    keys: ['schedule', 'timetable', 'class time', 'room', 'iskedyul', 'klase', 'oras', 'silid', 'eskedyul'],
    answer: {
      en: 'Students can open Academic Records → Class Schedule to see subjects, meeting times, and rooms. Teachers can open Scheduling → Class Schedule to manage class schedules. Teacher consultation hours are managed under Scheduling → Consultation Slots. Refresh the page after a schedule change if the new entry does not appear immediately.',
      tl: 'Maaaring buksan ng mga estudyante ang Academic Records → Class Schedule para makita ang mga subject, oras ng klase, at silid. Maaaring buksan ng mga guro ang Scheduling → Class Schedule para pamahalaan ang mga iskedyul. Ang consultation hours ay nasa Scheduling → Consultation Slots. I-refresh ang page pagkatapos ng pagbabago kung hindi agad lumalabas ang bagong entry.',
      ceb: 'Mahimong ablihan sa mga estudyante ang Academic Records → Class Schedule para makita ang mga subject, oras sa klase, ug mga room. Mahimong ablihan sa mga magtutudlo ang Scheduling → Class Schedule para pagdumala sa mga iskedyul. Ang consultation hours anaa sa Scheduling → Consultation Slots. I-refresh ang page human sa kausaban kung dili dayon mogawas ang bag-ong entry.',
    },
  },
  {
    keys: ['id', 'school id', 'number', '2xxxxx', 'username', 'numero', 'student number'],
    answer: {
      en: 'School ID guide:\n- Students: 7 digits beginning with 2, for example 2414807.\n- Teachers: 7-digit IDs beginning with 3.\n- Admins: 7-digit IDs beginning with 4.\nYour ID appears below your name in the portal sidebar. Use the school ID or registered school email when signing in. If you cannot remember it, contact the registrar or helpdesk so your identity can be verified.',
      tl: 'Gabay sa school ID:\n- Estudyante: 7 digits na nagsisimula sa 2, halimbawa 2414807.\n- Guro: 7-digit ID na nagsisimula sa 3.\n- Admin: 7-digit ID na nagsisimula sa 4.\nMakikita ang ID sa ibaba ng pangalan mo sa sidebar ng portal. Gamitin ang school ID o rehistradong school email sa pag-sign in. Kung nakalimutan mo ito, makipag-ugnayan sa registrar o helpdesk para maberipika ang pagkakakilanlan mo.',
      ceb: 'Giya sa school ID:\n- Estudyante: 7 digits nga nagsugod sa 2, pananglitan 2414807.\n- Magtutudlo: 7-digit ID nga nagsugod sa 3.\n- Admin: 7-digit ID nga nagsugod sa 4.\nMakita ang ID sa ubos sa imong ngalan sa sidebar sa portal. Gamita ang school ID o rehistradong school email sa pag-sign in. Kung nalimtan nimo kini, kontaka ang registrar o helpdesk para maberipika ang imong pagkatawo.',
    },
  },
  {
    keys: ['password', 'forgot', 'reset', 'recover', 'nakalimutan', 'nakalimot', 'kalimot', 'kalimutan'],
    answer: {
      en: 'To reset your password, choose Password Recovery on the login page, or open Authentication → Password Recovery inside the portal. Enter the email address or account identifier associated with your account and submit the request. Check your inbox and spam folder for the reset link, then create a new password. Do not share the reset link with anyone.',
      tl: 'Para i-reset ang password, piliin ang Password Recovery sa login page, o buksan ang Authentication → Password Recovery sa loob ng portal. Ilagay ang email address o account identifier ng account mo at isumite. Tingnan ang inbox at spam folder para sa reset link, pagkatapos ay gumawa ng bagong password. Huwag ibahagi ang reset link kahit kanino.',
      ceb: 'Para i-reset ang password, pilia ang Password Recovery sa login page, o ablihi ang Authentication → Password Recovery sa sulod sa portal. Ibutang ang email address o account identifier sa imong account ug isumite. Tan-awa ang inbox ug spam folder para sa reset link, dayon paghimo ug bag-ong password. Ayaw ipaambit ang reset link kang bisan kinsa.',
    },
  },
  {
    keys: ['google', 'gmail', 'sign in with'],
    answer: {
      en: 'Google sign-in is available only after the administrator configures the Google client and server settings. The client requires VITE_GOOGLE_CLIENT_ID and the server requires GOOGLE_CLIENT_ID. After configuration, the official Google sign-in button appears on the login page. If it is missing, use your normal school ID or email login and contact the administrator.',
      tl: 'Available lang ang Google sign-in kapag na-configure na ng administrator ang Google client at server settings. Kailangan ng client ang VITE_GOOGLE_CLIENT_ID at ng server ang GOOGLE_CLIENT_ID. Pagkatapos ng configuration, lalabas ang opisyal na Google sign-in button sa login page. Kung wala ito, gamitin ang normal na school ID o email login at makipag-ugnayan sa administrator.',
      ceb: 'Available lang ang Google sign-in kung na-configure na sa administrator ang Google client ug server settings. Gikinahanglan sa client ang VITE_GOOGLE_CLIENT_ID ug sa server ang GOOGLE_CLIENT_ID. Human sa configuration, mogawas ang opisyal nga Google sign-in button sa login page. Kung wala kini, gamita ang normal nga school ID o email login ug kontaka ang administrator.',
    },
  },
  {
    keys: ['photo', 'picture', 'avatar', 'face', 'litrato', 'larawan', 'hulagway'],
    answer: {
      en: 'To update your profile photo, open Authentication → Profile Management and choose Upload photo. Use a JPG or PNG image smaller than 2MB, then wait for the upload confirmation. Your photo can appear in your profile, headers, rosters, and class lists depending on your role. If the upload fails, check the file type and size before trying again.',
      tl: 'Para i-update ang profile photo, buksan ang Authentication → Profile Management at piliin ang Upload photo. Gumamit ng JPG o PNG na mas maliit sa 2MB, pagkatapos ay hintayin ang kumpirmasyon ng upload. Maaaring lumabas ang litrato sa profile, headers, rosters, at class lists depende sa role mo. Kung nabigo ang upload, tingnan ang file type at laki bago subukang muli.',
      ceb: 'Para i-update ang profile photo, ablihi ang Authentication → Profile Management ug pilia ang Upload photo. Gamita ang JPG o PNG nga menos sa 2MB, dayon hulata ang kumpirmasyon sa upload. Mahimong mogawas ang hulagway sa profile, headers, rosters, ug class lists depende sa imong role. Kung napakyas ang upload, susiha ang file type ug gidak-on una sulayi pag-usab.',
    },
  },
  {
    keys: ['attendance', 'present', 'absent', 'late', 'excused', 'pagdalo', 'liban', 'pagtambong'],
    answer: {
      en: 'Students can review attendance under Academic Records → Attendance Records. Teachers record attendance through Attendance → Daily Attendance, where each student can be marked Present, Late, or Absent. If an attendance entry is incorrect, contact the teacher who recorded the class so the source record can be corrected.',
      tl: 'Maaaring suriin ng mga estudyante ang attendance sa Academic Records → Attendance Records. Nagtatala ang mga guro sa Attendance → Daily Attendance, kung saan maaaring markahan ang bawat estudyante bilang Present, Late, o Absent. Kung may maling entry, makipag-ugnayan sa gurong nagtala ng klase para maitama ang rekord.',
      ceb: 'Mahimong repasuhon sa mga estudyante ang attendance sa Academic Records → Attendance Records. Ga-rekord ang mga magtutudlo sa Attendance → Daily Attendance, diin matag estudyante mahimong markahan nga Present, Late, o Absent. Kung sayop ang entry, kontaka ang magtutudlo nga nagrekord sa klase aron matul-id ang rekord.',
    },
  },
  {
    keys: ['library', 'book', 'catalog', 'aklatan', 'libro', 'basahonan'],
    answer: {
      en: 'The portal Library is a catalog of what the physical CEC library holds:\n1. Open Library → Library Catalog.\n2. Search by title or author.\n3. Note the title and borrow it in person at the library counter.\nThere is no online borrowing, reservation, or fine payment here — the counter staff assists you on visit.',
      tl: 'Ang Library ng portal ay katalogo ng mga hawak ng physical CEC library:\n1. Buksan ang Library → Library Catalog.\n2. Maghanap ayon sa pamagat o may-akda.\n3. Tandaan ang pamagat at hiramin ito nang personal sa library counter.\nWalang online na paghiram, reserbasyon, o pagbabayad ng multa rito — tutulungan ka ng staff sa pagbisita.',
      ceb: 'Ang Library sa portal kay katalogo sa unsay gikuptan sa physical CEC library:\n1. Ablihi ang Library → Library Catalog.\n2. Pangita ayon sa titulo o awtor.\n3. Hinumdumi ang titulo ug hulma kini sa library counter.\nWalay online nga paghulam, reserbasyon, o pagbayad sa multa dinhi — motabang ang staff sa imong pagbisita.',
    },
  },
  {
    keys: ['document', 'cor', 'torr', 'transcript', 'certificate', 'good moral', 'dokumento', 'sertipiko'],
    answer: {
      en: 'For a school document, students open Support Services → Document Request, choose the document type, and submit the request details. For enrollment requirements, use Enrollment → Document Submission and upload the requested files in JPG, PNG, or PDF format when accepted. Track the request or verification status in the relevant tracker and keep the confirmation for follow-up.',
      tl: 'Para sa school document, buksan ng mga estudyante ang Support Services → Document Request, piliin ang uri ng dokumento, at isumite ang mga detalye. Para sa enrollment requirements, gamitin ang Enrollment → Document Submission at i-upload ang mga file sa JPG, PNG, o PDF format kung tinatanggap. Subaybayan ang status sa kaukulang tracker at itago ang kumpirmasyon para sa follow-up.',
      ceb: 'Para sa school document, ablihan sa mga estudyante ang Support Services → Document Request, pilia ang matang sa dokumento, ug isumite ang mga detalye. Para sa enrollment requirements, gamita ang Enrollment → Document Submission ug i-upload ang mga file sa JPG, PNG, o PDF format kung dawaton. Bantayi ang status sa angay nga tracker ug tipigi ang kumpirmasyon para sa follow-up.',
    },
  },
  {
    keys: ['human', 'registrar', 'contact', 'helpdesk', 'support', 'phone', 'tao', 'tulong', 'tabang', 'telepono', 'tawagan'],
    answer: {
      en: 'CEC Helpdesk contact:\nEmail: support@cec.edu.ph\nPhone: (032) 255-1234\nRegistrar office: Windows 1–3, 8:00 AM–5:00 PM, Monday–Friday.\nWhen asking for help, include your full name, school ID, portal module, what you were trying to do, and any reference number. Never send your password.',
      tl: 'Kontak ng CEC Helpdesk:\nEmail: support@cec.edu.ph\nTelepono: (032) 255-1234\nOpisina ng registrar: Windows 1–3, 8:00 AM–5:00 PM, Lunes–Biyernes.\nKapag humihingi ng tulong, isama ang buong pangalan, school ID, portal module, ginagawa mo, at anumang reference number. Huwag ipadala ang password.',
      ceb: 'Kontak sa CEC Helpdesk:\nEmail: support@cec.edu.ph\nTelepono: (032) 255-1234\nOpisina sa registrar: Windows 1–3, 8:00 AM–5:00 PM, Lunes–Biyernes.\nKung mangayo ug tabang, iapil ang tibuok ngalan, school ID, portal module, gibuhat nimo, ug bisan unsang reference number. Ayaw ipadala ang password.',
    },
  },
];

const GREETINGS: Record<SupportLang, string> = {
  en: 'Hi! I can help with enrollment, payments, grades, schedules, school IDs, attendance, library, documents, and password recovery. What do you need?',
  tl: 'Kumusta! Makakatulong ako sa pagpapatala, pagbabayad, grado, iskedyul, school ID, attendance, library, dokumento, at password recovery. Ano ang kailangan mo?',
  ceb: 'Kumusta! Makatabang ko sa pagpalista, pagbayad, grado, iskedyul, school ID, attendance, library, dokumento, ug password recovery. Unsa may imong kinahanglan?',
};

const THANKS: Record<SupportLang, string> = {
  en: "You're welcome! If you need anything else about the portal, just ask.",
  tl: 'Walang anuman! Kung may kailangan ka pa tungkol sa portal, magtanong ka lang.',
  ceb: 'Walay sapayan! Kung naa pa kay kinahanglan bahin sa portal, pangutana lang.',
};

const FALLBACK: Record<SupportLang, string> = {
  en: `I can provide step-by-step help with enrollment, document submission, payments (${['GCash', 'Maya', 'GoTyme', 'UnionBank', 'Metrobank'].join(', ')}), grades, schedules, school IDs, attendance, library services, password recovery, and profile photos. Please include your role (student, teacher, or admin) and the module you are using. For account-specific issues, contact support@cec.edu.ph or (032) 255-1234.`,
  tl: `Makakapagbigay ako ng step-by-step na tulong sa pagpapatala, pagsusumite ng dokumento, pagbabayad (${['GCash', 'Maya', 'GoTyme', 'UnionBank', 'Metrobank'].join(', ')}), grado, iskedyul, school ID, attendance, serbisyo ng library, password recovery, at profile photo. Pakisama ang role mo (estudyante, guro, o admin) at ang module na ginagamit mo. Para sa mga isyung partikular sa account, makipag-ugnayan sa support@cec.edu.ph o (032) 255-1234.`,
  ceb: `Makahatag ko ug step-by-step nga tabang sa pagpalista, pagsumite ug dokumento, pagbayad (${['GCash', 'Maya', 'GoTyme', 'UnionBank', 'Metrobank'].join(', ')}), grado, iskedyul, school ID, attendance, serbisyo sa library, password recovery, ug profile photo. Iapil ang imong role (estudyante, magtutudlo, o admin) ug ang module nga imong gigamit. Para sa mga isyu nga espesipiko sa account, kontaka ang support@cec.edu.ph o (032) 255-1234.`,
};

const isGreeting = (q: string): boolean =>
  /^(hi|hii+|hello|hey|yo|kumusta|kamusta|maayong|magandang|good\s?(morning|afternoon|evening|day))\b/.test(q.trim());

const isThanks = (q: string): boolean =>
  /\b(thank|thanks|tnx|salamat|daghang\s+salamat|maraming\s+salamat)\b/.test(q);

export const localAnswer = (question: string, lang?: SupportLang): string | null => {
  const q = question.toLowerCase();
  const resolved = lang ?? detectLanguage(question);
  if (isGreeting(q)) return GREETINGS[resolved];
  if (isThanks(q)) return THANKS[resolved];
  for (const faq of FAQS) {
    if (faq.keys.some((k) => q.includes(k))) return faq.answer[resolved];
  }
  return null;
};

export const askAi = async (
  question: string,
  role: string,
  langPref: LangPref = 'auto',
): Promise<{ text: string; source: 'ai' | 'local'; lang: SupportLang }> => {
  const lang = resolveLang(question, langPref);
  const fallback = localAnswer(question, lang) ?? FALLBACK[lang];
  if (!AI_URL) return { text: fallback, source: 'local', lang };
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (AI_KEY) headers.Authorization = `Bearer ${AI_KEY}`;
    // Reuse the app axios instance when the URL is same-origin; else plain fetch
    const body = { model: AI_MODEL, messages: [{ role: 'system', content: `You are the CEC School Portal support assistant for a ${role}. Reply in ${LANG_NAME[lang]} (the user's language). Give detailed, practical answers using the exact portal module names. Use a short heading and numbered steps when explaining a process. Include requirements, what the user should expect after submitting, and what to do if something fails. Do not invent policies, deadlines, or personal account data. Keep the response under 450 words.` }, { role: 'user', content: question }], max_tokens: 600 };
    const res = AI_URL.startsWith('http') ? await fetch(AI_URL, { method: 'POST', headers, body: JSON.stringify(body) }).then((r) => r.json())
      : (await api.post(AI_URL, body)).data;
    const text = res?.choices?.[0]?.message?.content?.trim();
    return text ? { text, source: 'ai', lang } : { text: fallback, source: 'local', lang };
  } catch {
    return { text: fallback, source: 'local', lang };
  }
};
