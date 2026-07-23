const fs = require('fs');
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');
const { normalizeRow, parsePdfText } = require('../utils/statementParser');
const { getBankAccountById } = require('./bankAccount.service');
const { matchMerchant } = require('./merchantMatch.service');
const { findDuplicateTransaction } = require('./duplicateDetection.service');
const { createTransaction } = require('./transaction.service');
const { findOrCreateByName } = require('./merchant.service');
const { getOrCreateFallbackCategory } = require('./category.service');

const parseFileToRows = (filePath, mimetype) => {
  const buffer = fs.readFileSync(filePath);

  if (mimetype === 'text/csv') {
    const { parse } = require('csv-parse/sync');
    const raw = parse(buffer.toString('utf-8'), { columns: true, skip_empty_lines: true, trim: true });
    return raw.map(normalizeRow);
  }

  if (
    mimetype === 'application/vnd.ms-excel' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    const XLSX = require('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return raw.map(normalizeRow);
  }

  if (mimetype === 'application/pdf') {
    // Lazily required — pdf-parse reads a test fixture on import in some versions,
    // so only load it when a PDF is actually being processed.
    const pdfParse = require('pdf-parse');
    return pdfParse(buffer).then((data) => parsePdfText(data.text));
  }

  throw new ApiError(400, `Unsupported file type for import: ${mimetype}`);
};

// Parses the uploaded statement and, for every row, suggests a merchant/category and
// flags likely duplicates — but does NOT write anything to the database yet. The
// frontend lets the user review/edit/deselect rows before calling confirmImport.
const previewImport = async (userId, bankAccountId, filePath, mimetype) => {
  await getBankAccountById(userId, bankAccountId); // ownership check

  const rows = await parseFileToRows(filePath, mimetype);
  const validRows = rows.filter((r) => r.date && r.amount > 0 && r.description);

  if (validRows.length === 0) {
    throw new ApiError(
      422,
      'No transactions could be read from this file. Check the format, or try exporting as CSV.'
    );
  }

  const importBatchId = crypto.randomUUID();

  const enrichedRows = await Promise.all(
    validRows.map(async (row) => {
      const merchant = await matchMerchant(userId, row.description);
      const duplicate = await findDuplicateTransaction(userId, bankAccountId, row.date, row.amount);

      return {
        date: row.date,
        description: row.description,
        amount: row.amount,
        type: row.type,
        suggestedMerchant: merchant ? { id: merchant._id, name: merchant.name } : null,
        suggestedCategory: merchant?.defaultCategory || null,
        isDuplicate: Boolean(duplicate),
        duplicateOfTransactionId: duplicate?._id || null,
      };
    })
  );

  return { importBatchId, bankAccount: bankAccountId, rows: enrichedRows };
};

// Creates real Transaction documents for the rows the user kept after reviewing the
// preview. Each row goes through the normal transaction.service.createTransaction so
// balance updates, merchant stats, and audit logging all happen exactly as they would
// for a manually-entered transaction.
const confirmImport = async (userId, bankAccountId, importBatchId, rows) => {
  await getBankAccountById(userId, bankAccountId); // ownership check

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ApiError(400, 'No rows provided to import');
  }

  let created = 0;
  let skipped = 0;
  let uncategorized = 0;

  for (const row of rows) {
    if (row.include === false) {
      skipped += 1;
      continue;
    }

    let categoryId = row.category;
    if (!categoryId) {
      const fallback = await getOrCreateFallbackCategory(userId, row.type);
      categoryId = fallback._id;
      uncategorized += 1;
    }

    let merchantId = row.merchant || undefined;
    if (!merchantId && row.newMerchantName) {
      const merchant = await findOrCreateByName(userId, row.newMerchantName);
      merchantId = merchant._id;
    }

    await createTransaction(userId, {
      type: row.type,
      amount: row.amount,
      date: row.date,
      category: categoryId,
      paymentMethod: 'bank',
      bankAccount: bankAccountId,
      merchant: merchantId,
      note: row.description,
      importBatchId,
    });
    created += 1;
  }

  return { importBatchId, created, skipped, uncategorized };
};

module.exports = { previewImport, confirmImport };
