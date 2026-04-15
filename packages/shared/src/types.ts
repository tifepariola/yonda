// Shared enums mirrored from Prisma — keep in sync with schema.prisma

export enum KycStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum DeliveryType {
  ALIPAY = 'ALIPAY',
  WECHAT_PAY = 'WECHAT_PAY',
}

export enum ConversationState {
  NEW = 'NEW',
  ONBOARDING_NAME = 'ONBOARDING_NAME',
  ONBOARDING_BVN = 'ONBOARDING_BVN',
  IDLE = 'IDLE',
  BUY_ENTER_AMOUNT = 'BUY_ENTER_AMOUNT',
  BUY_SELECT_DELIVERY = 'BUY_SELECT_DELIVERY',
  BUY_ENTER_ACCOUNT_ID = 'BUY_ENTER_ACCOUNT_ID',
  BUY_CONFIRM_QUOTE = 'BUY_CONFIRM_QUOTE',
  BUY_AWAITING_PAYMENT = 'BUY_AWAITING_PAYMENT',
}

export interface BotSessionContext {
  cnyAmount?: number;
  ngnAmount?: number;
  deliveryType?: DeliveryType;
  deliveryAccountId?: string;
  quoteRateId?: string;
  quotedRate?: number;
  collectedName?: string;
  collectedBvn?: string;
  retryCount?: number;
}

export interface BotSessionData {
  state: ConversationState;
  userId?: string;
  context: BotSessionContext;
  lastActivityAt: string; // ISO timestamp
}

export const ORDER_REF_PREFIX = 'YND';

export function formatOrderRef(id: string): string {
  return `${ORDER_REF_PREFIX}-${id.slice(0, 8).toUpperCase()}`;
}
