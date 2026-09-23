import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type InvoiceItem = {
  name: string
  quantity: number // hours (decimal)
  rate: number     // USD per hour
}

export type InvoiceData = {
  senderName: string
  billTo: string
  invoiceNumber: number
  invoiceDate: Date
  dateRangeStr: string // e.g. "31.08.2026_13.09.2026" extracted from Excel filename
  items: InvoiceItem[]
  taxRate: number // 0 = 0%
  bankDetails: {
    bankName: string
    address: string
    routingNumber: string
    accountNumber: string
  }
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Generate a PDF invoice matching the reference format.
 * Layout: A4 portrait with header, bill-to, table, totals, notes.
 */
export function generateInvoicePdf(data: InvoiceData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // ── Header: Sender name (left) + INVOICE # (right) ──
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text(data.senderName, margin, y + 8)

  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', pageWidth - margin, y + 2, { align: 'right' })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`# ${data.invoiceNumber}`, pageWidth - margin, y + 10, { align: 'right' })
  doc.setTextColor(0, 0, 0)

  y += 28

  // ── Divider ──
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 12

  // ── Bill To + Date + Balance Due ──
  // Left side: Bill To
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(130, 130, 130)
  doc.text('Bill To', margin, y)
  y += 6
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(data.billTo, margin, y)

  // Right side: Date
  const rightCol = pageWidth - margin
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(130, 130, 130)
  doc.text('Date', rightCol - 60, y - 6)
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDate(data.invoiceDate), rightCol - 60, y)

  // Balance Due
  const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.rate, 0)
  const tax = subtotal * data.taxRate
  const total = subtotal + tax

  doc.setFontSize(10)
  doc.setTextColor(130, 130, 130)
  doc.text('Balance Due', rightCol - 5, y - 12, { align: 'right' })
  
  // Balance Due pill/box
  const balanceText = formatCurrency(total)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  const balanceWidth = doc.getTextWidth(balanceText)
  const pillPadX = 6
  const pillX = rightCol - balanceWidth - pillPadX * 2 + 2
  const pillY = y - 9
  const pillW = balanceWidth + pillPadX * 2
  const pillH = 10

  doc.setFillColor(240, 240, 240)
  doc.roundedRect(pillX, pillY, pillW, pillH, 2, 2, 'F')
  doc.text(balanceText, rightCol - 3, y - 2, { align: 'right' })

  y += 18

  // ── Items Table ──
  const tableBody = data.items.map(item => [
    item.name,
    item.quantity.toFixed(2),
    formatCurrency(item.rate),
    formatCurrency(item.quantity * item.rate),
  ])

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Quantity', 'Rate', 'Amount']],
    body: tableBody,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      lineColor: [230, 230, 230],
      lineWidth: 0,
      textColor: [40, 40, 40],
    },
    headStyles: {
      fillColor: [35, 35, 35],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.40 },
      1: { cellWidth: contentWidth * 0.20, halign: 'right' },
      2: { cellWidth: contentWidth * 0.18, halign: 'right' },
      3: { cellWidth: contentWidth * 0.22, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    margin: { left: margin, right: margin },
  })

  // Get Y position after table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8

  // ── Totals Section (right-aligned) ──
  const totalsX = pageWidth - margin - 80
  const valuesX = pageWidth - margin

  // Subtotal
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('Subtotal', totalsX, y)
  doc.setTextColor(0, 0, 0)
  doc.text(formatCurrency(subtotal), valuesX, y, { align: 'right' })
  y += 7

  // Tax
  doc.setTextColor(100, 100, 100)
  doc.text(`Tax (${(data.taxRate * 100).toFixed(0)}%)`, totalsX, y)
  doc.setTextColor(0, 0, 0)
  doc.text(formatCurrency(tax), valuesX, y, { align: 'right' })
  y += 4

  // Divider before total
  doc.setDrawColor(200, 200, 200)
  doc.line(totalsX, y, valuesX, y)
  y += 6

  // Total
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('Total', totalsX, y)
  doc.setTextColor(0, 0, 0)
  doc.text(formatCurrency(total), valuesX, y, { align: 'right' })
  y += 20

  // ── Notes Section ──
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Notes', margin, y)
  y += 7

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)

  const noteLines = [
    `Bank Name: ${data.bankDetails.bankName}`,
    `Address: ${data.bankDetails.address}`,
    `Routing Number: ${data.bankDetails.routingNumber}`,
    `Account Number: ${data.bankDetails.accountNumber}`,
  ]

  noteLines.forEach(line => {
    doc.text(line, margin, y)
    y += 5
  })

  return doc
}

/**
 * Generate and trigger download of the invoice PDF.
 * Filename format: Khoa_Invoice_31.08.2026_13.09.2026.pdf
 */
export function downloadInvoicePdf(data: InvoiceData): void {
  const doc = generateInvoicePdf(data)

  const firstName = data.senderName.split(' ')[0]
  const filename = data.dateRangeStr
    ? `${firstName}_Invoice_${data.dateRangeStr}.pdf`
    : `${firstName}_Invoice_${data.invoiceDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')}.pdf`

  doc.save(filename)
}
