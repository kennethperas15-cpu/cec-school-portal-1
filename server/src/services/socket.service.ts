export const socketserviceService = {
  async findAll(_filter?: unknown): Promise<unknown[]> { return []; },
  async create<T>(value: T): Promise<T> { return value; }
};

