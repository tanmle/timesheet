import jsPDF from 'jspdf'
import { CVData } from '@/app/(dashboard)/cv/types'

export function generateCVPdf(data: CVData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const pageHeight = 297
  const marginX = 16
  const marginTop = 16
  const marginBottom = 16
  const contentWidth = pageWidth - marginX * 2 // 178mm
  const titleColWidth = 38 // left column for section headers
  const rightColX = marginX + titleColWidth + 2 // 56mm
  const rightColWidth = contentWidth - titleColWidth - 2 // 138mm

  // Standard sub-columns in Experience:
  // Date period column: x = 56mm, width = 30mm
  // Details column: x = 88mm, width = 106mm
  const periodX = rightColX
  const periodWidth = 30
  const detailX = rightColX + periodWidth + 2 // 88mm
  const detailWidth = rightColWidth - periodWidth - 2 // 106mm

  let y = marginTop

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - marginBottom) {
      doc.addPage()
      y = marginTop
      return true
    }
    return false
  }

  // ── Colors ──
  const COLOR_NAVY = [27, 54, 93] as const // #1B365D - primary header blue
  const COLOR_DARK = [15, 23, 42] as const // #0F172A - dark heading
  const COLOR_BODY = [51, 65, 85] as const // #334155 - clean readable text
  const COLOR_MUTED = [100, 116, 139] as const // #64748B - dates & subtitles

  // ── 1. Header ──
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLOR_NAVY)
  doc.text(data.fullName || 'Your Full Name', marginX, y + 6)
  y += 12

  doc.setFontSize(10.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLOR_BODY)
  doc.text(data.jobTitle || 'Professional Title', marginX, y)
  y += 5

  // Header Divider
  doc.setDrawColor(...COLOR_NAVY)
  doc.setLineWidth(0.6)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 8

  // Helper for rendering section header on the left column
  const renderSectionTitle = (title: string, startY: number) => {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLOR_NAVY)
    const titleLines = doc.splitTextToSize(title.toUpperCase(), titleColWidth - 4)
    doc.text(titleLines, marginX, startY)
  }

  // ── 2. Contact Information ──
  const contactLines: { label: string; value: string }[] = []
  if (data.contact?.email) contactLines.push({ label: 'Email:', value: data.contact.email })
  if (data.contact?.address) contactLines.push({ label: 'Address:', value: data.contact.address })
  if (data.contact?.phone) contactLines.push({ label: 'Phone:', value: data.contact.phone })
  if (data.contact?.linkedin) contactLines.push({ label: 'LinkedIn:', value: data.contact.linkedin })
  if (data.contact?.website) contactLines.push({ label: 'Website:', value: data.contact.website })

  if (contactLines.length > 0) {
    checkPageBreak(contactLines.length * 4.5 + 4)
    renderSectionTitle('CONTACT INFORMATION', y)

    contactLines.forEach((item) => {
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLOR_DARK)
      doc.text(item.label, rightColX, y)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...COLOR_BODY)
      doc.text(item.value, rightColX + 18, y)
      y += 4.2
    })
    y += 5
  }

  // ── 3. Objective ──
  if (data.objective && data.objective.trim()) {
    checkPageBreak(20)
    renderSectionTitle('OBJECTIVE', y)

    // IMPORTANT: Reset to normal font immediately so text is NOT bold!
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLOR_BODY)

    const paragraphs = data.objective.trim().split('\n\n')
    paragraphs.forEach((p, idx) => {
      const cleanP = p.trim().replace(/\n/g, ' ')
      const objLines = doc.splitTextToSize(cleanP, rightColWidth)
      checkPageBreak(objLines.length * 3.8 + 2)
      doc.text(objLines, rightColX, y)
      y += objLines.length * 3.8 + (idx < paragraphs.length - 1 ? 3 : 5)
    })
  }

  // ── 4. Experience ──
  if (data.experiences && data.experiences.length > 0) {
    checkPageBreak(25)
    renderSectionTitle('EXPERIENCE', y)

    data.experiences.forEach((exp) => {
      checkPageBreak(16)

      // Period (Left sub-column)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLOR_MUTED)
      const periodLines = doc.splitTextToSize(exp.period || '', periodWidth - 2)
      doc.text(periodLines, periodX, y)

      // Role (Bold)
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLOR_DARK)
      doc.text(exp.role || 'Role', detailX, y)
      y += 4

      // Company
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(71, 85, 105)
      doc.text(exp.company || 'Company', detailX, y)
      y += 4

      // Top-level Highlights
      if (exp.highlights && exp.highlights.length > 0) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...COLOR_BODY)

        exp.highlights.forEach((hl) => {
          const bulletLines = doc.splitTextToSize(hl, detailWidth - 4)
          checkPageBreak(bulletLines.length * 3.6 + 2)
          doc.text('•', detailX, y)
          doc.text(bulletLines, detailX + 3.5, y)
          y += bulletLines.length * 3.6 + 1
        })
      }

      // Sub-projects (nested inside company like LogiGear)
      if (exp.subProjects && exp.subProjects.length > 0) {
        y += 3
        checkPageBreak(12)

        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COLOR_NAVY)
        doc.text('Client Projects & Engagements:', detailX, y)
        y += 4.5

        const subIndentX = detailX + 3.5
        const subWidth = detailWidth - 4

        exp.subProjects.forEach((sp) => {
          checkPageBreak(14)
          const startY = y - 1

          // Line 1: Client/Project Name (Bold) — Role (Navy) (Period in Muted)
          doc.setFontSize(8.5)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...COLOR_DARK)

          let titleText = sp.clientOrProject
          if (sp.role) {
            titleText += ` — ${sp.role}`
          }
          if (sp.period) {
            titleText += ` (${sp.period})`
          }

          const titleLines = doc.splitTextToSize(titleText, subWidth)
          checkPageBreak(titleLines.length * 3.8 + 2)
          doc.text(titleLines, subIndentX, y)
          y += titleLines.length * 3.8 + 0.5

          // Sub-project highlights
          if (sp.highlights && sp.highlights.length > 0) {
            doc.setFontSize(7.8)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(...COLOR_BODY)
            sp.highlights.forEach((hl) => {
              const bLines = doc.splitTextToSize(hl, subWidth - 4)
              checkPageBreak(bLines.length * 3.4 + 2)
              doc.text('•', subIndentX, y)
              doc.text(bLines, subIndentX + 3, y)
              y += bLines.length * 3.4 + 0.8
            })
          }

          // Sub-project tech environment
          if (sp.technicalTools || sp.trackingTools || sp.developmentProcess) {
            doc.setFontSize(7.5)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(71, 85, 105)

            const spEnv: string[] = []
            if (sp.technicalTools) spEnv.push(`Technical tools: ${sp.technicalTools}`)
            if (sp.trackingTools) spEnv.push(`Tracking: ${sp.trackingTools}`)
            if (sp.developmentProcess) spEnv.push(`Process: ${sp.developmentProcess}`)

            spEnv.forEach((item) => {
              const envL = doc.splitTextToSize(item, subWidth - 4)
              checkPageBreak(envL.length * 3.2 + 2)
              doc.text('•', subIndentX, y)
              doc.text(envL, subIndentX + 3, y)
              y += envL.length * 3.2 + 0.8
            })
          }

          // Draw vertical guide line on the left to clearly show nesting
          doc.setDrawColor(203, 213, 225) // #CBD5E1
          doc.setLineWidth(0.4)
          doc.line(detailX + 1, startY, detailX + 1, y - 1)

          y += 3
        })
      }

      // Standalone Project Details (if any)
      if (exp.projectDetails && exp.projectDetails.length > 0) {
        checkPageBreak(8)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COLOR_DARK)
        doc.text('Project Details:', detailX, y)
        y += 3.5

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...COLOR_BODY)
        exp.projectDetails.forEach((pd) => {
          const pdLines = doc.splitTextToSize(pd, detailWidth - 4)
          checkPageBreak(pdLines.length * 3.6 + 2)
          doc.text('•', detailX, y)
          doc.text(pdLines, detailX + 3.5, y)
          y += pdLines.length * 3.6 + 1
        })
      }

      // Standalone Technical Environment (if any)
      if (exp.technicalTools || exp.trackingTools || exp.developmentProcess) {
        checkPageBreak(8)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COLOR_DARK)
        doc.text('Technical Environment :', detailX, y)
        y += 3.5

        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...COLOR_BODY)

        const envItems: string[] = []
        if (exp.technicalTools) envItems.push(`Technical tools : ${exp.technicalTools}`)
        if (exp.trackingTools) envItems.push(`Test case/Issue tracking tool : ${exp.trackingTools}`)
        if (exp.developmentProcess) envItems.push(`Development process : ${exp.developmentProcess}`)

        envItems.forEach((item) => {
          const envLines = doc.splitTextToSize(item, detailWidth - 4)
          checkPageBreak(envLines.length * 3.6 + 2)
          doc.text('•', detailX, y)
          doc.text(envLines, detailX + 3.5, y)
          y += envLines.length * 3.6 + 1
        })
      }

      y += 4
    })
    y += 2
  }

  // ── 5. Education ──
  if (data.educations && data.educations.length > 0) {
    checkPageBreak(20)
    renderSectionTitle('EDUCATION', y)

    data.educations.forEach((edu) => {
      checkPageBreak(10)

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLOR_MUTED)
      doc.text(edu.period || '', periodX, y)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLOR_DARK)
      doc.text(edu.degree || '', detailX, y)
      y += 3.8

      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(71, 85, 105)
      doc.text(edu.school || '', detailX, y)
      y += 5.5
    })
    y += 3
  }

  // ── 6. Achievements / Skills ──
  const hasPrimary = data.skills?.primary && data.skills.primary.length > 0
  const hasSecondary = data.skills?.secondary && data.skills.secondary.length > 0

  if (hasPrimary || hasSecondary) {
    checkPageBreak(20)
    renderSectionTitle('ACHIEVEMENTS', y)

    if (hasPrimary) {
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLOR_DARK)
      doc.text('Primary Skills:', rightColX, y)
      y += 4

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...COLOR_BODY)
      data.skills.primary.forEach((sk) => {
        const skLines = doc.splitTextToSize(sk, rightColWidth - 4)
        checkPageBreak(skLines.length * 3.6 + 2)
        doc.text('•', rightColX, y)
        doc.text(skLines, rightColX + 3.5, y)
        y += skLines.length * 3.6 + 1
      })
      y += 3
    }

    if (hasSecondary) {
      checkPageBreak(12)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLOR_DARK)
      doc.text('Secondary Skills:', rightColX, y)
      y += 4

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...COLOR_BODY)
      data.skills.secondary.forEach((sk) => {
        const skLines = doc.splitTextToSize(sk, rightColWidth - 4)
        checkPageBreak(skLines.length * 3.6 + 2)
        doc.text('•', rightColX, y)
        doc.text(skLines, rightColX + 3.5, y)
        y += skLines.length * 3.6 + 1
      })
      y += 3
    }
    y += 2
  }

  // ── 7. Certifications & Courses ──
  if (data.certifications && data.certifications.length > 0) {
    checkPageBreak(16)
    renderSectionTitle('CERTIFICATIONS & COURSES', y)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLOR_BODY)

    data.certifications.forEach((cert) => {
      const certLines = doc.splitTextToSize(cert, rightColWidth - 4)
      checkPageBreak(certLines.length * 3.6 + 2)
      doc.text('•', rightColX, y)
      doc.text(certLines, rightColX + 3.5, y)
      y += certLines.length * 3.6 + 1
    })
  }

  return doc
}

export function downloadCVPdf(data: CVData, customTitle?: string): void {
  const doc = generateCVPdf(data)
  const baseName = (customTitle || data.fullName || 'Resume')
    .trim()
    .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_')
    .replace(/_+/g, '_')
  const filename = `${baseName}_CV.pdf`
  doc.save(filename)
}
