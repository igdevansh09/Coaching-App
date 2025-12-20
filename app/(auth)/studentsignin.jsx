import { useState } from "react";
import { useRouter } from "expo-router";
import { Formik } from "formik";
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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import logo from "../../assets/images/dinetimelogo.png";
import validationSchema from "../../utils/teacherstudentSchema";
import { auth, db } from "../../config/firebaseConfig";
import CustomToast from "../../components/CustomToast";

const entryImg = require("../../assets/images/Frame.png");

const StudentSignin = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  const showToast = (msg, type = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setToastVisible(true);
  };

  const handleStudentLogin = async (values) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role === "student") {
          
          if (userData.isApproved === false) {
            showToast("Your account is waiting for Admin approval.", "warning");
            auth.signOut();
            setLoading(false);
            return;
          }

          if (router.canGoBack()) {
            router.dismissAll();
          }
          router.replace("/(student)/studentdashboard");
        } else {
          showToast("Access Denied: This account is not a Student.", "error");
          auth.signOut();
        }
      } else {
        showToast("Error: User record not found.", "error");
      }
    } catch (error) {
      let msg = error.message;
      if (error.code === "auth/invalid-credential")
        msg = "Invalid email or password";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="bg-[#282C34] flex-1">
      <StatusBar barStyle="light-content" backgroundColor="#282C34" />

      <CustomToast 
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />

      <View className="px-4 py-2 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-semibold ml-4">Back</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingBottom: 20,
            }}
          >
            <View className="m-1 flex justify-center items-center">
              <Image source={logo} style={{ width: 300, height: 200 }} />
              <Text className="text-lg text-center text-white font-bold mb-10">
                Student Login
              </Text>

              <View className="w-5/6">
                <Formik
                  initialValues={{ email: "", password: "" }}
                  validationSchema={validationSchema}
                  onSubmit={handleStudentLogin}
                >
                  {({
                    handleChange,
                    handleBlur,
                    handleSubmit,
                    values,
                    errors,
                    touched,
                  }) => (
                    <View className="w-full">
                      <Text className="text-[#f49b33] mt-2 mb-2">Email</Text>
                      <TextInput
                        className="h-18 border border-white text-white rounded px-2"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        onChangeText={handleChange("email")}
                        value={values.email}
                        onBlur={handleBlur("email")}
                      />
                      {touched.email && errors.email && (
                        <Text className="text-red-500 text-xs mb-2">
                          {errors.email}
                        </Text>
                      )}

                      <Text className="text-[#f49b33] mt-4 mb-2">Password</Text>
                      <TextInput
                        className="h-18 border border-white text-white rounded px-2"
                        secureTextEntry
                        onChangeText={handleChange("password")}
                        value={values.password}
                        onBlur={handleBlur("password")}
                      />
                      {touched.password && errors.password && (
                        <Text className="text-red-500 text-xs mb-2">
                          {errors.password}
                        </Text>
                      )}

                      <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={loading}
                        className={`p-2 my-2 rounded-lg mt-10 ${loading ? "bg-gray-600" : "bg-[#f49b33]"}`}
                      >
                        {loading ? (
                          <ActivityIndicator color="#282C34" />
                        ) : (
                          <Text className="text-lg font-semibold text-center text-black">
                            Sign In
                          </Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => router.push("/(auth)/studentsignup")}
                        className="mt-6 mt-3"
                      >
                        <Text className="text-gray-400 text-center">
                          New Student?{" "}
                          <Text className="text-[#f49b33] font-bold">
                            Register Here
                          </Text>
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Formik>
              </View>
            </View>
            <View className="flex-1">
              <Image
                source={entryImg}
                className="w-full h-full"
                resizeMode="contain"
              />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default StudentSignin;