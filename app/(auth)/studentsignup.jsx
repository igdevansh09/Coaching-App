import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";
import { useToast } from "../../context/ToastContext";

const CLASS_OPTIONS = [
  "CS", "Prep", "1st", "2nd", "3rd", "4th", "5th", 
  "6th", "7th", "8th", "9th", "10th", "11th", "12th"
];
const STREAM_OPTIONS = ["Science", "Commerce", "Arts"];
const SCIENCE_SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Economics", "English", "Computer Science"];
const COMMERCE_SUBJECTS = ["Accountancy", "Business Studies", "Economics", "English", "Computer Science"];
const ARTS_SUBJECTS = ["History", "Political Science", "Geography", "Economics", "English", "Computer Science"];
const JUNIOR_SUBJECTS = ["All Subjects", "Computer Science"];

const StudentSignup = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStream, setSelectedStream] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const [showClassModal, setShowClassModal] = useState(false);
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);

  useEffect(() => {
    setSelectedStream(""); 
    setSelectedSubjects([]);

    if (selectedClass === "CS") {
      setSelectedStream("N/A");
      setSelectedSubjects(["N/A"]); 
    }
    else if (selectedClass && !["11th", "12th"].includes(selectedClass)) {
      setSelectedStream("N/A");
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass === "11th" || selectedClass === "12th") {
      setSelectedSubjects([]);
    }
  }, [selectedStream]);

  const getAvailableSubjects = () => {
    if (selectedClass === "CS") return [];
    
    if (["11th", "12th"].includes(selectedClass)) {
      if (selectedStream === "Science") return SCIENCE_SUBJECTS;
      if (selectedStream === "Commerce") return COMMERCE_SUBJECTS;
      if (selectedStream === "Arts") return ARTS_SUBJECTS;
      return [];
    }

    return JUNIOR_SUBJECTS;
  };

  const toggleSubject = (subject) => {
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects(selectedSubjects.filter((s) => s !== subject));
    } else {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  const handleRegister = async () => {
    Keyboard.dismiss();

    if (!name || !email || !phone || !password || !selectedClass) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    if (!email.trim().toLowerCase().endsWith("@gmail.com")) {
      showToast("Please use a valid @gmail.com address.", "error");
      return;
    }

    if (phone.length < 10) {
      showToast("Please enter a valid phone number.", "error");
      return;
    }

    if (["11th", "12th"].includes(selectedClass) && !selectedStream) {
      showToast("Please select a Stream.", "error");
      return;
    }

    if (selectedClass !== "CS" && selectedSubjects.length === 0) {
      showToast("Please select at least one subject.", "error");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        phone,
        standard: selectedClass,
        stream: selectedStream || "N/A",
        enrolledSubjects: selectedSubjects,
        role: "student",
        isApproved: false,
        createdAt: new Date().toISOString(),
      });

      await signOut(auth);

      showToast("Registration Successful! Pending Approval.", "success");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="bg-[#282C34] flex-1">
      <StatusBar barStyle="light-content" backgroundColor="#282C34" />

      <View className="px-4 py-2 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-semibold ml-4">Back to Login</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingBottom: 20 }}>
            <View className="m-1 flex justify-center items-center">
              <Text className="text-lg text-center text-white font-bold mb-6">Student Registration</Text>

              <View className="w-5/6">
                
                <Text className="text-[#f49b33] mt-2 mb-1">Full Name</Text>
                <TextInput value={name} onChangeText={setName} className="h-12 border border-white text-white rounded px-3 mb-2" />
                
                <Text className="text-[#f49b33] mt-2 mb-1">Email (@gmail.com)</Text>
                <TextInput 
                  keyboardType="email-address" 
                  autoCapitalize="none" 
                  value={email} 
                  onChangeText={setEmail} 
                  className="h-12 border border-white text-white rounded px-3 mb-2" 
                />

                <Text className="text-[#f49b33] mt-2 mb-1">Phone Number</Text>
                <TextInput 
                  keyboardType="phone-pad" 
                  maxLength={10}
                  value={phone} 
                  onChangeText={setPhone} 
                  className="h-12 border border-white text-white rounded px-3 mb-2" 
                />
                
                <Text className="text-[#f49b33] mt-2 mb-1">Password</Text>
                <TextInput secureTextEntry value={password} onChangeText={setPassword} className="h-12 border border-white text-white rounded px-3 mb-2" />

                <View className="flex-row justify-between mt-2">
                  <View style={{ width: !selectedClass || selectedClass === "CS" || (selectedClass && !["11th", "12th"].includes(selectedClass)) ? "100%" : "48%" }}>
                    <Text className="text-[#f49b33] mb-1">Class</Text>
                    <TouchableOpacity 
                      onPress={() => setShowClassModal(true)}
                      className="h-12 border border-white rounded px-3 justify-center bg-[#333842]"
                    >
                      <Text className="text-white">{selectedClass || "Select"}</Text>
                    </TouchableOpacity>
                  </View>

                  {["11th", "12th"].includes(selectedClass) && (
                    <View style={{ width: "48%" }}>
                      <Text className="text-[#f49b33] mb-1">Stream</Text>
                      <TouchableOpacity 
                        onPress={() => setShowStreamModal(true)}
                        className="h-12 border border-white rounded px-3 justify-center bg-[#333842]"
                      >
                        <Text className="text-white">{selectedStream || "Select"}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {selectedClass !== "CS" && (
                  <>
                    <Text className="text-[#f49b33] mt-4 mb-2">Enrolled Subjects</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        if (["11th", "12th"].includes(selectedClass) && !selectedStream) {
                          Alert.alert("Notice", "Please select a Stream first.");
                        } else {
                          setShowSubjectModal(true);
                        }
                      }} 
                      className="h-12 border border-white rounded px-3 justify-center bg-[#333842]"
                    >
                      <Text className="text-white" numberOfLines={1}>
                        {selectedSubjects.length > 0 ? selectedSubjects.join(", ") : "Select Subjects..."}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity onPress={handleRegister} disabled={loading} className={`p-3 my-2 rounded-lg mt-8 ${loading ? "bg-gray-600" : "bg-[#f49b33]"}`}>
                  {loading ? <ActivityIndicator color="#282C34" /> : <Text className="text-lg font-semibold text-center text-black">Register</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.replace("/(auth)/studentsignin")} className="mt-4">
                  <Text className="text-gray-400 text-center">Already have an account? <Text className="text-[#f49b33] font-bold">Sign In</Text></Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <Modal visible={showClassModal} animationType="slide" transparent={true} onRequestClose={() => setShowClassModal(false)}>
        <View className="flex-1 bg-black/80 justify-center items-center p-4">
          <View className="bg-[#333842] w-full max-h-[60%] rounded-xl p-4 border border-[#f49b33]">
            <Text className="text-[#f49b33] text-xl font-bold mb-4 text-center">Select Class</Text>
            <FlatList
              data={CLASS_OPTIONS}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => { setSelectedClass(item); setShowClassModal(false); }}
                  className="p-3 mb-2 rounded border border-gray-600 items-center"
                >
                  <Text className="text-white text-base font-bold">{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setShowClassModal(false)} className="bg-white p-3 rounded-lg mt-4"><Text className="text-center font-bold text-black">Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showStreamModal} animationType="slide" transparent={true} onRequestClose={() => setShowStreamModal(false)}>
        <View className="flex-1 bg-black/80 justify-center items-center p-4">
          <View className="bg-[#333842] w-full max-h-[50%] rounded-xl p-4 border border-[#f49b33]">
            <Text className="text-[#f49b33] text-xl font-bold mb-4 text-center">Select Stream</Text>
            <FlatList
              data={STREAM_OPTIONS}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => { setSelectedStream(item); setShowStreamModal(false); }}
                  className="p-3 mb-2 rounded border border-gray-600 items-center"
                >
                  <Text className="text-white text-base font-bold">{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setShowStreamModal(false)} className="bg-white p-3 rounded-lg mt-4"><Text className="text-center font-bold text-black">Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showSubjectModal} animationType="slide" transparent={true} onRequestClose={() => setShowSubjectModal(false)}>
        <View className="flex-1 bg-black/80 justify-center items-center p-4">
          <View className="bg-[#333842] w-full max-h-[80%] rounded-xl p-4 border border-[#f49b33]">
            <Text className="text-[#f49b33] text-xl font-bold mb-4 text-center">Select Subjects</Text>
            <FlatList
              data={getAvailableSubjects()}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => toggleSubject(item)}
                  className={`flex-row justify-between items-center p-3 mb-2 rounded border ${selectedSubjects.includes(item) ? "bg-[#f49b33] border-[#f49b33]" : "border-gray-600"}`}
                >
                  <Text className={`text-base ${selectedSubjects.includes(item) ? "text-black font-bold" : "text-white"}`}>{item}</Text>
                  {selectedSubjects.includes(item) && <Ionicons name="checkmark-circle" size={20} color="black" />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setShowSubjectModal(false)} className="bg-white p-3 rounded-lg mt-4"><Text className="text-center font-bold text-black">Done</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default StudentSignup;