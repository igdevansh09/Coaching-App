import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { db } from "../../config/firebaseConfig";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import CustomAlert2 from "../../components/CustomAlert2";

const AdminViewNotifications = () => {
  const router = useRouter();
  const [combinedNotices, setCombinedNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalNotices, setGlobalNotices] = useState([]);
  const [classNotices, setClassNotices] = useState([]);
  const [readOnlyVisible, setReadOnlyVisible] = useState(false);
  const [selectedContent, setSelectedContent] = useState({
    title: "",
    message: "",
  });

  useEffect(() => {
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        sourceType: "Global",
      }));
      setGlobalNotices(list);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "class_notices"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        sourceType: "Class",
      }));
      setClassNotices(list);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const merged = [...globalNotices, ...classNotices];
    merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setCombinedNotices(merged);
    setLoading(false);
  }, [globalNotices, classNotices]);

  const renderNotice = ({ item }) => {
    const content =
      item.message ||
      item.content ||
      item.reason ||
      item.description ||
      "No content provided.";

    const isGlobal = item.sourceType === "Global";
    const tagText = isGlobal ? "Global Notice" : "Class Notice";
    const tagColor = isGlobal ? "#4CAF50" : "#29B6F6";
    const authorName = isGlobal ? "Admin" : item.teacherName || "Teacher";

    const handlePress = (item) => {
      const detailContent =
        item.content ||
        item.message ||
        item.reason ||
        item.description ||
        "No details provided.";
      setSelectedContent({
        title: item.title || "Notice",
        message: detailContent,
      });
      setReadOnlyVisible(true);
    };

    const targetInfo = isGlobal
      ? item.target || "General"
      : `${item.classId || "N/A"} • ${item.subject || "General"}`;

    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => handlePress(item)}
        activeOpacity={0.8}
      >
        <View className="bg-[#333842] rounded-lg p-4 mb-3 border border-[#4C5361]">
          <View className="flex-row justify-between items-start mb-1">
            <View className="flex-1 mr-2">
              <Text className="text-white text-base font-semibold">
                {item.title || "Notice"}
              </Text>

              <View className="flex-row mt-1 items-center flex-wrap">
                <Text
                  className="text-xs font-bold mr-2"
                  style={{ color: tagColor }}
                >
                  {tagText}
                </Text>
                <Text className="text-xs text-gray-400 italic mr-2">
                  By: {authorName}
                </Text>
              </View>

              {!isGlobal && (
                <Text className="text-xs text-[#f49b33] font-bold mt-1">
                  {targetInfo}
                </Text>
              )}
            </View>
            <Text className="text-gray-400 text-xs">{item.date}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#282C34" }}
      className="pt-8"
    >
      <StatusBar backgroundColor="#282C34" barStyle="light-content" />

      <CustomAlert2
        visible={readOnlyVisible}
        title={selectedContent.title}
        message={selectedContent.message}
        onClose={() => setReadOnlyVisible(false)}
      />

      <View className="px-4 pb-4 py-7 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold ml-4">
          All Announcements
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#f49b33" className="mt-10" />
      ) : (
        <FlatList
          data={combinedNotices}
          keyExtractor={(item) => item.id}
          renderItem={renderNotice}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text className="text-gray-500 text-center mt-20">
              No announcements found.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default AdminViewNotifications;