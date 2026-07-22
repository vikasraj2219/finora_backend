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
const parsePdfText = (text) => {
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

module.exports = { normalizeRow, parsePdfText, parseDateFlexible };
