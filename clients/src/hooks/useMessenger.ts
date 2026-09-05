// useMessenger.ts - Messenger-style (NEW)
// CEC Portal • Real-time messaging
import { useMessenger } from '@/hooks/useMessenger';
import { useMessageStore } from '@/store/messageStore';
import { SocketEvent } from '@/types/socket';

export const Messenger = () => {
  const { sendMessage, conversations } = useMessenger();
  const { activeConversation } = useMessageStore();

  // Socket.io real-time
  const handleSend = (text: string) => {
    sendMessage({
      conversationId: activeConversation.id,
      content: text,
      type: 'text'
    });
  };

  return (
    <div className="messenger-layout">
      <ConversationList />
      <ChatWindow onSend={handleSend} />
    </div>
  );
};