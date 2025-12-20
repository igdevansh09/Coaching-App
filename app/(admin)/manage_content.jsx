import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { db } from "../../config/firebaseConfig";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

import CustomAlert from "../../components/CustomAlert";
import CustomToast from "../../components/CustomToast";

const ManageContent = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [contentList, setContentList] = useState([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [target, setTarget] = useState("Guest");

  const [currentVideoLink, setCurrentVideoLink] = useState("");
  const [playlist, setPlaylist] = useState([]); 
  const [fetchingVideo, setFetchingVideo] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("default");
  const [alertConfirmAction, setAlertConfirmAction] = useState(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  const showToast = (msg, type = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setToastVisible(true);
  };

  const SUBJECTS = [
    "Physics", "Chemistry", "Mathematics", "Biology",
    "Accountancy", "Business Studies", "Economics",
    "History", "Geography", "Political Science",
    "English", "Hindi", "Computer Science"
  ];

  const targetOptions = [
    "Guest",
    "Prep", "1st", "2nd", "3rd", "4th", "5th", 
    "6th", "7th", "8th", "9th", "10th",
    ...SUBJECTS.map(s => `11th ${s}`),
    ...SUBJECTS.map(s => `12th ${s}`),
    "CS"
  ];

  const colors = {
    BG: "#282C34",
    CARD: "#333842",
    ACCENT: "#f49b33",
    TEXT: "#FFFFFF",
    SUB_TEXT: "#BBBBBB",
    DELETE: "#F44336",
    ADD: "#4CAF50",
  };

  useEffect(() => {
    const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setContentList(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getYoutubeId = (url) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handleAddVideo = async () => {
    const videoId = getYoutubeId(currentVideoLink);
    if (!videoId) {
      showToast("Invalid YouTube URL", "error");
      return;
    }

    setFetchingVideo(true);
    try {
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      const data = await response.json();

      const newVideo = {
        id: Date.now().toString(),
        title: data.title || "Untitled Video",
        videoId: videoId,
        duration: "Video", 
      };

      if (playlist.length === 0) {
        setThumbnail(data.thumbnail_url);
        if (!title) setTitle(data.title);
      }

      setPlaylist([...playlist, newVideo]);
      setCurrentVideoLink(""); 
    } catch (error) {
      showToast("Could not fetch video details.", "error");
    } finally {
      setFetchingVideo(false);
    }
  };

  const removeVideo = (indexToRemove) => {
    setPlaylist(playlist.filter((_, index) => index !== indexToRemove));
  };

  const handleSaveCourse = async () => {
    if (!title.trim() || playlist.length === 0) {
      showToast("Add a Title and at least one Video.", "error");
      return;
    }

    setUploading(true);
    try {
      await addDoc(collection(db, "courses"), {
        title,
        description,
        thumbnail,
        target,
        playlist,
        createdAt: new Date().toISOString(),
      });

      showToast("Course created successfully!", "success");
      setTitle("");
      setDescription("");
      setThumbnail("");
      setPlaylist([]);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCourse = (id) => {
    setAlertTitle("Delete Course");
    setAlertMessage("Are you sure you want to delete this course?");
    setAlertType("warning");
    setAlertConfirmAction(() => () => performDelete(id));
    setAlertVisible(true);
  };

  const performDelete = async (id) => {
    setAlertVisible(false);
    try {
        await deleteDoc(doc(db, "courses", id));
        showToast("Course deleted.", "success");
    } catch (e) {
        showToast(e.message, "error");
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.BG }}
      className="pt-8"
    >
      <StatusBar backgroundColor={colors.BG} barStyle="light-content" />

      <CustomAlert 
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onCancel={() => setAlertVisible(false)}
        onConfirm={alertConfirmAction}
        confirmText="Delete"
      />

      <CustomToast 
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />

      <View className="px-4 pb-4 py-7 flex-row items-center">
        <Ionicons
          name="arrow-back"
          size={24}
          color={colors.TEXT}
          onPress={() => router.back()}
        />
        <Text style={{ color: colors.TEXT }} className="text-xl font-bold ml-4">
          Course Builder
        </Text>
      </View>

      <ScrollView className="flex-1 px-4">
        <View
          className="p-4 rounded-xl mb-6"
          style={{ backgroundColor: colors.CARD }}
        >
          <Text style={{ color: colors.ACCENT }} className="font-bold mb-3">
            Step 1: Course Details
          </Text>

          <View className="mb-3">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {targetOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setTarget(opt)}
                  className={`mr-2 mb-2 px-4 py-2 rounded-full border ${
                    target === opt
                      ? "bg-[#f49b33] border-[#f49b33]"
                      : "border-[#616A7D]"
                  }`}
                >
                  <Text
                    className={`${
                      target === opt ? "text-[#282C34]" : "text-gray-400"
                    } font-bold text-xs`}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TextInput
            placeholder="Course Title"
            placeholderTextColor={colors.SUB_TEXT}
            value={title}
            onChangeText={setTitle}
            className="p-3 rounded-lg border mb-3 bg-[#282C34] text-white border-[#616A7D]"
          />
          <TextInput
            placeholder="Description"
            placeholderTextColor={colors.SUB_TEXT}
            value={description}
            onChangeText={setDescription}
            className="p-3 rounded-lg border mb-4 bg-[#282C34] text-white border-[#616A7D]"
          />

          <Text
            style={{ color: colors.ACCENT }}
            className="font-bold mb-2 mt-2"
          >
            Step 2: Add Videos
          </Text>
          <View className="flex-row mb-4">
            <TextInput
              placeholder="Paste YouTube Video Link"
              placeholderTextColor={colors.SUB_TEXT}
              value={currentVideoLink}
              onChangeText={setCurrentVideoLink}
              className="flex-1 p-3 rounded-l-lg border bg-[#282C34] text-white border-[#616A7D]"
            />
            <TouchableOpacity
              onPress={handleAddVideo}
              disabled={fetchingVideo}
              className="bg-[#4CAF50] px-4 justify-center rounded-r-lg"
            >
              {fetchingVideo ? (
                <ActivityIndicator color="white" />
              ) : (
                <Ionicons name="add" size={24} color="white" />
              )}
            </TouchableOpacity>
          </View>

          {playlist.map((vid, index) => (
            <View
              key={index}
              className="flex-row justify-between items-center bg-[#282C34] p-2 rounded mb-2 border border-[#4C5361]"
            >
              <Text
                className="text-white text-xs flex-1 mr-2"
                numberOfLines={1}
              >
                {index + 1}. {vid.title}
              </Text>
              <TouchableOpacity onPress={() => removeVideo(index)}>
                <Ionicons name="close-circle" size={20} color={colors.DELETE} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            onPress={handleSaveCourse}
            disabled={uploading || playlist.length === 0}
            style={{ backgroundColor: colors.ACCENT }}
            className="py-3 rounded-lg items-center mt-4"
          >
            {uploading ? (
              <ActivityIndicator color={colors.BG} />
            ) : (
              <Text style={{ color: colors.BG }} className="font-bold">
                Save Course
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={{ color: colors.SUB_TEXT }} className="mb-2 font-semibold">
          Existing Courses
        </Text>
        {contentList.map((item) => (
          <View
            key={item.id}
            style={{ backgroundColor: colors.CARD }}
            className="p-3 rounded-xl mb-4 border border-[#4C5361] flex-row"
          >
            <Image
              source={{ uri: item.thumbnail }}
              className="w-20 h-14 rounded mr-3"
              resizeMode="cover"
            />
            <View className="flex-1 justify-center">
              <Text
                style={{ color: colors.TEXT }}
                className="font-bold text-base"
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={{ color: colors.SUB_TEXT }} className="text-xs">
                {item.playlist ? item.playlist.length : 0} Videos •{" "}
                {item.target}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDeleteCourse(item.id)}
              className="justify-center px-2"
            >
              <Ionicons name="trash-outline" size={20} color={colors.DELETE} />
            </TouchableOpacity>
          </View>
        ))}
        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ManageContent;