import getConfig from '../config';
import logger from '../lib/logger';
import type {
  NombaTokenResponse,
  NombaCreateOrderRequest,
  NombaCreateOrderResponse,
} from '../types/nomba';

// Use sandbox in development, production otherwise
function getBaseUrl(): string {
  const config = getConfig();
  return config.NODE_ENV === 'production'
    ? 'https://api.nomba.com'
    : 'https://sandbox.nomba.com';
}

// In-memory token cache
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const config = getConfig();
  if (!config.NOMBA_CLIENT_ID || !config.NOMBA_CLIENT_SECRET || !config.NOMBA_ACCOUNT_ID) {
    throw new Error('Nomba credentials not configured (NOMBA_CLIENT_ID, NOMBA_CLIENT_SECRET, NOMBA_ACCOUNT_ID)');
  }

  const res = await fetch(`${getBaseUrl()}/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: config.NOMBA_CLIENT_ID,
      client_secret: config.NOMBA_CLIENT_SECRET,
      account_id: config.NOMBA_ACCOUNT_ID,
    }),
  });

  const json = (await res.json()) as NombaTokenResponse;
  if (!res.ok || json.code !== '00') {
    logger.error({ status: res.status, json }, 'Nomba auth error');
    throw new Error(`Nomba auth error: ${json.description ?? res.status}`);
  }

  // Cache with 60s buffer before actual expiry
  cachedToken = {
    value: json.data.access_token,
    expiresAt: Date.now() + (json.data.expires_in - 60) * 1000,
  };

  return cachedToken.value;
}

async function call<T>(method: 'GET' | 'POST', path: string, body?: object): Promise<T> {
  const token = await getAccessToken();
  const config = getConfig();

  const res = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(config.NOMBA_ACCOUNT_ID ? { 'accountId': config.NOMBA_ACCOUNT_ID } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const json = (await res.json()) as T & { code?: string; description?: string };
  if (!res.ok || (json as { code?: string }).code !== '00') {
    logger.error({ status: res.status, json }, 'Nomba API error');
    throw new Error(`Nomba API error: ${(json as { description?: string }).description ?? res.status}`);
  }

  return json;
}

export interface NombaPaymentLink {
  checkoutLink: string;
  orderReference: string;
}

export async function createNombaCheckout(params: {
  orderId: string;
  userId: string;
  ngnAmount: number;
  orderReference: string;
  phone: string;
  callbackUrl?: string;
}): Promise<NombaPaymentLink> {
  const { orderId, userId, ngnAmount, orderReference, phone, callbackUrl } = params;

  const body: NombaCreateOrderRequest = {
    orderReference,
    customerId: phone.replace('+', ''),
    amount: ngnAmount,
    currency: 'NGN',
    ...(callbackUrl ? { callbackUrl } : {}),
    metadata: {
      orderId,
      userId,
      phone,
    },
  };

  const result = await call<NombaCreateOrderResponse>('POST', '/v1/checkout/order', body);

  return {
    checkoutLink: result.data.checkoutLink,
    orderReference: result.data.orderReference,
  };
}
