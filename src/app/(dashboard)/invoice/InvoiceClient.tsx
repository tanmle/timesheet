'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import { parseWorklogExcel, type ParsedWorklog } from '@/utils/parseWorklog'
import { downloadInvoicePdf, type InvoiceData } from '@/utils/generateInvoicePdf'
import { saveInvoice, deleteInvoice, toggleInvoicePaid } from './actions'

type InvoiceHistoryItem = {
  id: string
  invoice_number: number
  sender_name: string
  bill_to: string
  invoice_date: string
  items: { name: string; quantity: number; rate: number; amount: number }[]
  subtotal: number
  tax_rate: number
  total: number
  notes: string | null
  is_paid: boolean
  date_range_str: string | null
  created_at: string
}

type ProjectEditItem = {
  originalName: string
  displayName: string
  totalHours: number
  billableHours: number // capped by maxBillableHours
}

// Default hardcoded values
const DEFAULT_SENDER = 'Khoa Nguyen'
const DEFAULT_BILL_TO = 'Lexi Bellassa'
const DEFAULT_RATE = 22.5
const DEFAULT_MAX_BILLABLE_HOURS = 0 // 0 = no cap
const DEFAULT_BANK = {
  bankName: 'Mercury',
  address: '2025 Guadalupe St. Ste 260, Austin, TX 78705',
  routingNumber: '084106768',
  accountNumber: '1000766793',
}

// Default project name mappings (Excel name → Invoice display name)
const DEFAULT_PROJECT_MAPPING: Record<string, string> = {
  'FITRADIO 2': 'FitRadio',
  'Hype Sports': 'Hype',
}

export default function InvoiceClient({
  nextInvoiceNumber,
  invoiceHistory,
}: {
  nextInvoiceNumber: number
  invoiceHistory: InvoiceHistoryItem[]
}) {
  const router = useRouter()

  // Step management (1 = Upload, 2 = Review, 3 = Preview)
  const [step, setStep] = useState(1)

  // Parsed data
  const [parsedData, setParsedData] = useState<ParsedWorklog | null>(null)
  const [projects, setProjects] = useState<ProjectEditItem[]>([])
  const [fileName, setFileName] = useState('')
  const [dateRangeStr, setDateRangeStr] = useState('')

  // Form state
  const [senderName, setSenderName] = useState(DEFAULT_SENDER)
  const [billTo, setBillTo] = useState(DEFAULT_BILL_TO)
  const [invoiceNumber, setInvoiceNumber] = useState(nextInvoiceNumber)
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  })
  const [rate, setRate] = useState(DEFAULT_RATE)
  const [maxBillableHours, setMaxBillableHours] = useState(DEFAULT_MAX_BILLABLE_HOURS)

  // Drag state
  const [isDragging, setIsDragging] = useState(false)

  // Loading
  const [isSaving, setIsSaving] = useState(false)

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please upload an Excel file (.xlsx or .xls)')
      return
    }

    try {
      const buffer = await file.arrayBuffer()
      const results = parseWorklogExcel(buffer)

      if (results.length === 0) {
        toast.error('No worklog data found in the file')
        return
      }

      // Take the first user (Khoa)
      const userData = results[0]
      setParsedData(userData)
      setProjects(
        userData.projects.map(p => ({
          originalName: p.name,
          displayName: DEFAULT_PROJECT_MAPPING[p.name] || p.name,
          totalHours: p.totalHours,
          billableHours: p.totalHours,
        }))
      )
      setFileName(file.name)

      // Extract date range from filename (worklogs_DD.MM.YYYY_DD.MM.YYYY.xlsx)
      const dateMatch = file.name.match(/(\d{2}\.\d{2}\.\d{4})_(\d{2}\.\d{2}\.\d{4})/)
      if (dateMatch) {
        setDateRangeStr(`${dateMatch[1]}_${dateMatch[2]}`)
        // Use end date as invoice date
        const [d, m, y] = dateMatch[2].split('.')
        setInvoiceDate(`${y}-${m}-${d}`)
      }

      setStep(2)
      toast.success(`Parsed ${userData.projects.length} projects for ${userData.user}`)
    } catch {
      toast.error('Failed to parse the Excel file')
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const updateProjectName = (index: number, name: string) => {
    setProjects(prev => {
      const next = [...prev]
      next[index] = { ...next[index], displayName: name }
      return next
    })
  }

  // Recalculate billable hours when maxBillableHours changes
  const getEffectiveProjects = () => {
    if (maxBillableHours <= 0) {
      return projects.map(p => ({ ...p, billableHours: p.totalHours }))
    }
    const totalActual = projects.reduce((sum, p) => sum + p.totalHours, 0)
    if (totalActual <= maxBillableHours) {
      return projects.map(p => ({ ...p, billableHours: p.totalHours }))
    }
    // Pro-rate: each project gets proportional share of max hours
    const ratio = maxBillableHours / totalActual
    return projects.map(p => ({
      ...p,
      billableHours: Math.round(p.totalHours * ratio * 100) / 100,
    }))
  }

  const buildInvoiceData = (): InvoiceData => {
    const effective = getEffectiveProjects()
    return {
      senderName,
      billTo,
      invoiceNumber,
      invoiceDate: (() => {
        const [y, m, d] = invoiceDate.split('-').map(Number)
        return new Date(y, m - 1, d)
      })(),
      dateRangeStr,
      items: effective.map(p => ({
        name: p.displayName,
        quantity: Math.round(p.billableHours * 100) / 100,
        rate,
      })),
      taxRate: 0,
      bankDetails: DEFAULT_BANK,
    }
  }

  const handleGenerate = () => {
    const data = buildInvoiceData()
    downloadInvoicePdf(data)
    toast.success('Invoice PDF downloaded!')
  }

  const handleSaveAndGenerate = async () => {
    setIsSaving(true)
    const data = buildInvoiceData()
    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.rate, 0)
    const total = subtotal // tax = 0

    try {
      await saveInvoice({
        invoiceNumber: data.invoiceNumber,
        senderName: data.senderName,
        billTo: data.billTo,
        invoiceDate: invoiceDate,
        dateRangeStr: data.dateRangeStr,
        items: data.items.map(i => ({
          name: i.name,
          quantity: i.quantity,
          rate: i.rate,
          amount: i.quantity * i.rate,
        })),
        subtotal,
        taxRate: 0,
        total,
        notes: `Bank Name: ${DEFAULT_BANK.bankName}\nAddress: ${DEFAULT_BANK.address}\nRouting Number: ${DEFAULT_BANK.routingNumber}\nAccount Number: ${DEFAULT_BANK.accountNumber}`,
      })

      downloadInvoicePdf(data)
      toast.success('Invoice saved and downloaded!')
      router.refresh()
    } catch {
      toast.error('Failed to save invoice')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteInvoice = async (id: string) => {
    try {
      await deleteInvoice(id)
      toast.success('Invoice deleted')
      router.refresh()
    } catch {
      toast.error('Failed to delete invoice')
    }
  }

  const handleTogglePaid = async (id: string, currentPaid: boolean) => {
    try {
      await toggleInvoicePaid(id, !currentPaid)
      toast.success(!currentPaid ? 'Marked as paid' : 'Marked as unpaid')
      router.refresh()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleRedownload = (item: InvoiceHistoryItem) => {
    const [y, m, d] = item.invoice_date.split('-').map(Number)
    const data: InvoiceData = {
      senderName: item.sender_name,
      billTo: item.bill_to,
      invoiceNumber: item.invoice_number,
      invoiceDate: new Date(y, m - 1, d),
      dateRangeStr: item.date_range_str || '',
      items: item.items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        rate: i.rate,
      })),
      taxRate: item.tax_rate,
      bankDetails: DEFAULT_BANK,
    }
    downloadInvoicePdf(data)
    toast.success('Invoice re-downloaded!')
  }

  // Calculate totals for preview (using effective billable hours)
  const effectiveProjects = getEffectiveProjects()
  const totalActualHours = projects.reduce((sum, p) => sum + p.totalHours, 0)
  const totalBillableHours = effectiveProjects.reduce((sum, p) => sum + p.billableHours, 0)
  const subtotal = effectiveProjects.reduce((sum, p) => sum + p.billableHours * rate, 0)
  const total = subtotal
  const isCapped = maxBillableHours > 0 && totalActualHours > maxBillableHours

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      {/* Page Header */}
      <header className="animate-fade-in-up" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Generate Invoice</h2>
        <p className="text-muted" style={{ fontSize: '0.875rem' }}>
          Upload worklog Excel, review data, and generate PDF invoices.
        </p>
      </header>

      {/* Step Indicator */}
      <div className={`${styles.steps} animate-fade-in-up delay-1`}>
        {[
          { num: 1, label: 'Upload' },
          { num: 2, label: 'Review' },
          { num: 3, label: 'Preview' },
        ].map(s => (
          <button
            key={s.num}
            className={`${styles.step} ${step === s.num ? styles.active : ''} ${step > s.num ? styles.completed : ''}`}
            onClick={() => {
              if (s.num <= step || (s.num === 2 && parsedData) || (s.num === 3 && parsedData)) {
                setStep(s.num)
              }
            }}
            style={{ cursor: s.num <= step || parsedData ? 'pointer' : 'default', border: 'none' }}
          >
            <span className={styles.stepNumber}>
              {step > s.num ? '✓' : s.num}
            </span>
            {s.label}
          </button>
        ))}

        {fileName && (
          <span className={styles.fileBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {fileName}
          </span>
        )}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div
          className={`glass-card ${styles.uploadArea} ${isDragging ? styles.dragActive : ''} animate-fade-in-up delay-2`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleInputChange}
            className={styles.fileInput}
            id="file-upload"
          />
          <div className={styles.uploadIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className={styles.uploadTitle}>Drop your worklog Excel file here</p>
          <p className={styles.uploadHint}>or click to browse • Supports .xlsx, .xls</p>
        </div>
      )}

      {/* Step 2: Review & Configure */}
      {step === 2 && parsedData && (
        <div className="animate-fade-in-up delay-1">
          {/* Parsed Projects */}
          <div className={`glass-card ${styles.parsedCard}`}>
            <div className={styles.parsedHeader}>
              <h3 className={styles.parsedTitle}>Project Name Mapping</h3>
              <span className={styles.grandTotal}>
                {parsedData.grandTotalHours.toFixed(2)}h total
              </span>
            </div>
            {projects.map((p, i) => (
              <div key={i} className={styles.projectRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <span style={{ color: 'var(--outline)', fontSize: '0.85rem', minWidth: '120px' }}>{p.originalName}</span>
                  <span style={{ color: 'var(--outline)' }}>→</span>
                  <input
                    type="text"
                    value={p.displayName}
                    onChange={(e) => updateProjectName(i, e.target.value)}
                    className={styles.projectNameInput}
                  />
                </div>
                <span className={styles.projectHours}>{p.totalHours.toFixed(2)}h</span>
              </div>
            ))}
          </div>

          {/* Invoice Config */}
          <div className={`glass-card ${styles.formSection}`} style={{ padding: 'var(--space-5)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
              Invoice Details
            </h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Sender Name</label>
                <input
                  className={styles.formInput}
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Bill To</label>
                <input
                  className={styles.formInput}
                  value={billTo}
                  onChange={(e) => setBillTo(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Invoice #</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Invoice Date</label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Hourly Rate ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.formInput}
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Max Billable Hours (0 = no cap)</label>
                <input
                  type="number"
                  step="0.5"
                  className={styles.formInput}
                  value={maxBillableHours}
                  onChange={(e) => setMaxBillableHours(parseFloat(e.target.value) || 0)}
                  placeholder="0 = bill all hours"
                />
              </div>
            </div>

            {/* Billing Summary */}
            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--outline)' }}>Actual Hours</span>
                <span style={{ fontWeight: 600 }}>{totalActualHours.toFixed(2)}h</span>
              </div>
              {isCapped && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                  <span style={{ color: '#FACC15' }}>⚠ Capped to Max</span>
                  <span style={{ fontWeight: 600, color: '#FACC15' }}>{totalBillableHours.toFixed(2)}h</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ color: 'var(--outline)' }}>Estimated Total</span>
                <span style={{ color: 'var(--primary)' }}>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              ← Back
            </button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>
              Preview Invoice →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview & Download */}
      {step === 3 && parsedData && (
        <div className="animate-fade-in-up delay-1">
          {/* Live Preview */}
          <div className={styles.previewCard}>
            {/* Header */}
            <div className={styles.previewHeader}>
              <span className={styles.previewSender}>{senderName}</span>
              <div>
                <div className={styles.previewInvoiceLabel}>INVOICE</div>
                <div className={styles.previewInvoiceNum}># {invoiceNumber}</div>
              </div>
            </div>

            {/* Meta */}
            <div className={styles.previewMeta}>
              <div className={styles.previewMetaItem}>
                <span className={styles.previewMetaLabel}>Bill To</span>
                <span className={styles.previewMetaValue}>{billTo}</span>
              </div>
              <div className={styles.previewMetaItem}>
                <span className={styles.previewMetaLabel}>Date</span>
                <span className={styles.previewMetaValue}>
                  {(() => {
                    const [y, m, d] = invoiceDate.split('-').map(Number)
                    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  })()}
                </span>
              </div>
              <div className={styles.previewMetaItem}>
                <span className={styles.previewMetaLabel}>Balance Due</span>
                <span className={`${styles.previewMetaValue} ${styles.previewBalancePill}`}>
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Table */}
            <table className={styles.previewTable}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {effectiveProjects.map((p, i) => (
                  <tr key={i}>
                    <td>{p.displayName}</td>
                    <td>{p.billableHours.toFixed(2)}</td>
                    <td>${rate.toFixed(2)}</td>
                    <td>${(p.billableHours * rate).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className={styles.previewTotals}>
              <div className={styles.previewTotalRow}>
                <span className={styles.previewTotalLabel}>Subtotal</span>
                <span className={styles.previewTotalValue}>${subtotal.toFixed(2)}</span>
              </div>
              <div className={styles.previewTotalRow}>
                <span className={styles.previewTotalLabel}>Tax (0%)</span>
                <span className={styles.previewTotalValue}>$0.00</span>
              </div>
              <div className={`${styles.previewTotalRow} ${styles.previewTotalFinal}`}>
                <span className={styles.previewTotalLabel}>Total</span>
                <span className={styles.previewTotalValue}>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            <div className={styles.previewNotes}>
              <p className={styles.previewNotesTitle}>Notes</p>
              <p className={styles.previewNoteLine}>Bank Name: {DEFAULT_BANK.bankName}</p>
              <p className={styles.previewNoteLine}>Address: {DEFAULT_BANK.address}</p>
              <p className={styles.previewNoteLine}>Routing Number: {DEFAULT_BANK.routingNumber}</p>
              <p className={styles.previewNoteLine}>Account Number: {DEFAULT_BANK.accountNumber}</p>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>
              ← Edit
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveAndGenerate}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save & Download PDF'}
            </button>
            <button className="btn btn-ghost" onClick={handleGenerate}>
              Download Only
            </button>
          </div>
        </div>
      )}

      {/* Invoice History */}
      <section className={`${styles.historySection} animate-fade-in-up delay-3`}>
        <div className={styles.historyHeader}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Invoice History</h3>
          {invoiceHistory.length > 0 && (
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <span className={styles.grandTotal} style={{ background: 'rgba(72, 229, 208, 0.1)', color: '#48e5d0' }}>
                ${invoiceHistory.filter(i => i.is_paid).reduce((s, i) => s + i.total, 0).toFixed(2)} paid
              </span>
              <span className={styles.grandTotal} style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#FACC15' }}>
                ${invoiceHistory.filter(i => !i.is_paid).reduce((s, i) => s + i.total, 0).toFixed(2)} unpaid
              </span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {invoiceHistory.length === 0 && (
            <p className="text-muted" style={{ padding: '1rem' }}>No invoices generated yet.</p>
          )}
          {invoiceHistory.map(inv => (
            <div key={inv.id} className={`glass-card ${styles.historyCard}`}>
              <div className={styles.historyInfo}>
                <div className={styles.historyIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p className={styles.historyName}>Invoice #{inv.invoice_number}</p>
                    <span className={`badge ${inv.is_paid ? 'badge-success' : 'badge-info'}`}>
                      {inv.is_paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                  <p className={styles.historyMeta}>
                    {inv.sender_name} → {inv.bill_to} •{' '}
                    {(() => {
                      const [y, m, d] = inv.invoice_date.split('-').map(Number)
                      return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    })()}
                  </p>
                </div>
              </div>
              <div className={styles.historyRight}>
                <span className={styles.historyTotal}>${inv.total.toFixed(2)}</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleTogglePaid(inv.id, inv.is_paid)}
                  title={inv.is_paid ? 'Mark as unpaid' : 'Mark as paid'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={inv.is_paid ? '#48e5d0' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    {inv.is_paid && <polyline points="22 4 12 14.01 9 11.01" />}
                    {!inv.is_paid && <circle cx="12" cy="12" r="1" />}
                  </svg>
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleRedownload(inv)}
                  title="Re-download PDF"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDeleteInvoice(inv.id)}
                  title="Delete Invoice"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
