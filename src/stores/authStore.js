import { create } from 'zustand';

const LOCAL_USER = {
  id: 'local-user',
  email: 'user',
  user_metadata: { display_name: 'User' },
};

export const useAuthStore = create((set) => ({
  session: { user: LOCAL_USER },
  isLoading: false,

  init: async () => {
    set({ session: { user: LOCAL_USER }, isLoading: false });
  },
}));
