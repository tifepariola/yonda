import getConfig from '../config';
import logger from '../lib/logger';
import type {
  OutgoingMessage,
  TextMessage,
  InteractiveButtonMessage,
  InteractiveListMessage,
} from '../types/whatsapp';

const BASE_URL = 'https://graph.facebook.com/v19.0';

async function call(endpoint: string, body: object): Promise<void> {
  const config = getConfig();
  const url = `${BASE_URL}/${config.META_WHATSAPP_PHONE_NUMBER_ID}/${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.META_WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    logger.error({ status: res.status, body: text }, 'WhatsApp API error');
    throw new Error(`WhatsApp API error ${res.status}: ${text}`);
  }
}

export async function sendTextMessage(to: string, body: string): Promise<void> {
  await call('messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body },
  });
}

export async function sendInteractiveButtons(
  to: string,
  body: string,
  buttons: Array<{ id: string; title: string }>,
  options?: { header?: string; footer?: string },
): Promise<void> {
  await call('messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      ...(options?.header ? { header: { type: 'text', text: options.header } } : {}),
      body: { text: body },
      ...(options?.footer ? { footer: { text: options.footer } } : {}),
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  });
}

export async function sendInteractiveList(
  to: string,
  body: string,
  buttonLabel: string,
  sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>,
  options?: { header?: string; footer?: string },
): Promise<void> {
  await call('messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      ...(options?.header ? { header: { type: 'text', text: options.header } } : {}),
      body: { text: body },
      ...(options?.footer ? { footer: { text: options.footer } } : {}),
      action: {
        button: buttonLabel,
        sections,
      },
    },
  });
}

export async function markMessageRead(messageId: string): Promise<void> {
  await call('messages', {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  });
}

export async function sendOutgoingMessage(msg: OutgoingMessage): Promise<void> {
  switch (msg.type) {
    case 'text':
      return sendTextMessage(msg.to, msg.body);
    case 'interactive_buttons':
      return sendInteractiveButtons(msg.to, msg.body, msg.buttons, {
        header: msg.header,
        footer: msg.footer,
      });
    case 'interactive_list':
      return sendInteractiveList(msg.to, msg.body, msg.buttonLabel, msg.sections, {
        header: msg.header,
        footer: msg.footer,
      });
  }
}
