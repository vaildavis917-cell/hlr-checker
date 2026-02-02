import { getSetting } from "./db";

const TELEGRAM_API_URL = "https://api.telegram.org/bot";

interface TelegramResponse {
  ok: boolean;
  description?: string;
  result?: any;
}

/**
 * Send a message via Telegram Bot API
 */
export async function sendTelegramMessage(
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<boolean> {
  const botToken = await getSetting("telegram_bot_token");
  const chatId = await getSetting("telegram_chat_id");
  
  if (!botToken || !chatId) {
    console.log("[Telegram] Bot token or chat ID not configured, skipping notification");
    return false;
  }
  
  try {
    const response = await fetch(`${TELEGRAM_API_URL}${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    });
    
    const data: TelegramResponse = await response.json();
    
    if (!data.ok) {
      console.error("[Telegram] Failed to send message:", data.description);
      return false;
    }
    
    console.log("[Telegram] Message sent successfully");
    return true;
  } catch (error) {
    console.error("[Telegram] Error sending message:", error);
    return false;
  }
}

/**
 * Send notification about new access request
 */
export async function notifyNewAccessRequest(
  name: string,
  telegram: string | null
): Promise<boolean> {
  const message = `🔔 <b>Новая заявка на доступ</b>

👤 <b>Имя:</b> ${escapeHtml(name)}
📱 <b>Telegram:</b> ${telegram ? escapeHtml(telegram) : "не указан"}

<i>Перейдите в панель администратора для обработки заявки.</i>`;

  return sendTelegramMessage(message);
}

/**
 * Test Telegram bot configuration
 */
export async function testTelegramConnection(
  botToken: string,
  chatId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: "✅ Тестовое сообщение от HLR Checker. Уведомления настроены успешно!",
        parse_mode: "HTML",
      }),
    });
    
    const data: TelegramResponse = await response.json();
    
    if (!data.ok) {
      return { success: false, message: data.description || "Unknown error" };
    }
    
    return { success: true, message: "Тестовое сообщение отправлено успешно" };
  } catch (error) {
    return { success: false, message: `Connection error: ${error}` };
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
