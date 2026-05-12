export interface NombaTokenResponse {
  code: string;
  description: string;
  data: {
    access_token: string;
    token_type: string;
    expires_in: number; // seconds
    scope: string;
  };
}

export interface NombaCreateOrderRequest {
  order: {
    orderReference?: string;
    customerId?: string;
    callbackUrl: string;
    customerEmail: string;
    amount: number; // in Naira (NGN)
    currency: string; // "NGN"
    allowedPaymentMethods?: string[];
    orderMetaData?: Record<string, string>;
  };
}

export interface NombaCreateOrderResponse {
  code: string;
  description: string;
  data: {
    orderReference: string;
    checkoutLink: string;
  };
}

export interface NombaWebhookPayload {
  event: string; // "payment_success"
  data: {
    orderReference: string;
    transactionReference: string;
    amount: number; // in Naira
    currency: string;
    status: string;
    paidAt: string;
    customer: {
      id: string;
      email?: string;
    };
    metadata?: Record<string, string>;
  };
}
