import { Router } from 'express';
import { whatsappWebhookRouter } from './webhooks/whatsapp';
import { paystackWebhookRouter } from './webhooks/paystack';
import { authRouter } from './admin/auth';
import { ordersRouter } from './admin/orders';
import { usersRouter } from './admin/users';
import { ratesRouter } from './admin/rates';

export const apiRouter = Router();

// Webhooks (public)
apiRouter.use('/webhooks/whatsapp', whatsappWebhookRouter);
apiRouter.use('/webhooks/paystack', paystackWebhookRouter);

// Admin API
apiRouter.use('/admin/auth', authRouter);
apiRouter.use('/admin/orders', ordersRouter);
apiRouter.use('/admin/users', usersRouter);
apiRouter.use('/admin/kyc', usersRouter); // re-use users router — KYC routes are prefixed /kyc/
apiRouter.use('/admin/rates', ratesRouter);
