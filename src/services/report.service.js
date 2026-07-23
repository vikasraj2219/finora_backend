const Transaction = require('../models/Transaction.model');
const { getSummary } = require('./dashboard.service');

// Pulls every matching transaction (no pagination) for export — reuses the same
// filter shape as the Transactions list endpoint.
const fetchTransactionsForExport = async (userId, query) => {
  const filter = { user: userId, isDeleted: false };
  if (query.type) filter.type = query.type;
  if (query.category) filter.category = query.category;
  if (query.bankAccount) filter.bankAccount = query.bankAccount;
  if (query.dateFrom || query.dateTo) {
    filter.date = {};
    if (query.dateFrom) filter.date.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.date.$lte = new Date(query.dateTo);
  }

  return Transaction.find(filter)
    .populate('category', 'name')
    .populate('bankAccount', 'bankName')
    .populate('merchant', 'name')
    .sort({ date: -1 });
};

const csvEscape = (value) => {
  const str = String(value ?? '');
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const buildTransactionsCsv = (transactions) => {
  const header = ['Date', 'Type', 'Category', 'Bank Account', 'Merchant', 'Amount', 'Note'];
  const rows = transactions.map((t) => [
    new Date(t.date).toISOString().slice(0, 10),
    t.type,
    t.category?.name || '',
    t.bankAccount?.bankName || '',
    t.merchant?.name || '',
    t.amount,
    t.note || '',
  ]);
  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
};

const buildTransactionsXlsx = async (transactions) => {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Transactions');

  sheet.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Bank Account', key: 'bank', width: 22 },
    { header: 'Merchant', key: 'merchant', width: 20 },
    { header: 'Amount', key: 'amount', width: 14 },
    { header: 'Note', key: 'note', width: 30 },
  ];
  sheet.getRow(1).font = { bold: true };

  transactions.forEach((t) => {
    sheet.addRow({
      date: new Date(t.date).toISOString().slice(0, 10),
      type: t.type,
      category: t.category?.name || '',
      bank: t.bankAccount?.bankName || '',
      merchant: t.merchant?.name || '',
      amount: t.amount,
      note: t.note || '',
    });
  });

  return workbook.xlsx.writeBuffer();
};

const buildTransactionsPdf = (transactions) =>
  new Promise((resolve, reject) => {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).text('Transaction Statement', { align: 'left' });
    doc.fontSize(9).fillColor('#666').text(`Generated ${new Date().toLocaleDateString('en-IN')}`);
    doc.moveDown(1);

    const colX = [40, 110, 190, 320, 420, 480];
    const headers = ['Date', 'Type', 'Category', 'Bank', 'Amount', 'Note'];

    const drawRow = (values, y, bold = false) => {
      doc.fontSize(9).fillColor('#000').font(bold ? 'Helvetica-Bold' : 'Helvetica');
      values.forEach((v, i) => doc.text(String(v ?? ''), colX[i], y, { width: 90, ellipsis: true }));
    };

    let y = doc.y;
    drawRow(headers, y, true);
    y += 16;
    doc.moveTo(40, y - 4).lineTo(555, y - 4).strokeColor('#ddd').stroke();

    transactions.forEach((t) => {
      if (y > 760) {
        doc.addPage();
        y = 40;
      }
      drawRow(
        [
          new Date(t.date).toISOString().slice(0, 10),
          t.type,
          t.category?.name || '',
          t.bankAccount?.bankName || '',
          t.amount,
          t.note || '',
        ],
        y
      );
      y += 16;
    });

    doc.end();
  });

// A one-page PDF summary of the user's current financial position — total income/expense/
// savings and this month's figures — pulled from the same aggregations the dashboard uses.
const buildSummaryPdf = (summary) =>
  new Promise((resolve, reject) => {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('Financial Summary', { align: 'left' });
    doc.fontSize(9).fillColor('#666').text(`Generated ${new Date().toLocaleDateString('en-IN')}`);
    doc.moveDown(1.5);

    const line = (label, value) => {
      doc.fontSize(11).fillColor('#000').text(label, { continued: true, width: 300 });
      doc.text(String(value), { align: 'right' });
    };

    doc.fontSize(13).fillColor('#146C43').text('All-Time');
    doc.moveDown(0.3);
    line('Total Income', summary.totalIncome);
    line('Total Expense', summary.totalExpense);
    line('Net Savings', summary.netSavings);
    doc.moveDown(1);

    doc.fontSize(13).fillColor('#146C43').text('This Month');
    doc.moveDown(0.3);
    line('Income', summary.monthlyIncome);
    line('Expense', summary.monthlyExpense);
    line('Saving', summary.monthlySaving);
    line('Expense Ratio', summary.expenseRatio === null ? 'N/A' : `${summary.expenseRatio}%`);
    doc.moveDown(1);

    doc.fontSize(13).fillColor('#146C43').text('Highlights');
    doc.moveDown(0.3);
    line('Cash in Hand', summary.cashInHand);
    line('Today\'s Spending', summary.todaySpending);
    line('Most Used Bank', summary.mostUsedBank?.name || 'N/A');
    line('Most Used UPI', summary.mostUsedUpi?.name || 'N/A');
    line('Top Spending Category', summary.highestSpendingCategory?.name || 'N/A');

    doc.end();
  });

const exportTransactions = async (userId, format, query) => {
  const transactions = await fetchTransactionsForExport(userId, query);

  if (format === 'xlsx') return { buffer: await buildTransactionsXlsx(transactions), ext: 'xlsx' };
  if (format === 'pdf') return { buffer: await buildTransactionsPdf(transactions), ext: 'pdf' };
  return { buffer: Buffer.from(buildTransactionsCsv(transactions), 'utf-8'), ext: 'csv' };
};

const exportSummary = async (userId) => {
  const summary = await getSummary(userId);
  return { buffer: await buildSummaryPdf(summary), ext: 'pdf' };
};

module.exports = { exportTransactions, exportSummary };
