export async function sendTelegramMessage(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    console.warn('Telegram credentials missing. Skipping notification.')
    return
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Telegram API Error:', errorData)
    }
  } catch (error) {
    console.error('Failed to send Telegram message:', error)
  }
}
