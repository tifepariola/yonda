import type { StateHandler, StateResult } from './index';
import { ConversationState } from '@yonda/shared';
import { getActiveRate } from '../../services/fx';
import { rateMsg, noRateConfiguredMsg } from '../messages/templates';

export const handleRateCheck: StateHandler = async (phone, _message, _session): Promise<StateResult> => {
  try {
    const rate = await getActiveRate();
    return {
      nextState: ConversationState.IDLE,
      contextUpdates: {},
      messages: [rateMsg(phone, rate.effectiveRateCnyToNgn, rate.baseRateCnyToNgn, rate.marginPercent)],
    };
  } catch {
    return {
      nextState: ConversationState.IDLE,
      contextUpdates: {},
      messages: [noRateConfiguredMsg(phone)],
    };
  }
};
