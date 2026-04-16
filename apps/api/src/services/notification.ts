/**
 * Push WhatsApp notifications to users triggered by backend events
 * (Paystack webhooks, admin actions, etc.)
 */
import { sendTextMessage, sendInteractiveButtons } from './whatsapp';
import { ConversationState, formatOrderRef } from '@yonda/shared';
import type { Order, User } from '@prisma/client';
import { saveSession } from '../bot/session';

type OrderWithUser = Order & { user: User };

export async function notifyPaymentReceived(order: OrderWithUser): Promise<void> {
  const ref = formatOrderRef(order.id);
  const deliveryLabel = order.deliveryType === 'ALIPAY' ? 'Alipay' : 'WeChat Pay';
  await saveSession(order.user.whatsappPhone, {
    state: ConversationState.IDLE,
    context: {},
    lastActivityAt: new Date().toISOString(),
  });
  await sendTextMessage(
    order.user.whatsappPhone,
    `✅ *Payment Received!*\n\n` +
      `We've confirmed your payment of ₦${Number(order.ngnAmount).toLocaleString()}.\n\n` +
      `*Order:* ${ref}\n` +
      `*Delivering:* ¥${Number(order.cnyAmount).toLocaleString()} RMB → ${deliveryLabel}\n` +
      `*Account:* ${order.deliveryAccountId}\n\n` +
      `⏱ Delivery within 30 minutes. We'll notify you when it's done!`,
  );
}

export async function notifyOrderDelivered(order: OrderWithUser): Promise<void> {
  const ref = formatOrderRef(order.id);
  const deliveryLabel = order.deliveryType === 'ALIPAY' ? 'Alipay' : 'WeChat Pay';

  await sendInteractiveButtons(
    order.user.whatsappPhone,
    `🎉 *RMB Delivered!*\n\n` +
      `Your ¥${Number(order.cnyAmount).toLocaleString()} RMB has been sent to your ${deliveryLabel} account.\n\n` +
      `*Order:* ${ref}\n*Account:* ${order.deliveryAccountId}\n\n` +
      `Thank you for using Yonda! 🇨🇳`,
    [{ id: 'BUY_RMB', title: 'Buy More RMB' }],
  );
}

export async function notifyKycApproved(user: User): Promise<void> {
  await sendInteractiveButtons(
    user.whatsappPhone,
    `✅ *Account Verified!*\n\n` +
      `Great news, ${user.name ?? 'there'}! Your identity has been verified.\n\n` +
      `You can now buy RMB. Ready to get started?`,
    [{ id: 'BUY_RMB', title: 'Buy RMB Now' }],
  );
}

export async function notifyKycRejected(user: User, reason: string): Promise<void> {
  await sendInteractiveButtons(
    user.whatsappPhone,
    `❌ *Verification Failed*\n\n` +
      `Unfortunately, we could not verify your identity.\n\n` +
      `*Reason:* ${reason}\n\n` +
      `Please re-submit your BVN to try again or contact support.`,
    [{ id: 'RESUBMIT_BVN', title: 'Re-submit BVN' }],
  );
}

export async function notifyPaymentExpired(order: OrderWithUser): Promise<void> {
  const ref = formatOrderRef(order.id);

  await sendInteractiveButtons(
    order.user.whatsappPhone,
    `⏰ *Order Expired*\n\n` +
      `Your order ${ref} has expired because payment was not completed.\n\n` +
      `No worries — you can start a new order anytime.`,
    [{ id: 'BUY_RMB', title: 'Buy RMB Again' }],
  );
}
