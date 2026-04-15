export interface PaystackInitializeRequest {
  email: string;
  amount: number; // in kobo
  reference: string;
  callback_url?: string;
  metadata?: {
    orderId: string;
    userId: string;
    custom_fields?: Array<{
      display_name: string;
      variable_name: string;
      value: string;
    }>;
  };
}

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackWebhookPayload {
  event: string;
  data: PaystackTransaction;
}

export interface PaystackTransaction {
  id: number;
  status: string;
  reference: string;
  amount: number; // in kobo
  currency: string;
  paid_at: string;
  customer: {
    email: string;
    phone?: string;
  };
  metadata?: {
    orderId?: string;
    userId?: string;
  };
}
