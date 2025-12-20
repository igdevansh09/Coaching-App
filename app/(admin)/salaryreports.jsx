import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../config/firebaseConfig";

import CustomAlert from "../../components/CustomAlert";
import CustomToast from "../../components/CustomToast";

const SalaryItemCard = ({ item, onMarkPaid, colors }) => {
  const [teacherData, setTeacherData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchTeacherProfile = async () => {
      try {
        if (item.teacherId) {
          const userDoc = await getDoc(doc(db, "users", item.teacherId));
          if (userDoc.exists()) {
            setTeacherData(userDoc.data());
          }
        }
      } catch (error) {
        console.log("Error fetching teacher:", error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchTeacherProfile();
  }, [item.teacherId]);

  return (
    <View
      style={{ backgroundColor: colors.card }}
      className="p-4 rounded-xl mb-3 border border-[#4C5361]"
    >
      <View className="flex-row justify-between items-center mb-2">
        <Text style={{ color: colors.text }} className="text-lg font-bold">
          {item.teacherName}
        </Text>
        <Text
          style={{
            color: item.status === "Paid" ? colors.paid : colors.pending,
            fontWeight: "bold",
          }}
        >
          {item.status}
        </Text>
      </View>
      <Text style={{ color: "#FFC000" }} className="text-base mb-2">
        {item.title}
      </Text>

      {loadingData ? (
        <ActivityIndicator
          size="small"
          color={colors.accent}
          style={{ alignSelf: "flex-start", marginVertical: 5 }}
        />
      ) : teacherData ? (
        <View className="mb-3">
          <Text style={{ color: colors.subText, fontSize: 12 }}>
            <Text style={{ fontWeight: "bold", color: "#FFF" }}>Classes: </Text>
            {teacherData.classesTaught?.join(", ") || "N/A"}
          </Text>
          <Text style={{ color: colors.subText, fontSize: 12 }}>
            <Text style={{ fontWeight: "bold", color: "#FFF" }}>
              Subjects:{" "}
            </Text>
            {teacherData.subjects?.join(", ") || "N/A"}
          </Text>
        </View>
      ) : null}

      <View className="flex-row justify-between items-end mt-2">
        <View className="flex-row items-center">
          <Text
            style={{ color: colors.accent }}
            className="text-lg font-bold mr-4"
          >
            ₹{item.amount}
          </Text>
          {item.status === "Pending" && (
            <TouchableOpacity
              onPress={() => onMarkPaid(item.id, item.teacherName)}
              style={{ backgroundColor: colors.paid }}
              className="px-3 py-2 rounded-lg"
            >
              <Text style={{ color: colors.bg, fontWeight: "bold" }}>
                Pay Now
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const TeacherSalaryReports = () => {
  const router = useRouter();
  const [salaries, setSalaries] = useState([]);
  const [filteredSalaries, setFilteredSalaries] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("Pending");

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [commissionTeachers, setCommissionTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

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

  const colors = {
    bg: "#282C34",
    card: "#333842",
    accent: "#f49b33",
    text: "#FFFFFF",
    subText: "#BBBBBB",
    paid: "#4CAF50",
    pending: "#F44336",
  };

  const getCurrentMonthTitle = () => {
    const date = new Date();
    const month = date.toLocaleString("default", { month: "long" });
    const year = date.getFullYear();
    return `Salary - ${month} ${year}`;
  };

  useEffect(() => {
    const q = query(collection(db, "salaries"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setSalaries(list);
      setFilteredSalaries(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredSalaries(salaries);
    } else {
      const lower = searchQuery.toLowerCase();
      setFilteredSalaries(
        salaries.filter(
          (s) =>
            s.teacherName?.toLowerCase().includes(lower) ||
            s.teacherEmail?.toLowerCase().includes(lower)
        )
      );
    }
  }, [searchQuery, salaries]);

  useEffect(() => {
    if (showTeacherModal) {
      const fetchTeachers = async () => {
        setLoadingTeachers(true);
        try {
          const q = query(
            collection(db, "users"),
            where("role", "==", "teacher"),
            where("isApproved", "==", true),
            where("salaryType", "==", "Commission")
          );
          const snap = await getDocs(q);
          const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setCommissionTeachers(list);
        } catch (e) {
          console.log(e);
        } finally {
          setLoadingTeachers(false);
        }
      };
      fetchTeachers();
    }
  }, [showTeacherModal]);

  useEffect(() => {
    const checkAndAutoGenerate = async () => {
      const today = new Date();
      if (today.getDate() >= 10) {
        const currentTitle = getCurrentMonthTitle();
        const q = query(
          collection(db, "salaries"),
          where("title", "==", currentTitle)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) await handleAutoGenerate(true);
      }
    };
    const timer = setTimeout(() => {
      checkAndAutoGenerate();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleMarkPaid = (id, name) => {
    setAlertTitle("Confirm");
    setAlertMessage(`Mark ${name} as PAID?`);
    setAlertType("warning");
    setAlertConfirmAction(() => () => performMarkPaid(id));
    setAlertVisible(true);
  };

  const performMarkPaid = async (id) => {
    setAlertVisible(false);
    try {
        await updateDoc(doc(db, "salaries", id), {
            status: "Paid",
            paidAt: new Date().toISOString(),
        });
        showToast("Salary marked as paid.", "success");
    } catch (e) {
        showToast("Update failed: " + e.message, "error");
    }
  };

  const handleAutoGenerate = async (isSilent = false) => {
    const currentTitle = getCurrentMonthTitle();
    
    const runGeneration = async () => {
      setAlertVisible(false);
      setGenerating(true);
      try {
        const teachersQ = query(
          collection(db, "users"),
          where("role", "==", "teacher"),
          where("isApproved", "==", true)
        );
        const teachersSnap = await getDocs(teachersQ);

        const salaryQ = query(
          collection(db, "salaries"),
          where("title", "==", currentTitle)
        );
        const salarySnap = await getDocs(salaryQ);
        const paidTeacherIds = salarySnap.docs.map(
          (doc) => doc.data().teacherId
        );

        const batch = writeBatch(db);
        let count = 0;

        teachersSnap.forEach((docSnap) => {
          const teacher = docSnap.data();
          if (
            teacher.salaryType === "Fixed" &&
            !paidTeacherIds.includes(docSnap.id)
          ) {
            const newRef = doc(collection(db, "salaries"));
            batch.set(newRef, {
              teacherId: docSnap.id,
              teacherName: teacher.name,
              teacherEmail: teacher.email,
              title: currentTitle,
              amount: teacher.salary || "0",
              status: "Pending",
              date: new Date().toLocaleDateString("en-GB"),
              createdAt: new Date().toISOString(),
            });
            count++;
          }
        });

        if (count > 0) {
          await batch.commit();
          if (!isSilent) showToast(`Generated ${count} Fixed Salaries.`, "success");
        } else if (!isSilent) {
          showToast("No fixed-salary teachers pending.", "warning"); // warning looks like info
        }
      } catch (error) {
        console.log(error);
      } finally {
        setGenerating(false);
      }
    };

    if (isSilent) await runGeneration();
    else {
        setAlertTitle("Generate Salaries?");
        setAlertMessage("Generate for all Fixed Salary staff?");
        setAlertType("warning");
        setAlertConfirmAction(() => runGeneration);
        setAlertVisible(true);
    }
  };

  const handleRecordManual = async () => {
    if (!selectedTeacher || !title.trim() || !amount.trim()) {
      showToast("Please select a teacher and fill all fields.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "salaries"), {
        teacherId: selectedTeacher.id,
        teacherName: selectedTeacher.name,
        teacherEmail: selectedTeacher.email,
        title: title,
        amount: amount,
        status: status,
        date: new Date().toLocaleDateString("en-GB"),
        createdAt: new Date().toISOString(),
      });
      setIsAdding(false);
      setSelectedTeacher(null);
      setTitle("");
      setAmount("");
      showToast("Salary Recorded!", "success");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }) => (
    <SalaryItemCard item={item} onMarkPaid={handleMarkPaid} colors={colors} />
  );

  return (
    <SafeAreaView className="flex-1 bg-[#282C34] pt-8">
      <StatusBar backgroundColor="#282C34" barStyle="light-content" />

      <CustomAlert 
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onCancel={() => setAlertVisible(false)}
        onConfirm={alertConfirmAction}
        confirmText="Confirm"
      />

      <CustomToast 
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />

      <View className="px-4 pb-4 mt-5 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Salary Ledger</Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => handleAutoGenerate(false)}
            disabled={generating}
            className="mr-4"
          >
            {generating ? (
              <ActivityIndicator size="small" color="#f49b33" />
            ) : (
              <Ionicons name="flash" size={28} color="#f49b33" />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsAdding(!isAdding)}>
            <Ionicons
              name={isAdding ? "close-circle" : "add-circle"}
              size={32}
              color="#f49b33"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-4 mb-4">
        <View className="flex-row items-center bg-[#333842] rounded-lg px-3 border border-[#4C5361]">
          <Ionicons name="search" size={20} color="#BBBBBB" />
          <TextInput
            placeholder="Search Teacher..."
            placeholderTextColor="#BBBBBB"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 p-3 text-white"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#BBBBBB" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isAdding && (
        <ScrollView className="mx-4 my-4 p-5 bg-[#333842] rounded-xl border border-[#f49b33] max-h-96">
          <Text className="text-white mb-5 font-semibold">
            Manual Entry (Commission/Bonus)
          </Text>

          <TouchableOpacity
            onPress={() => setShowTeacherModal(true)}
            className="bg-[#282C34] p-3 rounded-lg border border-[#4C5361] mb-3 flex-row justify-between items-center"
          >
            <Text style={{ color: selectedTeacher ? colors.text : "#888" }}>
              {selectedTeacher
                ? selectedTeacher.name
                : "Select Commission Teacher"}
            </Text>
            <Ionicons name="caret-down" size={16} color="#888" />
          </TouchableOpacity>

          {selectedTeacher && (
            <Text className="text-gray-400 text-xs mb-3 ml-1">
              {selectedTeacher.email}
            </Text>
          )}

          <TextInput
            placeholder="Details (e.g. 15 lectures @ 500)"
            value={title}
            onChangeText={setTitle}
            multiline={true}
            numberOfLines={3}
            placeholderTextColor="#888"
            style={{ textAlignVertical: "top" }}
            className="bg-[#282C34] text-white p-3 rounded-lg border border-[#4C5361] mb-3 h-24"
          />

          <TextInput
            placeholder="Amount"
            value={amount}
            onChangeText={setAmount}
            placeholderTextColor="#888"
            keyboardType="numeric"
            className="bg-[#282C34] text-white p-3 rounded-lg border border-[#4C5361] mb-3"
          />
          <TouchableOpacity
            onPress={handleRecordManual}
            disabled={submitting}
            className="bg-[#f49b33] p-3 rounded-lg items-center mt-5"
          >
            <Text className="text-[#282C34] font-bold">Save Record</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#f49b33" className="mt-10" />
      ) : (
        <FlatList
          data={filteredSalaries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={() => (
            <Text className="text-gray-500 text-center mt-10">
              No records found.
            </Text>
          )}
        />
      )}

      <Modal
        visible={showTeacherModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTeacherModal(false)}
      >
        <View className="flex-1 bg-black/80 justify-center items-center p-4">
          <View className="bg-[#333842] w-full max-h-[70%] rounded-xl p-4 border border-[#f49b33]">
            <Text className="text-[#f49b33] text-xl font-bold mb-4 text-center">
              Select Teacher
            </Text>

            {loadingTeachers ? (
              <ActivityIndicator color="#f49b33" />
            ) : commissionTeachers.length === 0 ? (
              <Text className="text-gray-400 text-center">
                No commission-based teachers found.
              </Text>
            ) : (
              <FlatList
                data={commissionTeachers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedTeacher(item);
                      setShowTeacherModal(false);
                    }}
                    className="p-3 mb-2 rounded border border-[#4C5361] bg-[#282C34]"
                  >
                    <Text className="text-white font-bold text-lg">
                      {item.name}
                    </Text>
                    <Text className="text-gray-400 text-xs">
                      Classes: {item.classesTaught?.join(", ")}
                    </Text>
                    <Text className="text-gray-400 text-xs">
                      Subjects: {item.subjects?.join(", ")}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity
              onPress={() => setShowTeacherModal(false)}
              className="bg-[#f49b33] p-3 rounded-lg mt-4"
            >
              <Text className="text-center font-bold text-[#282C34]">
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default TeacherSalaryReports;