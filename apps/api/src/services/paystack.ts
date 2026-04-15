import getConfig from '../config';
import logger from '../lib/logger';
import type { PaystackInitializeRequest, PaystackInitializeResponse } from '../types/paystack';

const BASE_URL = 'https://api.paystack.co';

async function call<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: object,
): Promise<T> {
  const config = getConfig();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = (await res.json()) as T & { status?: boolean; message?: string };
  if (!res.ok || (json as { status?: boolean }).status === false) {
    logger.error({ status: res.status, json }, 'Paystack API error');
    throw new Error(`Paystack API error: ${(json as { message?: string }).message ?? res.status}`);
  }
  return json;
}

export interface PaymentLink {
  authorizationUrl: string;
  reference: string;
}

/**
 * Create a Paystack payment link for an order.
 * amount is in Naira (we convert to kobo internally).
 */
export async function createPaymentLink(params: {
  orderId: string;
  userId: string;
  ngnAmount: number;
  reference: string;
  phone: string;
}): Promise<PaymentLink> {
  const { orderId, userId, ngnAmount, reference, phone } = params;

  const body: PaystackInitializeRequest = {
    // Paystack requires an email; we use a synthetic one from the phone
    email: `${phone.replace('+', '')}@yonda.pay`,
    amount: Math.round(ngnAmount * 100), // kobo
    reference,
    metadata: {
      orderId,
      userId,
      custom_fields: [
        { display_name: 'Order ID', variable_name: 'order_id', value: orderId },
        { display_name: 'Customer Phone', variable_name: 'phone', value: phone },
      ],
    },
  };

  const result = await call<PaystackInitializeResponse>('POST', '/transaction/initialize', body);
  return {
    authorizationUrl: result.data.authorization_url,
    reference: result.data.reference,
  };
}
