// User State Management with Zustand
import { create } from 'zustand';
import { usersAPI } from '../utils/api';
import toast from 'react-hot-toast';

const useUserStore = create((set) => ({
  users: [],
  isLoading: false,
  error: null,

  // Fetch all users
  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await usersAPI.getAll();
      set({
        users: response.data.data.users,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch users';
      set({
        error: errorMessage,
        isLoading: false,
      });
      toast.error(errorMessage);
    }
  },
}));

export default useUserStore;
