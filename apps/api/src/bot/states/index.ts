import { ConversationState, type BotSessionData } from '@yonda/shared';
import type { IncomingMessage, OutgoingMessage } from '../../types/whatsapp';

export interface StateResult {
  nextState: ConversationState;
  contextUpdates: Partial<BotSessionData['context']>;
  messages: OutgoingMessage[];
}

export type StateHandler = (
  phone: string,
  message: IncomingMessage,
  session: BotSessionData,
) => Promise<StateResult>;

export { ConversationState };
