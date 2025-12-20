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
  "Prep to 2nd", "3rd", "4th", "5th", 
  "6th", "7th", "8th", "9th", "10th", "11th", "12th", "CS"
];

const SUBJECT_OPTIONS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "English", "Hindi", "CS", "Science", "Social Science",
  "Accountancy", "Business Studies", "Economics",
  "History", "Geography", "Political Science"
];

const JUNIOR_CLASSES = ["Prep to 2nd", "3rd"];

const TeacherSignUp = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); 
  const [password, setPassword] = useState("");
  
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);

  const isJuniorSelected = selectedClasses.some(c => JUNIOR_CLASSES.includes(c));

  useEffect(() => {
    if (isJuniorSelected) {
      setSelectedSubjects(["All Subjects"]);
    } else {
      setSelectedSubjects(prev => prev.filter(s => s !== "All Subjects"));
    }
  }, [selectedClasses]);


  const toggleClass = (item) => {
    const isTargetJunior = JUNIOR_CLASSES.includes(item);

    if (isTargetJunior) {
      if (selectedClasses.includes(item)) {
        setSelectedClasses([]);
      } else {
        setSelectedClasses([item]); 
      }
    } else {
      let newSelection = selectedClasses.filter(c => !JUNIOR_CLASSES.includes(c));
      
      if (newSelection.includes(item)) {
        newSelection = newSelection.filter(i => i !== item);
      } else {
        newSelection.push(item);
      }
      setSelectedClasses(newSelection);
    }
  };

  const toggleSubject = (item) => {
    if (isJuniorSelected) {
      Alert.alert("Restricted", "Junior classes are set to 'All Subjects' by default.");
      return;
    }

    if (selectedSubjects.includes(item)) {
      setSelectedSubjects(selectedSubjects.filter((i) => i !== item));
    } else {
      setSelectedSubjects([...selectedSubjects, item]);
    }
  };

  const isOnlyCS = selectedClasses.length === 1 && selectedClasses.includes("CS");

  const handleRegister = async () => {
    Keyboard.dismiss(); 

    if (
      !name ||
      !email ||
      !phone ||
      !password ||
      selectedClasses.length === 0
    ) {
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

    const skipSubjectCheck = isOnlyCS || isJuniorSelected;

    if (!skipSubjectCheck && selectedSubjects.length === 0) {
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

      let finalSubjects = selectedSubjects;
      if (isOnlyCS) finalSubjects = [];

      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        phone,
        role: "teacher",
        classesTaught: selectedClasses,
        subjects: finalSubjects,
        salary: "0",
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
              <Text className="text-lg text-center text-white font-bold mb-6">Teacher Registration</Text>

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

                <Text className="text-[#f49b33] mt-4 mb-2">Classes Taught</Text>
                <TouchableOpacity onPress={() => setShowClassModal(true)} className="h-12 border border-white rounded px-3 justify-center bg-[#333842]">
                  <Text className="text-white" numberOfLines={1}>
                    {selectedClasses.length > 0 ? selectedClasses.join(", ") : "Select Classes..."}
                  </Text>
                </TouchableOpacity>

                {!isOnlyCS && (
                  <>
                    <Text className="text-[#f49b33] mt-4 mb-2">Subjects Taught</Text>
                    <TouchableOpacity 
                      onPress={() => setShowSubjectModal(true)} 
                      className={`h-12 border border-white rounded px-3 justify-center ${isJuniorSelected ? "bg-gray-700" : "bg-[#333842]"}`}
                    >
                      <Text className={isJuniorSelected ? "text-gray-400" : "text-white"} numberOfLines={1}>
                        {selectedSubjects.length > 0 ? selectedSubjects.join(", ") : "Select Subjects..."}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity onPress={handleRegister} disabled={loading} className={`p-3 my-2 rounded-lg mt-8 ${loading ? "bg-gray-600" : "bg-[#f49b33]"}`}>
                  {loading ? <ActivityIndicator color="#282C34" /> : <Text className="text-lg font-semibold text-center text-black">Register</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.replace("/(auth)/teachersignin")} className="mt-3">
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
            <Text className="text-[#f49b33] text-xl font-bold mb-4 text-center">Select Classes</Text>
            <FlatList
              data={CLASS_OPTIONS}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => toggleClass(item)} 
                  className={`flex-row justify-between items-center p-3 mb-2 rounded border ${selectedClasses.includes(item) ? "bg-[#f49b33] border-[#f49b33]" : "border-gray-600"}`}
                >
                  <Text className={`text-base ${selectedClasses.includes(item) ? "text-black font-bold" : "text-white"}`}>{item}</Text>
                  {selectedClasses.includes(item) && <Ionicons name="checkmark-circle" size={20} color="black" />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setShowClassModal(false)} className="bg-white p-3 rounded-lg mt-4"><Text className="text-center font-bold text-black">Done</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showSubjectModal} animationType="slide" transparent={true} onRequestClose={() => setShowSubjectModal(false)}>
        <View className="flex-1 bg-black/80 justify-center items-center p-4">
          <View className="bg-[#333842] w-full max-h-[80%] rounded-xl p-4 border border-[#f49b33]">
            <Text className="text-[#f49b33] text-xl font-bold mb-4 text-center">Select Subjects</Text>
            {isJuniorSelected && (
               <View className="p-3 mb-4 rounded bg-[#f49b33] border border-[#f49b33] flex-row justify-between items-center">
                  <Text className="text-black font-bold text-base">All Subjects</Text>
                  <Ionicons name="lock-closed" size={20} color="black" />
               </View>
            )}
            
            <FlatList
              data={SUBJECT_OPTIONS}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => toggleSubject(item)} 
                  className={`flex-row justify-between items-center p-3 mb-2 rounded border ${selectedSubjects.includes(item) ? "bg-[#f49b33] border-[#f49b33]" : "border-gray-600"} ${isJuniorSelected ? "opacity-50" : ""}`}
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

export default TeacherSignUp;