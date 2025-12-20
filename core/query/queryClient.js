import { QueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

// 1. Configure the "Brain" (Cache)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // Keep unused data in memory for 24 hours
      staleTime: 1000 * 60 * 5, // Data is considered "fresh" for 5 minutes (won't auto-refetch)
      retry: 2, // Retry failed requests twice before showing error
    },
  },
});

// 2. Configure the "Hard Drive" (Offline Storage)
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  throttleTime: 3000, // Sync to disk at most every 3 seconds to save battery
});
