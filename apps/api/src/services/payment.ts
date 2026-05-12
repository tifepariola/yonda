import prisma from '../lib/prisma';
import { createPaymentLink } from './paystack';
import { createNombaCheckout } from './nomba';
import getConfig from '../config';

export type PaymentGateway = 'paystack' | 'nomba';

export interface UnifiedPaymentLink {
  gateway: PaymentGateway;
  checkoutUrl: string;
  /** gateway-specific reference stored on the Order */
  reference: string;
}

export async function getActiveGateway(): Promise<PaymentGateway> {
  const setting = await prisma.appConfig.findUnique({ where: { key: 'payment_gateway' } });
  const value = setting?.value ?? 'paystack';
  return value === 'nomba' ? 'nomba' : 'paystack';
}

export async function setActiveGateway(gateway: PaymentGateway): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key: 'payment_gateway' },
    create: { key: 'payment_gateway', value: gateway },
    update: { value: gateway },
  });
}

export async function createPayment(params: {
  orderId: string;
  userId: string;
  ngnAmount: number;
  reference: string;
  phone: string;
}): Promise<UnifiedPaymentLink> {
  const gateway = await getActiveGateway();
  const config = getConfig();

  if (gateway === 'nomba') {
    const callbackUrl = `${config.APP_URL}/payment/success`;
    const result = await createNombaCheckout({
      ...params,
      orderReference: params.reference,
      callbackUrl,
    });
    return {
      gateway: 'nomba',
      checkoutUrl: result.checkoutLink,
      reference: result.orderReference,
    };
  }

  // Default: Paystack
  const result = await createPaymentLink(params);
  return {
    gateway: 'paystack',
    checkoutUrl: result.authorizationUrl,
    reference: result.reference,
  };
}
