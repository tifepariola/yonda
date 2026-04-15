import { Router, Request, Response } from 'express';
import getConfig from '../../config';
import logger from '../../lib/logger';
import { verifyHmacSha256 } from '../../lib/crypto';
import { handleIncomingMessage } from '../../bot/index';
import type {
  MetaWebhookPayload,
  MetaMessage,
  IncomingMessage,
} from '../../types/whatsapp';

export const whatsappWebhookRouter = Router();

// GET — Meta webhook verification (hub.challenge)
whatsappWebhookRouter.get('/', (req: Request, res: Response) => {
  const config = getConfig();
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.META_WHATSAPP_VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    logger.warn({ mode, token }, 'WhatsApp webhook verification failed');
    res.sendStatus(403);
  }
});

// POST — Incoming messages
whatsappWebhookRouter.post('/', async (req: Request, res: Response) => {
  // Always respond 200 immediately — Meta retries if it doesn't get a fast 200
  res.sendStatus(200);

  const config = getConfig();
  const signature = (req.headers['x-hub-signature-256'] as string | undefined)?.replace(
    'sha256=',
    '',
  );

  if (!signature) {
    logger.warn('Missing WhatsApp webhook signature');
    return;
  }

  // Verify signature (rawBody was captured by middleware in index.ts)
  const rawBody: Buffer = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body));
  const valid = verifyHmacSha256(config.META_WHATSAPP_APP_SECRET, rawBody, signature);
  if (!valid) {
    logger.warn('Invalid WhatsApp webhook signature');
    return;
  }

  const payload = req.body as MetaWebhookPayload;

  try {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value.messages?.length) continue;

        const contacts = value.contacts ?? [];

        for (const rawMsg of value.messages) {
          const contact = contacts.find((c) => c.wa_id === rawMsg.from);
          const incoming = parseMetaMessage(rawMsg, contact?.profile?.name ?? 'User');
          if (incoming) {
            handleIncomingMessage(incoming).catch((err) =>
              logger.error({ err, messageId: rawMsg.id }, 'Error handling incoming message'),
            );
          }
        }
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error processing WhatsApp webhook payload');
  }
});

function parseMetaMessage(msg: MetaMessage, senderName: string): IncomingMessage | null {
  const base = {
    messageId: msg.id,
    from: msg.from,
    senderName,
    rawTimestamp: msg.timestamp,
  };

  if (msg.type === 'text' && msg.text?.body) {
    return { ...base, type: 'text', text: msg.text.body };
  }

  if (msg.type === 'interactive') {
    if (msg.interactive?.type === 'button_reply' && msg.interactive.button_reply) {
      return {
        ...base,
        type: 'button',
        buttonId: msg.interactive.button_reply.id,
        text: msg.interactive.button_reply.title,
      };
    }
    if (msg.interactive?.type === 'list_reply' && msg.interactive.list_reply) {
      return {
        ...base,
        type: 'list',
        listId: msg.interactive.list_reply.id,
        text: msg.interactive.list_reply.title,
      };
    }
  }

  // Unsupported type — treat as empty text to trigger default/help
  logger.debug({ type: msg.type, from: msg.from }, 'Unsupported message type received');
  return null;
}
