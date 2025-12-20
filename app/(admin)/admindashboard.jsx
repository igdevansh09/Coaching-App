import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal, 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth, db } from "../../config/firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import CustomAlert from "../../components/CustomAlert"; // Ensure this path is correct

const AdminDashboard = () => {
  const router = useRouter();
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Stats State
  const [studentCount, setStudentCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);

  // Modal States
  const [logoutAlertVisible, setLogoutAlertVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const theme = {
    bg: "bg-[#282C34]",
    card: "bg-[#333842]",
    accent: "text-[#f49b33]",
    accentBg: "bg-[#f49b33]",
    text: "text-white",
    subText: "text-gray-400",
    borderColor: "border-[#4C5361]",
  };

  const fetchAdminProfile = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setAdminData(userDoc.data());
        }
      }
    } catch (error) {
      console.log("Error fetching admin data:", error);
    }
  };

  useEffect(() => {
    let unsubscribeStudents;
    let unsubscribeTeachers;

    const initializeDashboard = async () => {
      await fetchAdminProfile();
      setLoading(false);

      const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "student")
      );
      unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
        setStudentCount(snapshot.size);
      });

      const teachersQuery = query(
        collection(db, "users"),
        where("role", "==", "teacher")
      );
      unsubscribeTeachers = onSnapshot(teachersQuery, (snapshot) => {
        setTeacherCount(snapshot.size);
      });
    };

    initializeDashboard();

    return () => {
      if (unsubscribeStudents) unsubscribeStudents();
      if (unsubscribeTeachers) unsubscribeTeachers();
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAdminProfile();
    setRefreshing(false);
  }, []);

  const handleConfirmLogout = async () => {
    setLogoutAlertVisible(false);
    try {
      await signOut(auth);
      router.replace("/");
    } catch (error) {
      console.log("Logout Error", error.message);
    }
  };

  const stats = [
    { title: "Total Students", count: studentCount.toString(), icon: "people" },
    { title: "Total Teachers", count: teacherCount.toString(), icon: "school" },
  ];

  const adminActions = [
    {
      id: "1",
      name: "Manage Students",
      icon: "person-add-outline",
      route: "/(admin)/managestudents",
    },
    {
      id: "2",
      name: "Manage Teachers",
      icon: "briefcase-outline",
      route: "/(admin)/manageteachers",
    },
    {
      id: "3",
      name: "Student Fee",
      icon: "stats-chart-outline",
      route: "/(admin)/feereports",
    },
    {
      id: "4",
      name: "Teacher Fee",
      icon: "stats-chart-outline",
      route: "/(admin)/salaryreports",
    },
    {
      id: "5",
      name: "Global Notices",
      icon: "megaphone-outline",
      route: "/(admin)/globalnotices",
    },
    {
      id: "6",
      name: "Manage Courses",
      icon: "library-outline",
      route: "/(admin)/manage_content",
    },
    {
      id: "7",
      name: "Teacher Leaves",
      icon: "calendar-number-outline",
      route: "/(admin)/teacher_leaves",
    },
    {
      id: "8",
      name: "All Notifications",
      icon: "notifications-outline",
      route: "/(admin)/view_notifications",
    },
  ];

  if (loading) {
    return (
      <SafeAreaView
        className={`flex-1 ${theme.bg} justify-center items-center`}
      >
        <ActivityIndicator size="large" color="#f49b33" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${theme.bg} pt-8`}>
      <StatusBar backgroundColor="#282C34" barStyle="light-content" />

      {/* --- CUSTOM LOGOUT ALERT --- */}
      <CustomAlert
        visible={logoutAlertVisible}
        title="Sign Out"
        message="Are you sure you want to sign out of the Admin Panel?"
        confirmText="Sign Out"
        cancelText="Cancel"
        onCancel={() => setLogoutAlertVisible(false)}
        onConfirm={handleConfirmLogout}
      />

      {/* --- PROFILE DETAIL MODAL --- */}
      <Modal
        visible={profileModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/80 p-4">
          <View className="bg-[#333842] w-[85%] rounded-xl p-6 border border-[#f49b33]">
            <View className="items-center mb-4">
              <View className="w-20 h-20 rounded-full bg-[#f49b33] items-center justify-center mb-3">
                <Text className="text-[#282C34] font-bold text-4xl">
                  {adminData?.name ? adminData.name.charAt(0) : "A"}
                </Text>
              </View>
              <Text className="text-white text-2xl font-bold">
                {adminData?.name || "Administrator"}
              </Text>
              <Text className="text-gray-400 text-sm uppercase mt-1">
                Admin Panel Access
              </Text>
            </View>

            <View className="mb-6 bg-[#282C34] p-4 rounded-lg">
              <Text className="text-gray-400 text-xs uppercase mb-1">
                Email
              </Text>
              <Text className="text-white text-base mb-3">
                {adminData?.email || "admin@brainplus.com"}
              </Text>

              <Text className="text-gray-400 text-xs uppercase mb-1">Role</Text>
              <Text className="text-[#f49b33] font-bold text-base">
                Super Admin
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setProfileModalVisible(false)}
              className="bg-[#f49b33] p-3 rounded-lg items-center"
            >
              <Text className="text-[#282C34] font-bold text-base">
                Close Profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        className="flex-1 px-4 py-7"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f49b33"
          />
        }
      >
        <View className="flex-row items-center mb-6">
          {/* Clickable Profile Icon */}
          <TouchableOpacity onPress={() => setProfileModalVisible(true)}>
            <View
              className={`w-12 h-12 rounded-full ${theme.accentBg} items-center justify-center mr-4`}
            >
              <Text className="text-black font-bold text-xl">
                {adminData?.name ? adminData.name.charAt(0) : "A"}
              </Text>
            </View>
          </TouchableOpacity>

          <View className="flex-1">
            <Text className={`${theme.text} text-xl font-bold`}>
              {adminData?.name || "Admin Panel"}
            </Text>
            <Text className={`${theme.subText} text-sm`}>Administrator</Text>
          </View>

          {/* Logout Trigger */}
          <TouchableOpacity onPress={() => setLogoutAlertVisible(true)}>
            <Ionicons name="log-out-outline" size={26} color="#f49b33" />
          </TouchableOpacity>
        </View>

        <View className="flex-row flex-wrap justify-between mb-6">
          {stats.map((stat, index) => (
            <View
              key={index}
              className={`w-[48%] ${theme.card} p-4 rounded-xl items-center justify-center border border-[#4C5361] mb-4`}
            >
              <Ionicons name={stat.icon} size={24} color="#f49b33" />
              <Text className={`${theme.text} text-lg font-bold mt-1`}>
                {stat.count}
              </Text>
              <Text className={`${theme.subText} text-[10px] text-center`}>
                {stat.title}
              </Text>
            </View>
          ))}
        </View>

        <Text className={`${theme.accent} text-xl font-semibold mb-4 mt-2`}>
          Administration
        </Text>

        <View className="flex-row flex-wrap justify-between">
          {adminActions.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => item.route && router.push(item.route)}
              activeOpacity={0.8}
              className={`w-[48%] ${theme.card} rounded-xl p-5 items-center mb-4 border border-[#4C5361]`}
            >
              <Ionicons name={item.icon} size={32} color="#f49b33" />
              <Text
                className={`${theme.text} mt-3 text-sm font-semibold text-center`}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminDashboard;
