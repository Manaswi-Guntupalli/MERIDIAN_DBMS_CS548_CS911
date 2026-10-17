/** Never return the account row through nested operational responses. */
export const publicUserSelect = { id: true, name: true, email: true, phone: true, avatarUrl: true } as const;
