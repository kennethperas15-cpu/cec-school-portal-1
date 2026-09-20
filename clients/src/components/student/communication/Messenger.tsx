import { useMessenger } from '@/hooks/useMessenger';

export const Messenger = () => {
  const { conversations, sendMessage } = useMessenger();

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <h3>Student messaging</h3>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {conversations.map((conversation) => (
          <li key={conversation.id}>{conversation.title}: {conversation.lastMessage}</li>
        ))}
      </ul>
      <button type="button" onClick={() => sendMessage({ conversationId: '1', content: 'Hello!', type: 'text' })}>
        Send reply
      </button>
    </div>
  );
};