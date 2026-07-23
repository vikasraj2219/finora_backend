// Column-name variants tolerated across different banks' export formats. Matching is
// done on the header with all non-letters stripped and lowercased, e.g. "Txn Date" -> "txndate".
const DATE_KEYS = ['date', 'txndate', 'transactiondate', 'valuedate', 'postingdate'];
const DESC_KEYS = ['description', 'narration', 'details', 'particulars', 'remarks', 'transactiondetails'];
const DEBIT_KEYS = ['debit', 'withdrawal', 'withdrawalamt', 'withdrawalamount', 'dr'];
const CREDIT_KEYS = ['credit', 'deposit', 'depositamt', 'depositamount', 'cr'];
const AMOUNT_KEYS = ['amount', 'amt', 'transactionamount'];
const TYPE_KEYS = ['type', 'txntype', 'transactiontype', 'drcr'];

const cleanKey = (k) => k.toLowerCase().replace(/[^a-z]/g, '');

const findKey = (row, candidates) => {
  const keys = Object.keys(row);
  return keys.find((k) => candidates.includes(cleanKey(k)));
};

const toNumber = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  const cleaned = String(value).replace(/[,₹$\s]/g, '');
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? 0 : num;
};

// Accepts native Date objects (from xlsx), ISO strings, and common dd/mm/yyyy formats.
const parseDateFlexible = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const str = String(value).trim();
  const isoAttempt = new Date(str);
  if (!Number.isNaN(isoAttempt.getTime()) && /\d{4}/.test(str)) return isoAttempt;

  const match = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (match) {
    let [, day, month, year] = match;
    if (year.length === 2) year = `20${year}`;
    const parsed = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

// Normalizes one row from a CSV or XLSX sheet (both come in as plain objects keyed
// by header name) into { date, description, amount, type }.
const normalizeRow = (row) => {
  const dateKey = findKey(row, DATE_KEYS);
  const descKey = findKey(row, DESC_KEYS);
  const debitKey = findKey(row, DEBIT_KEYS);
  const creditKey = findKey(row, CREDIT_KEYS);
  const amountKey = findKey(row, AMOUNT_KEYS);
  const typeKey = findKey(row, TYPE_KEYS);

  const date = dateKey ? parseDateFlexible(row[dateKey]) : null;
  const description = descKey ? String(row[descKey]).trim() : '';

  let amount = 0;
  let type = 'expense';

  if (debitKey && toNumber(row[debitKey]) > 0) {
    amount = toNumber(row[debitKey]);
    type = 'expense';
  } else if (creditKey && toNumber(row[creditKey]) > 0) {
    amount = toNumber(row[creditKey]);
    type = 'income';
  } else if (amountKey) {
    const raw = toNumber(row[amountKey]);
    amount = Math.abs(raw);
    const rawType = (typeKey ? String(row[typeKey]) : '').toLowerCase();
    type = rawType.includes('cr') || rawType.includes('credit') || raw > 0 ? 'income' : 'expense';
  }

  return { date, description, amount, type };
};

// Best-effort line parser for simple tabular bank-statement PDFs: "date  description  amount  DR/CR".
// Complex multi-column or multi-line-per-transaction PDF layouts will not parse well —
// CSV/XLSX export from the bank's portal is recommended whenever it's available.
const parseGenericTabularPdf = (text) => {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const lineRegex = /^(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{1,2})\s*(DR|CR)?$/i;
  const results = [];

  for (const line of lines) {
    const match = line.match(lineRegex);
    if (!match) continue;
    const [, dateStr, description, amountStr, marker] = match;
    const date = parseDateFlexible(dateStr);
    const amount = toNumber(amountStr);
    if (!date || !amount) continue;
    const type = marker && marker.toLowerCase() === 'cr' ? 'income' : 'expense';
    results.push({ date, description: description.trim(), amount, type });
  }

  return results;
};

// PhonePe "Transaction Statement" PDFs. Each transaction is a fixed-shape block:
//   <Mon DD, YYYY>
//   <hh:mm am/pm>
//   Paid to <merchant> DEBIT ₹<amount>          (or "Received from <name> CREDIT ₹<amount>")
//   Transaction ID <id>
//   UTR No. <utr>
//   Paid by <masked account>                    (or "Credited to <masked account>")
// A long merchant name can wrap onto its own line, which pushes "DEBIT ₹300" to sit right
// after "Paid to" — so the whole blob between the time and "Transaction ID" is captured and
// searched for the amount/type, rather than assuming a single line.
const parsePhonePe = (text) => {
  const results = [];
  const blockRegex =
    /([A-Z][a-z]{2}\s\d{1,2},\s\d{4})\s*\n\s*(\d{1,2}:\d{2}\s?(?:am|pm))\s*\n([\s\S]*?)\nTransaction ID\s+\S+\s*\nUTR No\.\s*\S+\s*\n\s*(?:Paid by|Credited to)/gi;

  let m;
  while ((m = blockRegex.exec(text)) !== null) {
    const [, dateStr, timeStr, blob] = m;
    const date = new Date(`${dateStr} ${timeStr}`);
    const typeMatch = blob.match(/(DEBIT|CREDIT)/i);
    const amountMatch = blob.match(/₹\s?([\d,]+(?:\.\d+)?)/);
    if (!typeMatch || !amountMatch || Number.isNaN(date.getTime())) continue;

    const amount = toNumber(amountMatch[1]);
    const type = typeMatch[1].toUpperCase() === 'CREDIT' ? 'income' : 'expense';
    const description = blob
      .replace(/(DEBIT|CREDIT)/gi, '')
      .replace(/₹\s?[\d,]+(?:\.\d+)?/, '')
      .replace(/^Paid to\s*/i, '')
      .replace(/^Received from\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    results.push({ date, description, amount, type });
  }

  return results;
};

// Google Pay "Transaction statement" PDFs. Each row:
//   <DD Mon, YYYY>
//   <hh:mm AM/PM>
//   Received from <name>                (or "Paid to <name>" for outgoing)
//   UPI Transaction ID: <id>
//   Paid to <own bank account>          (which of the user's own accounts moved the money)
//   ₹<amount>
const parseGooglePay = (text) => {
  const results = [];
  // Google's PDF text extraction sometimes drops spaces entirely (e.g. "02Mar,2026",
  // "ReceivedfromBAVIREDDYMADHU"), so every literal space in this regex is optional (\s*)
  // rather than required, and date/time components are captured separately.
  const blockRegex =
    /(\d{1,2})\s?([A-Z][a-z]{2}),?\s?(\d{4})\s*\n\s*(\d{1,2}:\d{2})\s?(AM|PM)\s*\n([\s\S]*?)\n₹\s?([\d,]+(?:\.\d+)?)/g;

  let m;
  while ((m = blockRegex.exec(text)) !== null) {
    const [, day, mon, year, time, ampm, blob, amountStr] = m;
    const date = new Date(`${mon} ${day}, ${year} ${time} ${ampm}`);
    if (Number.isNaN(date.getTime())) continue;

    const amount = toNumber(amountStr);
    const firstLine = blob.split('\n')[0].trim();
    const type = /^received\s*from/i.test(firstLine) ? 'income' : 'expense';
    const description = firstLine
      .replace(/^Received\s*from\s*/i, '')
      .replace(/^Paid\s*to\s*/i, '')
      .trim();

    results.push({ date, description, amount, type });
  }

  return results;
};

// Paytm "Passbook Payments History" PDFs. Rows don't carry a year, only "DD Mon" — the
// year is inferred from the statement-period header, e.g. "Paytm Statement for 23 APR'26 -
// 22 JUL'26". Each row:
//   <DD Mon>
//   <h:mm AM/PM>
//   Paid to <merchant> / Received from <name> / Recharge of ...
//   UPI ID / UPI Ref No / Note / Tag lines (variable, any subset)
//   <own bank account label>
//   - Rs.<amount>                       (or "+ Rs.<amount>" for money received)
const parsePaytm = (text) => {
  const periodMatch = text.match(
    /Statement for\s+\d{1,2}\s+[A-Z]{3}'(\d{2})\s*-\s*\d{1,2}\s+[A-Z]{3}'(\d{2})/i
  );
  const startYear = periodMatch ? 2000 + parseInt(periodMatch[1], 10) : new Date().getFullYear();
  const endYear = periodMatch ? 2000 + parseInt(periodMatch[2], 10) : new Date().getFullYear();

  const monthIndex = (mon) =>
    ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(
      mon.toLowerCase()
    );

  const results = [];
  const blockRegex =
    /(\d{1,2}\s[A-Z][a-z]{2})\s*\n\s*(\d{1,2}:\d{2}\s?(?:AM|PM))\s*\n([\s\S]*?)\n(-|\+)\s?Rs\.\s?([\d,]+(?:\.\d+)?)/g;

  let m;
  while ((m = blockRegex.exec(text)) !== null) {
    const [, dayMon, timeStr, blob, sign, amountStr] = m;
    const [dayStr, monStr] = dayMon.split(/\s+/);
    if (monthIndex(monStr) === -1) continue;

    // Statement periods spanning a year boundary (e.g. Dec'25 - Jan'26): months in the
    // back half of the calendar belong to the start year, the rest to the end year.
    const year = startYear !== endYear && monthIndex(monStr) >= 6 ? startYear : endYear;
    const date = new Date(`${monStr} ${dayStr}, ${year} ${timeStr}`);
    if (Number.isNaN(date.getTime())) continue;

    const amount = toNumber(amountStr);
    const type = sign === '+' ? 'income' : 'expense';
    const firstLine = blob.split('\n')[0].trim();
    const description = firstLine.replace(/^Paid to\s*/i, '').replace(/^Received from\s*/i, '').trim();

    results.push({ date, description, amount, type });
  }

  return results;
};

// Routes a PDF's extracted text to the right provider-specific parser based on
// signature text unique to each statement, falling back to the generic tabular
// parser for regular bank-portal exports.
const parsePdfText = (text) => {
  if (/support\.phonepe\.com/i.test(text)) {
    return parsePhonePe(text);
  }
  if (/google\s*pay\s*app/i.test(text) || /powered\s*by[\s\S]{0,20}upi/i.test(text)) {
    return parseGooglePay(text);
  }
  if (/paytm statement for/i.test(text) || /passbook payments history/i.test(text)) {
    return parsePaytm(text);
  }
  return parseGenericTabularPdf(text);
};

module.exports = {
  normalizeRow,
  parsePdfText,
  parseDateFlexible,
  parsePhonePe,
  parseGooglePay,
  parsePaytm,
  parseGenericTabularPdf,
};
