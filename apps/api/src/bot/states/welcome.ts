import type { StateHandler, StateResult } from './index';
import { ConversationState } from '@yonda/shared';
import { welcomeMsg } from '../messages/templates';

export const handleNew: StateHandler = async (phone, _message, _session): Promise<StateResult> => {
  return {
    nextState: ConversationState.ONBOARDING_NAME,
    contextUpdates: {},
    messages: [welcomeMsg(phone)],
  };
};
