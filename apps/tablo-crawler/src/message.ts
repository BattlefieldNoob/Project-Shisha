export interface MessageService {
  send(text: string): Promise<void> | void;
}

export class ConsoleMessageService implements MessageService {
  async send(text: string) { console.log(text); }
}

export class TelegramMessageService implements MessageService {
  constructor(private token: string, private chatId: string) {}
  async send(text: string) {
    const url = new URL(`https://api.telegram.org/bot${this.token}/sendMessage`);
    const res = await fetch(url, { method: "POST", headers: {"content-type":"application/json"}, body: JSON.stringify({ chat_id: this.chatId, text }) });
    if (!res.ok) console.warn("Telegram send failed", await res.text());
  }
}
