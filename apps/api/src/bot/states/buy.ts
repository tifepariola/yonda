import prisma from '../../lib/prisma';
import { ConversationState, DeliveryType, formatOrderRef } from '@yonda/shared';
import { calculateQuote } from '../../services/fx';
import { createPaymentLink } from '../../services/paystack';
import { getOrderTimeoutQueue } from '../../jobs/queue';
import getConfig from '../../config';
import type { StateHandler, StateResult } from './index';
import type { BotSessionData } from '@yonda/shared';
import {
  kycPendingMsg,
  kycSubmittedGateMsg,
  kycRejectedGateMsg,
  askAmountMsg,
  invalidAmountMsg,
  askDeliveryTypeMsg,
  askAlipayAccountMsg,
  askWechatAccountMsg,
  quoteConfirmMsg,
  paymentLinkMsg,
  orderCancelledMsg,
  textMsg,
  noRateConfiguredMsg,
} from '../messages/templates';

// ─── KYC Gate ────────────────────────────────────────────────────────────────

export const handleBuyInit: StateHandler = async (phone, _message, session): Promise<StateResult> => {
  const user = session.userId
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : await prisma.user.findUnique({ where: { whatsappPhone: phone } });

  if (!user || user.kycStatus === 'PENDING') {
    return {
      nextState: ConversationState.ONBOARDING_NAME,
      contextUpdates: {},
      messages: [kycPendingMsg(phone)],
    };
  }

  if (user.kycStatus === 'SUBMITTED') {
    return {
      nextState: ConversationState.IDLE,
      contextUpdates: {},
      messages: [kycSubmittedGateMsg(phone)],
    };
  }

  if (user.kycStatus === 'REJECTED') {
    return {
      nextState: ConversationState.ONBOARDING_BVN,
      contextUpdates: {},
      messages: [kycRejectedGateMsg(phone, user.kycRejectionReason ?? 'Verification failed')],
    };
  }

  // VERIFIED — show amount prompt
  const config = getConfig();
  try {
    const { calculateQuote: _q, getActiveRate } = await import('../../services/fx');
    const rate = await getActiveRate();
    return {
      nextState: ConversationState.BUY_ENTER_AMOUNT,
      contextUpdates: {},
      messages: [askAmountMsg(phone, rate.effectiveRateCnyToNgn, config.MIN_CNY_AMOUNT, config.MAX_CNY_AMOUNT)],
    };
  } catch {
    return {
      nextState: ConversationState.IDLE,
      contextUpdates: {},
      messages: [noRateConfiguredMsg(phone)],
    };
  }
};

// ─── Step 1: Amount Entry ─────────────────────────────────────────────────────

export const handleBuyEnterAmount: StateHandler = async (
  phone,
  message,
  session,
): Promise<StateResult> => {
  const config = getConfig();
  const raw = message.text?.trim().replace(/[,_\s]/g, '');
  const amount = raw ? parseFloat(raw) : NaN;

  if (
    isNaN(amount) ||
    amount < config.MIN_CNY_AMOUNT ||
    amount > config.MAX_CNY_AMOUNT
  ) {
    return {
      nextState: ConversationState.BUY_ENTER_AMOUNT,
      contextUpdates: {},
      messages: [invalidAmountMsg(phone, config.MIN_CNY_AMOUNT, config.MAX_CNY_AMOUNT)],
    };
  }

  const quote = await calculateQuote(amount);

  return {
    nextState: ConversationState.BUY_SELECT_DELIVERY,
    contextUpdates: {
      cnyAmount: quote.cnyAmount,
      ngnAmount: quote.ngnAmount,
      quoteRateId: quote.rateId,
      quotedRate: quote.exchangeRate,
    },
    messages: [askDeliveryTypeMsg(phone, quote.cnyAmount, quote.ngnAmount)],
  };
};

// ─── Step 2: Select Delivery Type ────────────────────────────────────────────

export const handleBuySelectDelivery: StateHandler = async (
  phone,
  message,
  session,
): Promise<StateResult> => {
  const buttonId = message.buttonId ?? message.text?.toUpperCase();
  let deliveryType: DeliveryType | undefined;

  if (buttonId === 'DELIVERY_ALIPAY' || buttonId === 'ALIPAY') {
    deliveryType = DeliveryType.ALIPAY;
  } else if (buttonId === 'DELIVERY_WECHAT' || buttonId === 'WECHAT' || buttonId === 'WECHAT_PAY') {
    deliveryType = DeliveryType.WECHAT_PAY;
  }

  if (!deliveryType) {
    return {
      nextState: ConversationState.BUY_SELECT_DELIVERY,
      contextUpdates: {},
      messages: [
        askDeliveryTypeMsg(
          phone,
          session.context.cnyAmount ?? 0,
          session.context.ngnAmount ?? 0,
        ),
      ],
    };
  }

  const msg =
    deliveryType === DeliveryType.ALIPAY ? askAlipayAccountMsg(phone) : askWechatAccountMsg(phone);

  return {
    nextState: ConversationState.BUY_ENTER_ACCOUNT_ID,
    contextUpdates: { deliveryType },
    messages: [msg],
  };
};

// ─── Step 3: Account ID ───────────────────────────────────────────────────────

export const handleBuyEnterAccountId: StateHandler = async (
  phone,
  message,
  session,
): Promise<StateResult> => {
  const accountId = message.text?.trim();

  if (!accountId || accountId.length < 3) {
    const msg =
      session.context.deliveryType === DeliveryType.ALIPAY
        ? askAlipayAccountMsg(phone)
        : askWechatAccountMsg(phone);
    return {
      nextState: ConversationState.BUY_ENTER_ACCOUNT_ID,
      contextUpdates: {},
      messages: [msg],
    };
  }

  const { cnyAmount, ngnAmount, quotedRate, deliveryType } = session.context;

  return {
    nextState: ConversationState.BUY_CONFIRM_QUOTE,
    contextUpdates: { deliveryAccountId: accountId },
    messages: [
      quoteConfirmMsg(
        phone,
        cnyAmount ?? 0,
        ngnAmount ?? 0,
        quotedRate ?? 0,
        deliveryType ?? 'ALIPAY',
        accountId,
      ),
    ],
  };
};

// ─── Step 4: Confirm Quote ────────────────────────────────────────────────────

export const handleBuyConfirmQuote: StateHandler = async (
  phone,
  message,
  session,
): Promise<StateResult> => {
  const buttonId = message.buttonId ?? message.listId ?? message.text?.toUpperCase();

  if (buttonId === 'CANCEL_ORDER' || buttonId === 'CANCEL') {
    return {
      nextState: ConversationState.IDLE,
      contextUpdates: {
        cnyAmount: undefined,
        ngnAmount: undefined,
        quoteRateId: undefined,
        quotedRate: undefined,
        deliveryType: undefined,
        deliveryAccountId: undefined,
      },
      messages: [orderCancelledMsg(phone)],
    };
  }

  if (buttonId !== 'CONFIRM_ORDER' && buttonId !== 'CONFIRM') {
    // Re-show the quote
    const { cnyAmount, ngnAmount, quotedRate, deliveryType, deliveryAccountId } = session.context;
    return {
      nextState: ConversationState.BUY_CONFIRM_QUOTE,
      contextUpdates: {},
      messages: [
        quoteConfirmMsg(
          phone,
          cnyAmount ?? 0,
          ngnAmount ?? 0,
          quotedRate ?? 0,
          deliveryType ?? 'ALIPAY',
          deliveryAccountId ?? '',
        ),
      ],
    };
  }

  // Get user from DB
  const user = session.userId
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : await prisma.user.findUnique({ where: { whatsappPhone: phone } });

  if (!user) {
    return {
      nextState: ConversationState.NEW,
      contextUpdates: {},
      messages: [textMsg(phone, `Something went wrong. Please start again by typing *MENU*.`)],
    };
  }

  const config = getConfig();
  const { cnyAmount, ngnAmount, quoteRateId, quotedRate, deliveryType, deliveryAccountId } =
    session.context;

  if (!cnyAmount || !ngnAmount || !quoteRateId || !quotedRate || !deliveryType || !deliveryAccountId) {
    return {
      nextState: ConversationState.IDLE,
      contextUpdates: {},
      messages: [textMsg(phone, `Something went wrong with your quote. Please start over by tapping *Buy RMB*.`)],
    };
  }

  // Re-calculate to get fresh rate snapshot at confirmation time
  const freshQuote = await calculateQuote(cnyAmount);

  const paymentExpiresAt = new Date(
    Date.now() + config.PAYMENT_LINK_TTL_HOURS * 60 * 60 * 1000,
  );

  // Create the order in DB
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      cnyAmount: freshQuote.cnyAmount,
      ngnAmount: freshQuote.ngnAmount,
      fxRateId: freshQuote.rateId,
      exchangeRate: freshQuote.exchangeRate,
      marginRate: freshQuote.marginRate,
      deliveryType,
      deliveryAccountId,
      status: 'PENDING_PAYMENT',
      paymentExpiresAt,
    },
  });

  // Generate Paystack payment link
  const { authorizationUrl, reference } = await createPaymentLink({
    orderId: order.id,
    userId: user.id,
    ngnAmount: freshQuote.ngnAmount,
    reference: order.id,
    phone,
  });

  // Store payment link on order
  await prisma.order.update({
    where: { id: order.id },
    data: { paystackRef: reference, paystackLink: authorizationUrl },
  });

  // Queue timeout job
  const timeoutQueue = getOrderTimeoutQueue();
  await timeoutQueue.add(
    'order-timeout',
    { orderId: order.id },
    { delay: config.PAYMENT_LINK_TTL_HOURS * 60 * 60 * 1000 },
  );

  const orderRef = formatOrderRef(order.id);

  return {
    nextState: ConversationState.BUY_AWAITING_PAYMENT,
    contextUpdates: {
      cnyAmount: undefined,
      ngnAmount: undefined,
      quoteRateId: undefined,
      quotedRate: undefined,
      deliveryType: undefined,
      deliveryAccountId: undefined,
    },
    messages: [paymentLinkMsg(phone, orderRef, freshQuote.ngnAmount, freshQuote.cnyAmount, authorizationUrl)],
  };
};
