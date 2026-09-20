export type NotificationPayload = {
  title?: string;
  message?: string;
  type?: 'info' | 'success' | 'warning';
};

export const notificationService = {
  async findAll() {
    return [
      { id: 'n-1', title: 'Enrollment update', message: 'Your enrollment review has been scheduled.', type: 'info' },
      { id: 'n-2', title: 'Fee reminder', message: 'Tuition payment is due this Friday.', type: 'warning' },
    ];
  },
  async create(payload: NotificationPayload) {
    return {
      id: `notice-${Date.now()}`,
      ...payload,
      createdAt: new Date().toISOString(),
    };
  },
};

export default notificationService;