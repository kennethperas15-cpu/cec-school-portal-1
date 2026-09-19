import { useMessenger } from '@/hooks/useMessenger';

export const Messenger = () => {
  const { conversations, sendMessage } = useMessenger();

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <h3>Teacher messages</h3>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {conversations.map((conversation) => (
          <li key={conversation.id}>{conversation.title}: {conversation.lastMessage}</li>
        ))}
      </ul>
      <button type="button" onClick={() => sendMessage({ conversationId: '2', content: 'Good morning class!', type: 'text' })}>
        Send class update
      </button>
    </div>
  );
};