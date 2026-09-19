export type MessagePayload = {
  conversationId?: string;
  content?: string;
  type?: 'text';
};

export const messageService = {
  async findAll() {
    return [
      { id: 'm-1', conversationId: '1', content: 'Welcome to CEC portal', type: 'text' },
      { id: 'm-2', conversationId: '2', content: 'Your schedule has been updated', type: 'text' },
    ];
  },
  async create(payload: MessagePayload) {
    return {
      id: `msg-${Date.now()}`,
      ...payload,
      createdAt: new Date().toISOString(),
    };
  },
};

export default messageService;