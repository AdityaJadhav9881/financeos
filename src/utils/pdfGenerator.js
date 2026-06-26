import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';

applyPlugin(jsPDF);

function sanitize(value) {
  return String(value ?? '')
    .replace(/₹/g, 'Rs.')
    .replace(/\u20B9/g, 'Rs.')
    .replace(/\n/g, ' ')
    .trim();
}

function formatCurrency(value) {
  return sanitize(`Rs. ${Number(value || 0).toFixed(2)}`);
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-CA');
}

function getMonthIndex(monthName) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return months.indexOf(monthName);
}

function triggerWebDownload(doc, fileName) {
  const dataUri = doc.output('datauristring');
  const byteString = atob(dataUri.split(',')[1]);
  const mimeString = dataUri.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i += 1) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeString });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

async function downloadPdf(doc, fileName) {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      try {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const dataUri = doc.output('datauristring');
        const base64Data = dataUri.split(',')[1];

        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        try {
          const { Share } = await import('@capacitor/share');
          const uriResult = await Filesystem.getUri({
            path: fileName,
            directory: Directory.Cache,
          });
          await Share.share({
            title: fileName,
            url: uriResult.uri,
            dialogTitle: 'Save PDF Report',
          });
        } catch {
          alert('PDF saved to app cache: ' + fileName);
        }
      } catch (err) {
        console.error('Capacitor PDF save failed:', err);
        alert('Failed to save PDF: ' + err.message);
      }
      return;
    }
  } catch {
    // Not on native platform, fall through to web download
  }

  triggerWebDownload(doc, fileName);
}

export const generatePDFReport = async (filteredTransactions, month, year, baseBalances) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  const targetMonthIndex = getMonthIndex(month);
  const targetYear = Number(year);

  const currentMonthTransactions = filteredTransactions.filter((transaction) => {
    if (!transaction.created_at) return false;
    const date = new Date(transaction.created_at);
    if (Number.isNaN(date.getTime())) return false;
    return date.getMonth() === targetMonthIndex && date.getFullYear() === targetYear;
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FINANCE OS - MONTHLY REPORT', margin, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${month} ${year}`, pageWidth - margin, 50, { align: 'right' });

  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.5);
  doc.line(margin, 60, pageWidth - margin, 60);

  const totalIncome = currentMonthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = currentMonthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const netPosition = totalIncome - totalExpense;

  const summaryTop = 80;
  const summarySpacing = 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Total Income', margin, summaryTop);
  doc.text(formatCurrency(totalIncome), pageWidth - margin, summaryTop, { align: 'right' });
  doc.text('Total Expense', margin, summaryTop + summarySpacing);
  doc.text(formatCurrency(totalExpense), pageWidth - margin, summaryTop + summarySpacing, { align: 'right' });
  doc.text('Net Position', margin, summaryTop + summarySpacing * 2);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(netPosition), pageWidth - margin, summaryTop + summarySpacing * 2, { align: 'right' });

  const bal = baseBalances || { cash: 0, upi: 0 };
  const cashIncome = currentMonthTransactions
    .filter((t) => t.type === 'income' && (t.payment_mode || '').toLowerCase() === 'cash')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const cashExpense = currentMonthTransactions
    .filter((t) => t.type === 'expense' && (t.payment_mode || '').toLowerCase() === 'cash')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const upiIncome = currentMonthTransactions
    .filter((t) => t.type === 'income' && (t.payment_mode || '').toLowerCase() === 'upi')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const upiExpense = currentMonthTransactions
    .filter((t) => t.type === 'expense' && (t.payment_mode || '').toLowerCase() === 'upi')
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const currentCash = Number(bal.cash) + cashIncome - cashExpense;
  const currentUPI = Number(bal.upi) + upiIncome - upiExpense;
  const currentGrand = currentCash + currentUPI;

  const balTop = summaryTop + summarySpacing * 3 + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Cash Balance', margin, balTop);
  doc.text(formatCurrency(currentCash), pageWidth - margin, balTop, { align: 'right' });
  doc.text('UPI Balance', margin, balTop + summarySpacing);
  doc.text(formatCurrency(currentUPI), pageWidth - margin, balTop + summarySpacing, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text('Total Balance', margin, balTop + summarySpacing * 2);
  doc.text(formatCurrency(currentGrand), pageWidth - margin, balTop + summarySpacing * 2, { align: 'right' });

  const categoryMap = currentMonthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((map, t) => {
      const key = sanitize(t.category || '-');
      map[key] = (map[key] || 0) + Number(t.amount);
      return map;
    }, {});

  const categorySummary = Object.entries(categoryMap)
    .map(([category, value]) => [sanitize(category), formatCurrency(value)])
    .sort((a, b) => {
      const numA = Number(String(a[1]).replace(/[^0-9.]/g, '')) || 0;
      const numB = Number(String(b[1]).replace(/[^0-9.]/g, '')) || 0;
      return numB - numA;
    });

  const incomeCategoryMap = currentMonthTransactions
    .filter((t) => t.type === 'income')
    .reduce((map, t) => {
      const key = sanitize(t.category || '-');
      map[key] = (map[key] || 0) + Number(t.amount);
      return map;
    }, {});

  const incomeCategorySummary = Object.entries(incomeCategoryMap)
    .map(([category, value]) => [sanitize(category), formatCurrency(value)])
    .sort((a, b) => {
      const numA = Number(String(a[1]).replace(/[^0-9.]/g, '')) || 0;
      const numB = Number(String(b[1]).replace(/[^0-9.]/g, '')) || 0;
      return numB - numA;
    });

  const summaryStartY = summaryTop + summarySpacing * 3 + 10;

  doc.autoTable({
    startY: summaryStartY,
    head: [['Expense Category', 'Total Spent']],
    body: categorySummary.length ? categorySummary : [['-', 'Rs. 0.00']],
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 6,
      fillColor: [14, 18, 24],
      textColor: 230,
      halign: 'left',
    },
    columnStyles: { 1: { halign: 'right' } },
    headStyles: {
      fillColor: [34, 34, 34],
      textColor: 255,
      fontStyle: 'bold',
    },
    theme: 'grid',
    margin: { left: margin, right: margin },
  });

  if (incomeCategorySummary.length) {
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Income Category', 'Total Received']],
      body: incomeCategorySummary,
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 6,
        fillColor: [14, 18, 24],
        textColor: 230,
        halign: 'left',
      },
      columnStyles: { 1: { halign: 'right' } },
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: 255,
        fontStyle: 'bold',
      },
      theme: 'grid',
      margin: { left: margin, right: margin },
    });
  }

  const tableBody = currentMonthTransactions.length
    ? currentMonthTransactions.map((t) => [
        t.created_at ? sanitize(formatDate(t.created_at)) : '-',
        sanitize(t.category || '-'),
        sanitize(t.description || '-'),
        sanitize(t.type || '-'),
        sanitize(t.payment_mode || t.paymentMode || '-'),
        formatCurrency(Number(t.amount || 0)),
      ])
    : [['-', 'No transactions available for this period', '-', '-', '-', 'Rs. 0.00']];

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 15,
    head: [['Date', 'Category', 'Description', 'Type', 'Mode', 'Amount']],
    body: tableBody,
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 6,
      fillColor: [14, 18, 24],
      textColor: 230,
      halign: 'left',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [6, 182, 212],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [20, 25, 35] },
    columnStyles: { 5: { halign: 'right' } },
    theme: 'grid',
    margin: { left: margin, right: margin },
  });

  const safeMonth = month.replace(/\s+/g, '_');
  const fileName = `Finance_OS_Report_${safeMonth}_${year}.pdf`;
  await downloadPdf(doc, fileName);
};
