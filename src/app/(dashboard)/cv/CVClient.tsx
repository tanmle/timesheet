'use client'

import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import styles from './page.module.css'
import { CVData, CVRecord } from './types'
import { TAN_LE_SAMPLE_CV } from './sampleData'
import CVEditor from './CVEditor'
import CVPreview from './CVPreview'
import { saveCV, deleteCV } from './actions'
import { downloadCVPdf } from '@/utils/generateCVPdf'

interface CVClientProps {
  initialCVs: CVRecord[]
}

const LOCAL_STORAGE_KEY = 'antigravity_cv_records_cache'

export default function CVClient({ initialCVs }: CVClientProps) {
  const [cvList, setCvList] = useState<CVRecord[]>(initialCVs)
  const [activeId, setActiveId] = useState<string | null>(
    initialCVs.length > 0 ? initialCVs[0].id : null
  )
  const [cvTitle, setCvTitle] = useState<string>(
    initialCVs.length > 0 ? initialCVs[0].title : 'Tan Le - Senior QA'
  )
  const [cvData, setCvData] = useState<CVData>(
    initialCVs.length > 0 ? initialCVs[0].data : TAN_LE_SAMPLE_CV
  )
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split')
  const [isSaving, setIsSaving] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync with localStorage on client
  useEffect(() => {
    try {
      if (initialCVs.length === 0) {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (cached) {
          const parsed: CVRecord[] = JSON.parse(cached)
          if (parsed && parsed.length > 0) {
            setCvList(parsed)
            setActiveId(parsed[0].id)
            setCvTitle(parsed[0].title)
            setCvData(parsed[0].data)
          }
        }
      }
    } catch (e) {
      console.error('Failed to load CV cache from localStorage', e)
    }
  }, [initialCVs])

  const handleSelectCV = (record: CVRecord) => {
    setActiveId(record.id)
    setCvTitle(record.title)
    setCvData(record.data)
    toast.success(`Loaded "${record.title}"`)
  }

  const handleNewCV = () => {
    setActiveId(null)
    setCvTitle('New Resume')
    setCvData({
      fullName: '',
      jobTitle: '',
      contact: { email: '', phone: '', address: '' },
      objective: '',
      experiences: [],
      educations: [],
      skills: { primary: [], secondary: [] },
      certifications: [],
    })
    setViewMode('edit')
    toast.info('Created a new blank CV')
  }

  const handleLoadSample = () => {
    setActiveId(null)
    setCvTitle('Tan Le - Senior QA (Full Template)')
    setCvData(TAN_LE_SAMPLE_CV)
    toast.success('Loaded full Tan Le template (16 experiences from 2012 to Present)')
  }

  const handleSave = async () => {
    if (!cvTitle.trim()) {
      toast.error('Please enter a CV name')
      return
    }

    setIsSaving(true)
    try {
      const res = await saveCV(cvTitle, cvData, activeId || undefined)
      const recordId = res.id || activeId || 'local-' + Date.now()

      const newRecord: CVRecord = {
        id: recordId,
        title: cvTitle,
        data: cvData,
        updated_at: new Date().toISOString(),
      }

      // Update state
      const updatedList = [
        newRecord,
        ...cvList.filter((c) => c.id !== recordId && c.id !== activeId),
      ]
      setCvList(updatedList)
      setActiveId(recordId)

      // Cache to local storage
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList))
      } catch (err) {
        console.warn('Storage quota', err)
      }

      if (res.success) {
        toast.success('CV saved to database successfully!')
      } else {
        toast.info(
          'Saved to local storage. (Run the migration to sync with Supabase!)'
        )
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save CV')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return

    try {
      await deleteCV(id)
      const updatedList = cvList.filter((c) => c.id !== id)
      setCvList(updatedList)
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList))
      } catch (err) {}

      if (activeId === id) {
        if (updatedList.length > 0) {
          handleSelectCV(updatedList[0])
        } else {
          handleNewCV()
        }
      }
      toast.success(`Deleted "${title}"`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete')
    }
  }

  // 1. Separate Print function: In trực tiếp qua máy in/hộp thoại in của browser
  const handlePrint = () => {
    window.print()
  }

  // 2. Separate PDF Export function: Tải file PDF trực tiếp về máy
  const handleDownloadPDF = () => {
    try {
      setIsExportingPdf(true)
      downloadCVPdf(cvData, cvTitle)
      toast.success('CV PDF downloaded successfully!')
    } catch (err: any) {
      console.error('PDF generation error:', err)
      toast.error(err?.message || 'Failed to export PDF')
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify({ title: cvTitle, data: cvData }, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${cvTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_cv.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported CV to JSON file')
  }

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const parsed = JSON.parse(content)
        if (parsed.data && parsed.title) {
          setCvTitle(parsed.title)
          setCvData(parsed.data)
          setActiveId(null)
          toast.success(`Imported "${parsed.title}" successfully!`)
        } else if (parsed.fullName) {
          setCvData(parsed)
          setActiveId(null)
          toast.success('Imported CV data successfully!')
        } else {
          toast.error('Invalid CV JSON format')
        }
      } catch (err) {
        toast.error('Failed to parse JSON file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className={styles.container}>
      {/* Top Header - Always hidden when printing */}
      <header className={`${styles.header} ${styles.noPrint} no-print animate-fade-in-up`}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>CV Builder &amp; Manager</h1>
            <p className={styles.subtitle}>
              Create, customize, and export professional CVs using the Tan Le template.
            </p>
          </div>

          <div className={`${styles.headerActions} no-print`}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleLoadSample}
              title="Reset or load the original Tan Le template"
            >
              📄 Load Sample
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleNewCV}
            >
              + Blank CV
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleExportJSON}
              title="Download JSON backup"
            >
              Export JSON
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => fileInputRef.current?.click()}
              title="Import JSON backup"
            >
              Import JSON
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".json"
              onChange={handleImportJSON}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : '💾 Save CV'}
            </button>

            {/* Chức năng 1: Tải PDF trực tiếp */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDownloadPDF}
              disabled={isExportingPdf}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#fff',
              }}
              title="Tải file PDF trực tiếp về máy"
            >
              {isExportingPdf ? 'Exporting...' : '📥 Tải PDF'}
            </button>

            {/* Chức năng 2: In CV (máy in hoặc preview in sạch không dính web) */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePrint}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
              }}
              title="In CV ra máy in"
            >
              🖨️ In CV
            </button>
          </div>
        </div>
      </header>

      {/* Saved CVs Bar (if any saved) */}
      {cvList.length > 0 && (
        <section className={`${styles.cvListSection} ${styles.noPrint} no-print`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Your Saved CVs ({cvList.length})</h3>
          </div>
          <div className={styles.cvGrid}>
            {cvList.map((item) => (
              <div
                key={item.id}
                className={`${styles.cvCard} ${activeId === item.id ? styles.cvCardActive : ''}`}
                onClick={() => handleSelectCV(item)}
                style={{ cursor: 'pointer' }}
              >
                <div>
                  <div className={styles.cvCardTitle}>{item.title}</div>
                  <div className={styles.cvCardMeta}>
                    {item.data?.fullName || 'Untitled'} • {item.data?.jobTitle || 'No title'}
                  </div>
                </div>
                <div className={styles.cvCardActions}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    onClick={() => handleSelectCV(item)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`${styles.btnIconSmall} ${styles.btnDanger}`}
                    style={{ marginLeft: 'auto' }}
                    onClick={(e) => handleDelete(item.id, item.title, e)}
                    title="Delete CV"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* View Mode Tabs (Split / Edit / Preview) */}
      <div className={`${styles.viewTabs} ${styles.noPrint} no-print`}>
        <button
          type="button"
          className={`${styles.viewTab} ${viewMode === 'split' ? styles.active : ''}`}
          onClick={() => setViewMode('split')}
        >
          ◫ Side-by-Side (Split)
        </button>
        <button
          type="button"
          className={`${styles.viewTab} ${viewMode === 'edit' ? styles.active : ''}`}
          onClick={() => setViewMode('edit')}
        >
          ✏️ Edit Only
        </button>
        <button
          type="button"
          className={`${styles.viewTab} ${viewMode === 'preview' ? styles.active : ''}`}
          onClick={() => setViewMode('preview')}
        >
          👁️ Template Preview Only
        </button>
      </div>

      {/* Main Content Area */}
      {viewMode === 'split' && (
        <div className={styles.splitLayout}>
          <div className={`${styles.noPrint} no-print`}>
            <CVEditor
              cvTitle={cvTitle}
              setCvTitle={setCvTitle}
              data={cvData}
              onChange={setCvData}
            />
          </div>
          <div className={styles.previewWrapper}>
            <CVPreview data={cvData} />
          </div>
        </div>
      )}

      {viewMode === 'edit' && (
        <>
          <div className={`${styles.singleLayout} ${styles.noPrint} no-print`}>
            <CVEditor
              cvTitle={cvTitle}
              setCvTitle={setCvTitle}
              data={cvData}
              onChange={setCvData}
            />
          </div>
          {/* Always have printable CV in DOM for window.print() even in Edit mode */}
          <div className={styles.printableOnly}>
            <CVPreview data={cvData} />
          </div>
        </>
      )}

      {viewMode === 'preview' && (
        <div className={styles.singleLayout}>
          <div className={styles.previewWrapper}>
            <CVPreview data={cvData} />
          </div>
        </div>
      )}
    </div>
  )
}
