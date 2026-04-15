// Meta Cloud API incoming webhook payload types

export interface MetaWebhookPayload {
  object: string;
  entry: MetaEntry[];
}

export interface MetaEntry {
  id: string;
  changes: MetaChange[];
}

export interface MetaChange {
  value: MetaChangeValue;
  field: string;
}

export interface MetaChangeValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: MetaContact[];
  messages?: MetaMessage[];
  statuses?: MetaStatus[];
}

export interface MetaContact {
  profile: { name: string };
  wa_id: string;
}

export interface MetaStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
}

export interface MetaMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'interactive' | 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'unknown';
  text?: { body: string };
  interactive?: MetaInteractive;
}

export interface MetaInteractive {
  type: 'button_reply' | 'list_reply' | 'nfm_reply';
  button_reply?: { id: string; title: string };
  list_reply?: { id: string; title: string; description?: string };
}

// Parsed, simplified message that the bot engine works with
export interface IncomingMessage {
  messageId: string;
  from: string;           // E.164 phone number
  senderName: string;
  type: 'text' | 'button' | 'list';
  text?: string;          // For type === 'text'
  buttonId?: string;      // For type === 'button'
  listId?: string;        // For type === 'list'
  rawTimestamp: string;
}

// Outbound message types
export type OutgoingMessage =
  | TextMessage
  | InteractiveButtonMessage
  | InteractiveListMessage;

export interface TextMessage {
  type: 'text';
  to: string;
  body: string;
}

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface InteractiveButtonMessage {
  type: 'interactive_buttons';
  to: string;
  body: string;
  header?: string;
  footer?: string;
  buttons: InteractiveButton[]; // max 3
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

export interface InteractiveListMessage {
  type: 'interactive_list';
  to: string;
  header?: string;
  body: string;
  footer?: string;
  buttonLabel: string;
  sections: ListSection[];
}
