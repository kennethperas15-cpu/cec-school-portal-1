import { create } from 'zustand';

export type MessageThread = {
  id: string;
  title: string;
  lastMessage: string;
};

type MessageStore = {
  activeConversation: MessageThread | null;
  setActiveConversation: (conversation: MessageThread | null) => void;
};

export const useMessageStore = create<MessageStore>((set) => ({
  activeConversation: { id: '1', title: 'Academic Affairs', lastMessage: 'Your schedule is ready.' },
  setActiveConversation: (conversation) => set({ activeConversation: conversation }),
}));

export default useMessageStore;