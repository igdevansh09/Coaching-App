import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null, // The Firebase User Object
      userRole: null, // 'admin', 'teacher', 'student'
      isAuthenticated: false,

      // Actions
      login: (userData, role) =>
        set({
          user: userData,
          userRole: role,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          userRole: null,
          isAuthenticated: false,
        }),

      // Helper to update specific profile fields (e.g. after editing profile)
      updateUser: (updates) =>
        set((state) => ({
          user: { ...state.user, ...updates },
        })),
    }),
    {
      name: "auth-storage", // The key name in AsyncStorage
      storage: createJSONStorage(() => AsyncStorage), // Save to device storage
    }
  )
);
