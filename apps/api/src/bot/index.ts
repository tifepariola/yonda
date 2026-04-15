/**
 * Main bot message router.
 * Receives a parsed IncomingMessage, loads session, dispatches to state handler,
 * saves updated session, sends outgoing messages.
 */
import prisma from '../lib/prisma';
import logger from '../lib/logger';
import {
  getSession,
  saveSession,
  newSession,
  markMessageProcessed,
} from './session';
import { sendOutgoingMessage, markMessageRead } from '../services/whatsapp';
import { ConversationState } from '@yonda/shared';
import type { BotSessionData } from '@yonda/shared';
import type { IncomingMessage, OutgoingMessage } from '../types/whatsapp';
import type { StateResult } from './states/index';

// State handlers
import { handleNew } from './states/welcome';
import { handleOnboardingName, handleOnboardingBvn } from './states/onboarding';
import { handleIdle } from './states/menu';
import { handleRateCheck } from './states/rate-check';
import { handleOrderHistory } from './states/order-history';
import {
  handleBuyInit,
  handleBuyEnterAmount,
  handleBuySelectDelivery,
  handleBuyEnterAccountId,
  handleBuyConfirmQuote,
} from './states/buy';
import {
  mainMenuMsg,
  helpMsg,
  blockedMsg,
  textMsg,
} from './messages/templates';

// ─── Global Command Overrides ─────────────────────────────────────────────────

const GLOBAL_COMMANDS = new Set(['MENU', 'HI', 'HELLO', 'START']);
const CANCEL_COMMANDS = new Set(['CANCEL', 'STOP', 'QUIT', 'X']);
const HELP_COMMANDS = new Set(['HELP', '?', 'SUPPORT']);
const STATUS_PREFIX = 'STATUS ';

async function handleGlobalCommand(
  phone: string,
  message: IncomingMessage,
  session: BotSessionData,
): Promise<StateResult | null> {
  const text = (message.text ?? message.buttonId ?? message.listId ?? '').trim().toUpperCase();

  if (CANCEL_COMMANDS.has(text)) {
    const user = session.userId
      ? await prisma.user.findUnique({ where: { id: session.userId } })
      : null;
    const name = user?.name ?? 'there';
    return {
      nextState: ConversationState.IDLE,
      contextUpdates: {
        cnyAmount: undefined,
        ngnAmount: undefined,
        quoteRateId: undefined,
        quotedRate: undefined,
        deliveryType: undefined,
        deliveryAccountId: undefined,
        retryCount: undefined,
      },
      messages: [mainMenuMsg(phone, name)],
    };
  }

  if (HELP_COMMANDS.has(text)) {
    return {
      nextState: session.state,
      contextUpdates: {},
      messages: [helpMsg(phone)],
    };
  }

  if (GLOBAL_COMMANDS.has(text)) {
    const user = session.userId
      ? await prisma.user.findUnique({ where: { id: session.userId } })
      : await prisma.user.findUnique({ where: { whatsappPhone: phone } });
    const name = user?.name ?? 'there';
    return {
      nextState: ConversationState.IDLE,
      contextUpdates: {},
      messages: [mainMenuMsg(phone, name)],
    };
  }

  if (text.startsWith(STATUS_PREFIX)) {
    const ref = text.slice(STATUS_PREFIX.length).trim();
    return handleStatusCheck(phone, ref, session);
  }

  // Route interactive button/list IDs to appropriate handlers
  const interactiveId = (message.buttonId ?? message.listId ?? '').toUpperCase();

  if (interactiveId === 'BUY_RMB') {
    return null; // Let the state machine handle it via IDLE dispatch
  }

  if (interactiveId === 'CHECK_RATE') {
    return null;
  }

  if (interactiveId === 'MY_ORDERS') {
    return null;
  }

  if (interactiveId === 'RESUBMIT_BVN') {
    return {
      nextState: ConversationState.ONBOARDING_BVN,
      contextUpdates: {},
      messages: [textMsg(phone, `Please send your *BVN* (11-digit number):`)],
    };
  }

  return null;
}

async function handleStatusCheck(
  phone: string,
  ref: string,
  session: BotSessionData,
): Promise<StateResult> {
  const user = session.userId
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : await prisma.user.findUnique({ where: { whatsappPhone: phone } });

  if (!user) {
    return {
      nextState: session.state,
      contextUpdates: {},
      messages: [textMsg(phone, `No account found. Type *MENU* to get started.`)],
    };
  }

  const order = await prisma.order.findFirst({
    where: {
      userId: user.id,
      OR: [{ orderRef: { contains: ref.toLowerCase() } }, { id: { contains: ref.toLowerCase() } }],
    },
  });

  if (!order) {
    return {
      nextState: session.state,
      contextUpdates: {},
      messages: [textMsg(phone, `Order *${ref}* not found. Check the order ID and try again.`)],
    };
  }

  const STATUS_LABELS: Record<string, string> = {
    PENDING_PAYMENT: '⏳ Awaiting payment',
    PAID: '💳 Payment confirmed',
    PROCESSING: '🔄 Processing delivery',
    DELIVERED: '✅ Delivered',
    FAILED: '❌ Delivery failed',
    CANCELLED: '🚫 Cancelled',
    REFUNDED: '↩️ Refunded',
  };

  const statusLabel = STATUS_LABELS[order.status] ?? order.status;
  return {
    nextState: session.state,
    contextUpdates: {},
    messages: [
      textMsg(
        phone,
        `📋 *Order Status*\n\nOrder: *YND-${order.id.slice(0, 8).toUpperCase()}*\nAmount: ¥${Number(order.cnyAmount).toLocaleString()} RMB\nStatus: ${statusLabel}\nDate: ${order.createdAt.toLocaleDateString('en-NG')}`,
      ),
    ],
  };
}

// ─── State Dispatch Map ───────────────────────────────────────────────────────

type HandlerFn = (
  phone: string,
  message: IncomingMessage,
  session: BotSessionData,
) => Promise<StateResult>;

function getHandlerForInteractive(
  interactiveId: string,
  state: ConversationState,
): HandlerFn | null {
  if (interactiveId === 'BUY_RMB') return handleBuyInit;
  if (interactiveId === 'CHECK_RATE') return handleRateCheck;
  if (interactiveId === 'MY_ORDERS') return handleOrderHistory;
  if (interactiveId === 'HELP') return async (p, m, s) => ({ nextState: s.state, contextUpdates: {}, messages: [helpMsg(p)] });
  return null;
}

function getStateHandler(state: ConversationState): HandlerFn {
  switch (state) {
    case ConversationState.NEW:
      return handleNew;
    case ConversationState.ONBOARDING_NAME:
      return handleOnboardingName;
    case ConversationState.ONBOARDING_BVN:
      return handleOnboardingBvn;
    case ConversationState.IDLE:
      return handleIdle;
    case ConversationState.BUY_ENTER_AMOUNT:
      return handleBuyEnterAmount;
    case ConversationState.BUY_SELECT_DELIVERY:
      return handleBuySelectDelivery;
    case ConversationState.BUY_ENTER_ACCOUNT_ID:
      return handleBuyEnterAccountId;
    case ConversationState.BUY_CONFIRM_QUOTE:
      return handleBuyConfirmQuote;
    case ConversationState.BUY_AWAITING_PAYMENT:
      // If user messages while awaiting payment, remind them
      return async (phone, _msg, _session) => ({
        nextState: ConversationState.BUY_AWAITING_PAYMENT,
        contextUpdates: {},
        messages: [textMsg(phone, `⏳ Your payment is still pending. Complete it using the link we sent, or type *CANCEL* to cancel.`)],
      });
    default:
      return handleIdle;
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function handleIncomingMessage(message: IncomingMessage): Promise<void> {
  const { from: phone, messageId } = message;

  // 1. Deduplication
  const isDuplicate = await markMessageProcessed(messageId);
  if (isDuplicate) {
    logger.info({ messageId }, 'Duplicate message, skipping');
    return;
  }

  // 2. Mark as read (fire and forget)
  markMessageRead(messageId).catch((err) =>
    logger.warn({ err, messageId }, 'Failed to mark message read'),
  );

  // 3. Load or create session
  let session = await getSession(phone);
  if (!session) {
    // Check if user already exists in DB (returning user with expired session)
    const existingUser = await prisma.user.findUnique({ where: { whatsappPhone: phone } });
    if (existingUser) {
      session = {
        state: ConversationState.IDLE,
        userId: existingUser.id,
        context: {},
        lastActivityAt: new Date().toISOString(),
      };
    } else {
      session = newSession();
    }
  }

  // 4. Check if user is blocked
  if (session.userId) {
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (user?.isBlocked) {
      await sendOutgoingMessage(blockedMsg(phone));
      return;
    }
  }

  // 5. Check global command overrides
  let result = await handleGlobalCommand(phone, message, session);

  // 6. Check if interactive button maps to a specific handler
  if (!result) {
    const interactiveId = (message.buttonId ?? message.listId ?? '').toUpperCase();
    if (interactiveId) {
      const handler = getHandlerForInteractive(interactiveId, session.state);
      if (handler) {
        result = await handler(phone, message, session);
      }
    }
  }

  // 7. Dispatch to state handler
  if (!result) {
    const handler = getStateHandler(session.state);
    result = await handler(phone, message, session);
  }

  // 8. Update session
  const updatedSession: BotSessionData = {
    ...session,
    state: result.nextState,
    context: { ...session.context, ...result.contextUpdates },
    lastActivityAt: new Date().toISOString(),
  };
  await saveSession(phone, updatedSession);

  // 9. Sync BotSession audit log to DB (best effort)
  if (updatedSession.userId) {
    prisma.botSession
      .upsert({
        where: { userId: updatedSession.userId },
        create: {
          userId: updatedSession.userId,
          state: updatedSession.state,
          context: updatedSession.context as object,
        },
        update: {
          state: updatedSession.state,
          context: updatedSession.context as object,
        },
      })
      .catch((err: unknown) => logger.warn({ err }, 'Failed to sync BotSession audit log'));
  }

  // 10. Send outgoing messages
  for (const msg of result.messages) {
    try {
      await sendOutgoingMessage(msg);
    } catch (err) {
      logger.error({ err, to: msg.to, type: msg.type }, 'Failed to send WhatsApp message');
    }
  }

  logger.info(
    { phone, prevState: session.state, nextState: result.nextState },
    'Message processed',
  );
}
