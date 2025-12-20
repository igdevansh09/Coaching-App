import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { db } from "../../config/firebaseConfig";
import {
  collection,
  query,
  getDocs,
  onSnapshot,
  writeBatch,
  doc,
  where,
  updateDoc,
} from "firebase/firestore";

import CustomAlert from "../../components/CustomAlert";
import CustomToast from "../../components/CustomToast";

const FeeReports = () => {
  const router = useRouter();
  const [fees, setFees] = useState([]);
  const [filteredFees, setFilteredFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [selectedClassFilter, setSelectedClassFilter] = useState("All");

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

  const FILTER_OPTIONS = [
    "All",
    "Prep",
    "1st",
    "2nd",
    "3rd",
    "4th",
    "5th",
    "6th",
    "7th",
    "8th",
    "9th",
    "10th",
    "11th",
    "12th",
    "CS",
  ];

  const colors = {
    bg: "#282C34",
    card: "#333842",
    accent: "#f49b33",
    text: "#FFFFFF",
    subText: "#BBBBBB",
    paid: "#4CAF50",
    pending: "#FFC107",
  };

  useEffect(() => {
    const q = query(collection(db, "fees"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => {
        if (a.status === "Pending" && b.status !== "Pending") return -1;
        if (a.status !== "Pending" && b.status === "Pending") return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setFees(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedClassFilter === "All") {
      setFilteredFees(fees);
    } else {
      setFilteredFees(
        fees.filter((f) => f.studentClass === selectedClassFilter)
      );
    }
  }, [selectedClassFilter, fees]);

  const handleMarkPaid = (feeId, studentName) => {
    setAlertTitle("Confirm Payment");
    setAlertMessage(`Mark fee for ${studentName} as PAID?`);
    setAlertType("warning");
    setAlertConfirmAction(() => () => performMarkPaid(feeId));
    setAlertVisible(true);
  };

  const performMarkPaid = async (feeId) => {
    setAlertVisible(false);
    try {
      await updateDoc(doc(db, "fees", feeId), {
        status: "Paid",
        paidAt: new Date().toISOString(),
      });
      showToast("Status updated to Paid.", "success");
    } catch (error) {
      showToast("Could not update status.", "error");
    }
  };

  const getCurrentMonthTitle = () => {
    const date = new Date();
    const month = date.toLocaleString("default", { month: "long" });
    const year = date.getFullYear();
    return `Tuition Fee - ${month} ${year}`;
  };

  const handleAutoGenerate = async () => {
    const currentTitle = getCurrentMonthTitle();
    
    setAlertTitle("Generate Monthly Fees?");
    setAlertMessage(`Generate "${currentTitle}" using each student's specific fee amount?`);
    setAlertType("warning");
    setAlertConfirmAction(() => () => performAutoGenerate(currentTitle));
    setAlertVisible(true);
  };

  const performAutoGenerate = async (currentTitle) => {
    setAlertVisible(false);
    setGenerating(true);
    try {
        const studentsQ = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("isApproved", "==", true)
        );
        const studentsSnap = await getDocs(studentsQ);

        const feesQ = query(
        collection(db, "fees"),
        where("title", "==", currentTitle)
        );
        const feesSnap = await getDocs(feesQ);
        const existingFeeStudentIds = feesSnap.docs.map(
        (doc) => doc.data().studentId
        );

        const batch = writeBatch(db);
        let count = 0;

        studentsSnap.forEach((docSnap) => {
        const student = docSnap.data();

        if (!existingFeeStudentIds.includes(docSnap.id)) {
            const newFeeRef = doc(collection(db, "fees"));

            const feeAmount = student.monthlyFeeAmount || "5000";

            batch.set(newFeeRef, {
            studentId: docSnap.id,
            studentName: student.name,
            studentEmail: student.email,
            studentClass: student.standard || "N/A",
            title: currentTitle,
            amount: feeAmount,
            status: "Pending",
            date: new Date().toLocaleDateString("en-GB"),
            createdAt: new Date().toISOString(),
            });
            count++;
        }
        });

        if (count > 0) {
        await batch.commit();
        showToast(`Generated fees for ${count} students.`, "success");
        } else {
        showToast("All students are already billed for this month.", "warning");
        }
    } catch (error) {
        showToast(error.message, "error");
    } finally {
        setGenerating(false);
    }
  };

  const renderFeeItem = ({ item }) => (
    <View
      style={{ backgroundColor: colors.card }}
      className="p-4 rounded-xl mb-3 border border-[#4C5361]"
    >
      <View className="flex-row justify-between items-center mb-2">
        <View>
          <Text style={{ color: colors.text }} className="text-lg font-bold">
            {item.studentName}
          </Text>
          <Text style={{ color: colors.subText, fontSize: 12 }}>
            Class: {item.studentClass}
          </Text>
        </View>
        <View
          className="px-2 py-1 rounded"
          style={{
            backgroundColor:
              item.status === "Paid"
                ? "rgba(76, 175, 80, 0.2)"
                : "rgba(255, 193, 7, 0.2)",
          }}
        >
          <Text
            style={{
              color: item.status === "Paid" ? colors.paid : colors.pending,
              fontWeight: "bold",
              fontSize: 12,
            }}
          >
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={{ color: colors.text }} className="text-base">
        {item.title}
      </Text>
      <View className="flex-row justify-between items-end mt-2">
        <Text style={{ color: colors.subText }} className="text-xs">
          {item.date}
        </Text>
        <View className="flex-row items-center">
          <Text
            style={{ color: colors.accent }}
            className="text-lg font-bold mr-4"
          >
            ₹{item.amount}
          </Text>
          {item.status === "Pending" && (
            <TouchableOpacity
              onPress={() => handleMarkPaid(item.id, item.studentName)}
              style={{ backgroundColor: colors.paid }}
              className="px-3 py-2 rounded-lg"
            >
              <Text
                style={{ color: colors.bg, fontWeight: "bold", fontSize: 12 }}
              >
                Mark Paid
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
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
          <Text className="text-white text-xl font-bold">Fee Ledger</Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            onPress={handleAutoGenerate}
            disabled={generating}
            className="mr-2"
          >
            {generating ? (
              <ActivityIndicator size="small" color="#f49b33" />
            ) : (
              <Ionicons name="flash" size={28} color="#f49b33" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-4 mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {FILTER_OPTIONS.map((cls) => (
            <TouchableOpacity
              key={cls}
              onPress={() => setSelectedClassFilter(cls)}
              className={`mr-2 px-4 py-1.5 rounded-full border ${
                selectedClassFilter === cls
                  ? "bg-[#f49b33] border-[#f49b33]"
                  : "border-[#4C5361]"
              }`}
            >
              <Text
                className={`${
                  selectedClassFilter === cls
                    ? "text-[#282C34] font-bold"
                    : "text-gray-400"
                }`}
              >
                {cls}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#f49b33" className="mt-10" />
      ) : (
        <FlatList
          data={filteredFees}
          keyExtractor={(item) => item.id}
          renderItem={renderFeeItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={() => (
            <Text className="text-gray-500 text-center mt-10">
              No fee records found.
            </Text>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default FeeReports;