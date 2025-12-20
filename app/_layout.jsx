import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";
import "../global.css";
import { ToastProvider } from "../context/ToastContext";


const InitialLayout = () => {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  

  useEffect(() => {
    if (loading) return; 

    const inAuthGroup = segments[0] === "(auth)";
    const inProtectedRoute =
      segments[0] === "(admin)" ||
      segments[0] === "(teacher)" ||
      segments[0] === "(student)";

    if (user && userRole) {

      if (userRole === "admin" && segments[0] !== "(admin)") {
        router.replace("/(admin)/admindashboard");
      } else if (userRole === "teacher" && segments[0] !== "(teacher)") {
        router.replace("/(teacher)/teacherdashboard");
      } else if (userRole === "student" && segments[0] !== "(student)") {
        router.replace("/(student)/studentdashboard");
      }
    } else if (!user) {
      if (inProtectedRoute) {
        router.replace("/");
      }
    }
  }, [user, userRole, loading, segments]);

  if (loading) {
    return (
      <View className="flex-1 bg-[#282C34] justify-center items-center">
        <ActivityIndicator size="large" color="#f49b33" />
      </View>
    );
  }

  
  return (
    <ToastProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login_options" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(teacher)" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(guest)" />
      </Stack>
    </ToastProvider>
  );
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}
