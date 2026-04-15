import prisma from '../../lib/prisma';
import { encrypt } from '../../lib/crypto';
import type { StateHandler, StateResult } from './index';
import { ConversationState } from '@yonda/shared';
import {
  askBvnMsg,
  kycSubmittedMsg,
  invalidBvnMsg,
  textMsg,
} from '../messages/templates';

const BVN_REGEX = /^\d{11}$/;

export const handleOnboardingName: StateHandler = async (
  phone,
  message,
  session,
): Promise<StateResult> => {
  const name = message.text?.trim();

  if (!name || name.length < 2) {
    return {
      nextState: ConversationState.ONBOARDING_NAME,
      contextUpdates: {},
      messages: [textMsg(phone, `Please send your *full name* to continue.`)],
    };
  }

  return {
    nextState: ConversationState.ONBOARDING_BVN,
    contextUpdates: { collectedName: name },
    messages: [askBvnMsg(phone, name)],
  };
};

export const handleOnboardingBvn: StateHandler = async (
  phone,
  message,
  session,
): Promise<StateResult> => {
  const bvn = message.text?.trim().replace(/\s/g, '');
  const retryCount = session.context.retryCount ?? 0;

  if (!bvn || !BVN_REGEX.test(bvn)) {
    if (retryCount >= 2) {
      return {
        nextState: ConversationState.ONBOARDING_BVN,
        contextUpdates: { retryCount: retryCount + 1 },
        messages: [
          textMsg(
            phone,
            `❌ Still not quite right. A BVN is *exactly 11 digits* — no letters or spaces.\n\nExample: *22198765432*\n\nIf you're having trouble, type *HELP* to contact support.`,
          ),
        ],
      };
    }
    return {
      nextState: ConversationState.ONBOARDING_BVN,
      contextUpdates: { retryCount: retryCount + 1 },
      messages: [invalidBvnMsg(phone)],
    };
  }

  const name = session.context.collectedName ?? 'User';

  // Create or update user in DB
  const encryptedBvn = encrypt(bvn);
  await prisma.user.upsert({
    where: { whatsappPhone: phone },
    create: {
      whatsappPhone: phone,
      name,
      bvn: encryptedBvn,
      kycStatus: 'SUBMITTED',
    },
    update: {
      name,
      bvn: encryptedBvn,
      kycStatus: 'SUBMITTED',
      kycRejectionReason: null,
    },
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { whatsappPhone: phone } });

  return {
    nextState: ConversationState.IDLE,
    contextUpdates: { collectedName: undefined, collectedBvn: undefined, retryCount: undefined },
    messages: [kycSubmittedMsg(phone)],
  };
};
