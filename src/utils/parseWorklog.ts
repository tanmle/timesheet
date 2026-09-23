import * as XLSX from 'xlsx'

/**
 * Duration string parser.
 * Converts Clockify-style durations like "1w 3d 2h 10m" to decimal hours.
 *
 * Conversion rules:
 * - 1w = 40 hours (5 working days × 8h)
 * - 1d = 8 hours
 * - 1h = 1 hour
 * - 1m = 1/60 hour
 */
export function parseDuration(duration: string): number {
  if (!duration || duration.trim() === '') return 0

  let totalMinutes = 0
  const str = duration.trim().toLowerCase()

  const weekMatch = str.match(/(\d+)\s*w/)
  const dayMatch = str.match(/(\d+)\s*d/)
  const hourMatch = str.match(/(\d+)\s*h/)
  const minMatch = str.match(/(\d+)\s*m/)

  if (weekMatch) totalMinutes += parseInt(weekMatch[1]) * 40 * 60
  if (dayMatch) totalMinutes += parseInt(dayMatch[1]) * 8 * 60
  if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60
  if (minMatch) totalMinutes += parseInt(minMatch[1])

  return totalMinutes / 60
}

export type ParsedProject = {
  name: string
  totalHours: number
}

export type ParsedWorklog = {
  user: string
  projects: ParsedProject[]
  grandTotalHours: number
}

/**
 * Parse a Clockify worklog Excel file.
 *
 * Expected columns: User, Project, Issues, Total, [date columns...]
 * We extract rows where Issues === "Total" and Project !== "Total" as per-project summaries.
 */
export function parseWorklogExcel(data: ArrayBuffer): ParsedWorklog[] {
  const workbook = XLSX.read(data, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  if (rows.length === 0) return []

  // Group by user
  const userMap = new Map<string, ParsedProject[]>()

  for (const row of rows) {
    const user = (row['User'] || '').toString().trim()
    const project = (row['Project'] || '').toString().trim()
    const issues = (row['Issues'] || '').toString().trim()
    const total = (row['Total'] || '').toString().trim()

    // We only care about project totals (Issues = "Total", Project != "Total")
    if (issues === 'Total' && project !== 'Total' && user !== 'Summary') {
      const hours = parseDuration(total)

      if (!userMap.has(user)) {
        userMap.set(user, [])
      }
      userMap.get(user)!.push({ name: project, totalHours: hours })
    }
  }

  const results: ParsedWorklog[] = []
  for (const [user, projects] of userMap) {
    const grandTotal = projects.reduce((sum, p) => sum + p.totalHours, 0)
    results.push({ user, projects, grandTotalHours: grandTotal })
  }

  return results
}
