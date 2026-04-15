import prisma from '../../lib/prisma';
import type { StateHandler, StateResult } from './index';
import { ConversationState } from '@yonda/shared';
import { mainMenuMsg } from '../messages/templates';

export const handleIdle: StateHandler = async (phone, message, session): Promise<StateResult> => {
  const user = session.userId
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : await prisma.user.findUnique({ where: { whatsappPhone: phone } });

  const name = user?.name ?? 'there';

  return {
    nextState: ConversationState.IDLE,
    contextUpdates: {},
    messages: [mainMenuMsg(phone, name)],
  };
};
