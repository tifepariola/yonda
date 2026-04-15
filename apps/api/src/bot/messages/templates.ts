/**
 * Message template builders.
 * All message text lives here — keep business logic out.
 */
import type {
  OutgoingMessage,
  TextMessage,
  InteractiveButtonMessage,
  InteractiveListMessage,
} from '../../types/whatsapp';

export function textMsg(to: string, body: string): TextMessage {
  return { type: 'text', to, body };
}

export function buttonsMsg(
  to: string,
  body: string,
  buttons: Array<{ id: string; title: string }>,
  options?: { header?: string; footer?: string },
): InteractiveButtonMessage {
  return { type: 'interactive_buttons', to, body, buttons, ...options };
}

export function listMsg(
  to: string,
  body: string,
  buttonLabel: string,
  sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>,
  options?: { header?: string; footer?: string },
): InteractiveListMessage {
  return { type: 'interactive_list', to, body, buttonLabel, sections, ...options };
}

// ─── Welcome ─────────────────────────────────────────────────────────────────

export function welcomeMsg(to: string): OutgoingMessage {
  return textMsg(
    to,
    `👋 Welcome to *Yonda*!\n\nYonda lets you buy Chinese Yuan (RMB) with Naira, fast and securely.\n\nTo get started, we need to set up your account. What's your *full name*?`,
  );
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

export function askBvnMsg(to: string, name: string): OutgoingMessage {
  return textMsg(
    to,
    `Nice to meet you, *${name}*! 🎉\n\nFor compliance, we need your *Bank Verification Number (BVN)*.\nYour BVN is an 11-digit number linked to your bank account.\n\n🔒 Your BVN is encrypted and stored securely. It will only be used for identity verification.\n\nPlease send your *BVN* now:`,
  );
}

export function kycSubmittedMsg(to: string): OutgoingMessage {
  return buttonsMsg(
    to,
    `✅ *Verification Submitted!*\n\nOur compliance team will review your account within a few hours. You'll receive a message here once you're verified.\n\nIn the meantime, check today's exchange rate!`,
    [{ id: 'CHECK_RATE', title: '📊 Check Rate' }],
  );
}

export function invalidBvnMsg(to: string): OutgoingMessage {
  return textMsg(
    to,
    `❌ That doesn't look like a valid BVN. A BVN is exactly *11 digits*.\n\nPlease try again:`,
  );
}

// ─── Main Menu ───────────────────────────────────────────────────────────────

export function mainMenuMsg(to: string, name: string): OutgoingMessage {
  return listMsg(
    to,
    `👋 Hi *${name}*! What would you like to do today?`,
    'Open Menu',
    [
      {
        title: 'Transactions',
        rows: [
          { id: 'BUY_RMB', title: '💱 Buy RMB', description: 'Buy Chinese Yuan with Naira' },
          { id: 'CHECK_RATE', title: '📊 Check Rate', description: "Today's NGN/RMB rate" },
          { id: 'MY_ORDERS', title: '📋 My Orders', description: 'View your order history' },
        ],
      },
      {
        title: 'Support',
        rows: [{ id: 'HELP', title: '❓ Help', description: 'Get support' }],
      },
    ],
  );
}

export function helpMsg(to: string): OutgoingMessage {
  return buttonsMsg(
    to,
    `❓ *Yonda Help*\n\nHere's what you can do:\n• *Buy RMB* — Purchase Chinese Yuan with Naira\n• *Check Rate* — See today's exchange rate\n• *My Orders* — View your past orders\n\nFor support, contact us on WhatsApp: +234-xxx-xxxx\n\nYou can also type:\n• *MENU* — Return to main menu\n• *CANCEL* — Cancel current action\n• *STATUS [order ID]* — Check order status`,
    [{ id: 'BUY_RMB', title: '💱 Buy RMB' }],
  );
}

// ─── KYC Gates ───────────────────────────────────────────────────────────────

export function kycPendingMsg(to: string): OutgoingMessage {
  return textMsg(
    to,
    `⚠️ Your account hasn't been set up yet. Please complete verification first.\n\nWhat's your *full name*?`,
  );
}

export function kycSubmittedGateMsg(to: string): OutgoingMessage {
  return buttonsMsg(
    to,
    `⏳ Your account is still under review by our compliance team.\n\nWe'll notify you here as soon as you're verified (usually within a few hours).`,
    [{ id: 'CHECK_RATE', title: '📊 Check Rate' }],
  );
}

export function kycRejectedGateMsg(to: string, reason: string): OutgoingMessage {
  return buttonsMsg(
    to,
    `❌ Unfortunately, your KYC verification was not successful.\n\n*Reason:* ${reason}\n\nPlease re-submit your BVN to try again, or contact support.`,
    [{ id: 'RESUBMIT_BVN', title: 'Re-submit BVN' }],
  );
}

export function blockedMsg(to: string): OutgoingMessage {
  return textMsg(
    to,
    `🚫 Your account has been restricted. Please contact support for assistance.`,
  );
}

// ─── Buy Flow ────────────────────────────────────────────────────────────────

export function askAmountMsg(
  to: string,
  effectiveRate: number,
  min: number,
  max: number,
): OutgoingMessage {
  return textMsg(
    to,
    `💱 *Buy RMB — Step 1 of 4*\n\nToday's rate: *1 CNY = ₦${effectiveRate.toFixed(2)}*\n\nHow many *Chinese Yuan (RMB)* would you like to buy?\nMinimum: ¥${min.toLocaleString()} | Maximum: ¥${max.toLocaleString()}\n\nJust send the amount in numbers. Example: *500*`,
  );
}

export function invalidAmountMsg(to: string, min: number, max: number): OutgoingMessage {
  return textMsg(
    to,
    `❌ Please enter an amount between ¥${min.toLocaleString()} and ¥${max.toLocaleString()}.\n\nHow much RMB would you like to buy?`,
  );
}

export function askDeliveryTypeMsg(to: string, cnyAmount: number, ngnAmount: number): OutgoingMessage {
  return buttonsMsg(
    to,
    `💳 *Buy RMB — Step 2 of 4*\n\nYou want to buy *¥${cnyAmount.toLocaleString()} RMB*\nYou'll pay: *₦${ngnAmount.toLocaleString()}*\n\nWhere should we send your RMB?`,
    [
      { id: 'DELIVERY_ALIPAY', title: '📱 Alipay' },
      { id: 'DELIVERY_WECHAT', title: '💬 WeChat Pay' },
    ],
  );
}

export function askAlipayAccountMsg(to: string): OutgoingMessage {
  return textMsg(
    to,
    `📱 *Buy RMB — Step 3 of 4*\n\nPlease send your *Alipay account ID*.\nThis is usually your Chinese phone number or email address registered with Alipay.\n\nExample: *+8613812345678* or *user@email.com*`,
  );
}

export function askWechatAccountMsg(to: string): OutgoingMessage {
  return textMsg(
    to,
    `💬 *Buy RMB — Step 3 of 4*\n\nPlease send your *WeChat ID* or the phone number linked to your WeChat Pay account.\n\nExample: *wxid_abc123xyz* or *+8613812345678*`,
  );
}

export function quoteConfirmMsg(
  to: string,
  cnyAmount: number,
  ngnAmount: number,
  rate: number,
  deliveryType: string,
  accountId: string,
): OutgoingMessage {
  const deliveryLabel = deliveryType === 'ALIPAY' ? 'Alipay' : 'WeChat Pay';
  return buttonsMsg(
    to,
    `✅ *Buy RMB — Step 4 of 4 — Confirm Your Order*\n\n━━━━━━━━━━━━━━━━━━━━━━\n📦 Order Summary\n━━━━━━━━━━━━━━━━━━━━━━\nYou receive:   *¥${cnyAmount.toLocaleString()} RMB*\nYou pay:       *₦${ngnAmount.toLocaleString()}*\nRate:          *1 CNY = ₦${rate.toFixed(2)}*\nDelivery to:   *${deliveryLabel}*\nAccount:       *${accountId}*\n━━━━━━━━━━━━━━━━━━━━━━\n⏱ This quote is valid for *15 minutes*\n\nReady to proceed?`,
    [
      { id: 'CONFIRM_ORDER', title: '✅ Confirm & Pay' },
      { id: 'CANCEL_ORDER', title: '❌ Cancel' },
    ],
  );
}

export function paymentLinkMsg(
  to: string,
  orderRef: string,
  ngnAmount: number,
  cnyAmount: number,
  paymentUrl: string,
): OutgoingMessage {
  return textMsg(
    to,
    `🎉 *Order Created!*\n\n*Order ID:* ${orderRef}\n*Amount:* ₦${ngnAmount.toLocaleString()}\n\n👇 Complete your payment here:\n${paymentUrl}\n\n⏰ Payment link expires in *2 hours*.\n\nOnce payment is confirmed, we'll send your ¥${cnyAmount.toLocaleString()} RMB within 30 minutes.`,
  );
}

export function orderCancelledMsg(to: string): OutgoingMessage {
  return buttonsMsg(
    to,
    `No problem! Your order has been cancelled.\nCome back anytime to buy RMB. 👋`,
    [{ id: 'BUY_RMB', title: '💱 Buy RMB' }],
  );
}

// ─── Rate Check ──────────────────────────────────────────────────────────────

export function rateMsg(to: string, effectiveRate: number, baseRate: number, marginPct: number): OutgoingMessage {
  const margin = (marginPct * 100).toFixed(1);
  return buttonsMsg(
    to,
    `📊 *Current Exchange Rate*\n\n*1 CNY = ₦${effectiveRate.toFixed(2)}*\n_(Base rate: ₦${baseRate.toFixed(2)} + ${margin}% margin)_\n\n💡 *Quick calculator:*\n¥100  = ₦${(100 * effectiveRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}\n¥500  = ₦${(500 * effectiveRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}\n¥1,000 = ₦${(1000 * effectiveRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    [{ id: 'BUY_RMB', title: '💱 Buy RMB Now' }],
  );
}

export function noRateConfiguredMsg(to: string): OutgoingMessage {
  return textMsg(to, `⚠️ Exchange rate is currently unavailable. Please check back soon.`);
}

// ─── Order History ────────────────────────────────────────────────────────────

const ORDER_STATUS_EMOJI: Record<string, string> = {
  PENDING_PAYMENT: '⏳',
  PAID: '💳',
  PROCESSING: '🔄',
  DELIVERED: '✅',
  FAILED: '❌',
  CANCELLED: '🚫',
  REFUNDED: '↩️',
};

export function orderHistoryMsg(
  to: string,
  orders: Array<{ ref: string; cnyAmount: number; status: string; createdAt: Date }>,
): OutgoingMessage {
  const lines = orders
    .map((o) => {
      const emoji = ORDER_STATUS_EMOJI[o.status] ?? '•';
      const date = o.createdAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
      return `─────────────────────────\n*${o.ref}* • ¥${Number(o.cnyAmount).toLocaleString()}\nStatus: ${emoji} ${o.status.replace(/_/g, ' ')}\nDate: ${date}`;
    })
    .join('\n');

  return buttonsMsg(
    to,
    `📋 *Your Recent Orders*\n\n${lines}\n─────────────────────────\n\nNeed help with an order? Type *HELP*`,
    [{ id: 'BUY_RMB', title: '💱 Buy RMB' }],
  );
}

export function noOrdersMsg(to: string): OutgoingMessage {
  return buttonsMsg(
    to,
    `📋 You haven't made any orders yet.\n\nReady to buy your first RMB? 🇨🇳`,
    [{ id: 'BUY_RMB', title: '💱 Buy RMB Now' }],
  );
}
