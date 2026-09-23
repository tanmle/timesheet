import { NextResponse } from 'next/server'
import { parseWorklogExcel } from '@/utils/parseWorklog'
import { generateInvoicePdf, type InvoiceData } from '@/utils/generateInvoicePdf'
import { getNextInvoiceNumber, saveInvoice } from '@/app/(dashboard)/invoice/actions'
import { createClient } from '@supabase/supabase-js'

// We need a service role client to bypass RLS in the webhook (since there's no active user session)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const AUTHORIZED_CHAT_ID = process.env.TELEGRAM_CHAT_ID

const DEFAULT_PROJECT_MAPPING: Record<string, string> = {
  'FITRADIO 2': 'FitRadio',
  'Hype Sports': 'Hype',
}

const DEFAULT_SENDER = 'Khoa Nguyen'
const DEFAULT_BILL_TO = 'Lexi Bellassa'
const DEFAULT_RATE = 22.5
const MAX_BILLABLE_HOURS = 70
const DEFAULT_BANK = {
  bankName: 'Mercury',
  address: '2025 Guadalupe St. Ste 260, Austin, TX 78705',
  routingNumber: '084106768',
  accountNumber: '1000766793',
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Log the incoming message for debugging
    console.log('Telegram Webhook payload:', JSON.stringify(body))

    const message = body.message
    if (!message) return NextResponse.json({ status: 'ignored' })

    const chatId = message.chat.id.toString()

    // Security check: Only process messages from the authorized user
    if (chatId !== AUTHORIZED_CHAT_ID) {
      console.warn(`Unauthorized access attempt from chat ID: ${chatId}`)
      return NextResponse.json({ status: 'unauthorized' })
    }

    // Check if there is a document attached
    if (!message.document) {
      await sendMessage(chatId, 'Please upload a .xlsx worklog file to generate an invoice.')
      return NextResponse.json({ status: 'no_document' })
    }

    const doc = message.document
    if (!doc.file_name?.endsWith('.xlsx') && !doc.file_name?.endsWith('.xls')) {
      await sendMessage(chatId, 'Invalid file type. Please upload a .xlsx file.')
      return NextResponse.json({ status: 'invalid_file' })
    }

    await sendMessage(chatId, '⏳ Downloading and parsing timesheet...')

    // 1. Get file path from Telegram
    const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${doc.file_id}`)
    const fileData = await fileRes.json()
    
    if (!fileData.ok) {
      throw new Error('Failed to get file info from Telegram')
    }

    const filePath = fileData.result.file_path
    const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`

    // 2. Download the actual file
    const fileContent = await fetch(downloadUrl)
    const arrayBuffer = await fileContent.arrayBuffer()

    // 3. Parse Worklog
    const parsedData = parseWorklogExcel(arrayBuffer)
    if (parsedData.length === 0) {
      await sendMessage(chatId, '❌ No worklog data found in the file.')
      return NextResponse.json({ status: 'empty' })
    }

    const userData = parsedData[0] // Khoa
    
    // Map project names and apply 70h cap
    let totalActual = 0
    let projects = userData.projects.map(p => {
      totalActual += p.totalHours
      return {
        name: DEFAULT_PROJECT_MAPPING[p.name] || p.name,
        actualHours: p.totalHours,
        billableHours: p.totalHours
      }
    })

    if (totalActual > MAX_BILLABLE_HOURS) {
      const ratio = MAX_BILLABLE_HOURS / totalActual
      projects = projects.map(p => ({
        ...p,
        billableHours: Math.round(p.actualHours * ratio * 100) / 100
      }))
    }

    // Determine dates from filename if possible
    let dateRangeStr = ''
    let invoiceDate = new Date()
    const dateMatch = doc.file_name.match(/(\d{2}\.\d{2}\.\d{4})_(\d{2}\.\d{2}\.\d{4})/)
    if (dateMatch) {
      dateRangeStr = `${dateMatch[1]}_${dateMatch[2]}`
      const [d, m, y] = dateMatch[2].split('.')
      invoiceDate = new Date(Number(y), Number(m) - 1, Number(d))
    }

    // 4. Generate Invoice Data
    // Next invoice number needs Admin privileges because RLS requires auth
    const { data: numData } = await supabaseAdmin
      .from('invoices')
      .select('invoice_number')
      .order('invoice_number', { ascending: false })
      .limit(1)
    
    const invoiceNumber = (numData && numData.length > 0) ? numData[0].invoice_number + 1 : 1

    const invoiceDataPayload: InvoiceData = {
      senderName: DEFAULT_SENDER,
      billTo: DEFAULT_BILL_TO,
      invoiceNumber,
      invoiceDate,
      dateRangeStr,
      items: projects.map(p => ({
        name: p.name,
        quantity: p.billableHours,
        rate: DEFAULT_RATE,
      })),
      taxRate: 0,
      bankDetails: DEFAULT_BANK
    }

    // 5. Generate PDF
    const pdfDoc = generateInvoicePdf(invoiceDataPayload)
    const pdfBuffer = pdfDoc.output('arraybuffer')

    // 6. Save to DB
    const subtotal = invoiceDataPayload.items.reduce((sum, i) => sum + i.quantity * i.rate, 0)
    
    // Using service role to bypass RLS since this is a webhook
    const { error: dbError } = await supabaseAdmin.from('invoices').insert({
      invoice_number: invoiceNumber,
      sender_name: DEFAULT_SENDER,
      bill_to: DEFAULT_BILL_TO,
      invoice_date: invoiceDate.toISOString().split('T')[0],
      items: invoiceDataPayload.items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        rate: i.rate,
        amount: i.quantity * i.rate
      })),
      subtotal,
      tax_rate: 0,
      total: subtotal,
      notes: `Bank Name: ${DEFAULT_BANK.bankName}\nAddress: ${DEFAULT_BANK.address}\nRouting Number: ${DEFAULT_BANK.routingNumber}\nAccount Number: ${DEFAULT_BANK.accountNumber}`,
      is_paid: false
    })

    if (dbError) {
      console.error('Failed to save to DB:', dbError)
      await sendMessage(chatId, '⚠️ Generated PDF, but failed to save to database.')
    }

    // 7. Send PDF back
    const filename = dateRangeStr 
      ? `Khoa_Invoice_${dateRangeStr}.pdf` 
      : `Khoa_Invoice_${invoiceDate.getTime()}.pdf`

    const formData = new FormData()
    formData.append('chat_id', chatId)
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
    formData.append('document', blob, filename)
    formData.append('caption', `✅ Invoice #${invoiceNumber} Generated\nTotal: $${subtotal.toFixed(2)}${totalActual > MAX_BILLABLE_HOURS ? `\n(Capped at ${MAX_BILLABLE_HOURS}h)` : ''}`)

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: formData
    })

    return NextResponse.json({ status: 'success' })

  } catch (error) {
    console.error('Telegram Webhook Error:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

async function sendMessage(chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  })
}
