import { useMemo } from 'react';

export type Conversation = {
  id: string;
  title: string;
  lastMessage: string;
  unread: number;
};

export function useMessenger() {
  const conversations = useMemo<Conversation[]>(() => [
    { id: '1', title: 'Academic Affairs', lastMessage: 'Your transcript has been processed.', unread: 2 },
    { id: '2', title: 'Campus Services', lastMessage: 'The library reservation is confirmed.', unread: 1 },
  ], []);

  const sendMessage = ({ conversationId, content }: { conversationId: string; content: string; type: 'text' }) => {
    console.info(`Sending message to ${conversationId}: ${content}`);
  };

  return { conversations, sendMessage };
}

export const Messenger = () => {
  const { conversations, sendMessage } = useMessenger();

  const handleSend = () => {
    sendMessage({ conversationId: '1', content: 'Hello from CEC portal.', type: 'text' });
  };

  return {
    conversations,
    handleSend,
    title: 'Messages',
  };
};