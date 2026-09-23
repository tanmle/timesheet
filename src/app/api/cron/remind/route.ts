import { NextResponse } from 'next/server'
import { sendTelegramMessage } from '@/utils/telegram'

export async function GET(request: Request) {
  // Optional: Verify Vercel Cron Secret for security if configured
  const authHeader = request.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Calculate weeks since the start date (09/28/2026)
  const START_DATE = new Date('2026-09-28T00:00:00Z')
  const now = new Date()
  
  const diffTime = now.getTime() - START_DATE.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const diffWeeks = Math.floor(diffDays / 7)

  // Send reminder every 2 weeks (when diffWeeks is even)
  if (diffWeeks >= 0 && diffWeeks % 2 === 0) {
    const telegramMsg = `<b>🕒 Timesheet Reminder</b>\n\nIt's time to submit your bi-weekly timesheet.\n\nPlease reply directly to this message by uploading your <code>.xlsx</code> worklog file.\nI will automatically generate the PDF invoice for you.`
    await sendTelegramMessage(telegramMsg)
    return NextResponse.json({ success: true, message: 'Reminder sent' })
  }

  return NextResponse.json({ success: true, message: 'Skipped (not the right week)' })
}
