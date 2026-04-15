import prisma from '../../lib/prisma';
import type { StateHandler, StateResult } from './index';
import { ConversationState } from '@yonda/shared';
import { orderHistoryMsg, noOrdersMsg } from '../messages/templates';
import { formatOrderRef } from '@yonda/shared';

export const handleOrderHistory: StateHandler = async (
  phone,
  _message,
  session,
): Promise<StateResult> => {
  const user = session.userId
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : await prisma.user.findUnique({ where: { whatsappPhone: phone } });

  if (!user) {
    return {
      nextState: ConversationState.IDLE,
      contextUpdates: {},
      messages: [noOrdersMsg(phone)],
    };
  }

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  if (orders.length === 0) {
    return {
      nextState: ConversationState.IDLE,
      contextUpdates: {},
      messages: [noOrdersMsg(phone)],
    };
  }

  const formatted = orders.map((o: typeof orders[0]) => ({
    ref: formatOrderRef(o.id),
    cnyAmount: Number(o.cnyAmount),
    status: o.status,
    createdAt: o.createdAt,
  }));

  return {
    nextState: ConversationState.IDLE,
    contextUpdates: {},
    messages: [orderHistoryMsg(phone, formatted)],
  };
};
