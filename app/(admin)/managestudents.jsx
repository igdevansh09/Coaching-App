import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Modal,
  Linking,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { db } from "../../config/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  getDocs,
} from "firebase/firestore";

import CustomAlert from "../../components/CustomAlert";
import CustomToast from "../../components/CustomToast";

const CLASS_OPTIONS = [
  "CS", "Prep", "1st", "2nd", "3rd", "4th", "5th", 
  "6th", "7th", "8th", "9th", "10th", "11th", "12th"
];
const STREAM_OPTIONS = ["Science", "Commerce", "Arts"];

const SCIENCE_SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Economics", "English", "Computer Science"];
const COMMERCE_SUBJECTS = ["Accountancy", "Business Studies", "Economics", "English", "Computer Science"];
const ARTS_SUBJECTS = ["History", "Political Science", "Geography", "Economics", "English", "Computer Science"];
const JUNIOR_SUBJECTS = ["All Subjects", "Computer Science"];

const ManageStudents = () => {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [viewMode, setViewMode] = useState("active");

  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null); 

  const [approvalFee, setApprovalFee] = useState("5000");
  const [editingId, setEditingId] = useState(null);
  
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editClass, setEditClass] = useState("");
  const [editStream, setEditStream] = useState("");
  const [editSubjects, setEditSubjects] = useState([]);
  const [editFee, setEditFee] = useState("");

  const [activeModalType, setActiveModalType] = useState(null);

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

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "users"), where("role", "==", "student"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      if (viewMode === "pending") {
        setStudents(list.filter((s) => s.isApproved === false));
      } else {
        setStudents(list.filter((s) => s.isApproved !== false));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [viewMode]);

  useEffect(() => {
    if (editModalVisible) {
        if (editClass === "CS") {
            setEditStream("N/A");
            setEditSubjects(["N/A"]);
        } else if (editClass && !["11th", "12th"].includes(editClass)) {
            setEditStream("N/A");
        }
    }
  }, [editClass]);

  const getAvailableSubjects = (cls, strm) => {
    if (cls === "CS") return [];
    if (["11th", "12th"].includes(cls)) {
      if (strm === "Science") return SCIENCE_SUBJECTS;
      if (strm === "Commerce") return COMMERCE_SUBJECTS;
      if (strm === "Arts") return ARTS_SUBJECTS;
      return []; 
    }
    return JUNIOR_SUBJECTS;
  };

  const toggleSubject = (subject) => {
    const currentSubjects = editSubjects;
    const setFunc = setEditSubjects;

    if (currentSubjects.includes(subject)) {
      setFunc(currentSubjects.filter((s) => s !== subject));
    } else {
      setFunc([...currentSubjects, subject]);
    }
  };

  const handleCall = (phoneNumber) => {
    if (phoneNumber) Linking.openURL(`tel:${phoneNumber}`);
    else showToast("No phone number registered.", "error");
  };

  const openDetailModal = (student) => {
    setSelectedStudent(student);
    setDetailModalVisible(true);
  };

  const openEditModal = (student) => {
    setEditingId(student.id);
    setEditName(student.name);
    setEditPhone(student.phone || "");
    setEditClass(student.standard || "");
    setEditStream(student.stream || "");
    setEditSubjects(student.enrolledSubjects || []);
    setEditFee(student.monthlyFeeAmount || "");
    setEditModalVisible(true);
  };

  const handleUpdateStudent = async () => {
    if (!editName.trim() || !editClass || !editFee.trim()) {
        showToast("Name, Class and Fee are required.", "error");
        return;
    }
    if (["11th", "12th"].includes(editClass) && (!editStream || editStream === "N/A")) {
        showToast("Please select a Stream.", "error");
        return;
    }
    if (editClass !== "CS" && editSubjects.length === 0) {
        showToast("Please select subjects.", "error");
        return;
    }

    try {
        await updateDoc(doc(db, "users", editingId), {
            name: editName,
            phone: editPhone,
            standard: editClass,
            stream: editStream,
            enrolledSubjects: editSubjects,
            monthlyFeeAmount: editFee,
        });
        showToast("Student updated successfully!", "success");
        setEditModalVisible(false);
    } catch (error) {
        showToast(error.message, "error");
    }
  };

  const handleDelete = (id) => {
    setAlertTitle("Confirm Delete");
    setAlertMessage("Permanently delete this student and all their data?");
    setAlertType("warning");
    setAlertConfirmAction(() => () => performDelete(id));
    setAlertVisible(true);
  };

  const performDelete = async (id) => {
    setAlertVisible(false);
    setLoading(true);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "users", id));
      
      const feesQ = query(collection(db, "fees"), where("studentId", "==", id));
      const feesSnap = await getDocs(feesQ);
      feesSnap.forEach((doc) => batch.delete(doc.ref));

      const examsQ = query(collection(db, "exam_results"), where("studentId", "==", id));
      const examsSnap = await getDocs(examsQ);
      examsSnap.forEach((doc) => batch.delete(doc.ref));

      await batch.commit();
      showToast("Student deleted successfully.", "success");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const initiateApproval = (student) => {
    setSelectedStudent(student);
    setApproveModalVisible(true);
  };

  const confirmApproval = async () => {
      try {
        await updateDoc(doc(db, "users", selectedStudent.id), {
            isApproved: true,
            monthlyFeeAmount: approvalFee,
        });
        setApproveModalVisible(false);
        showToast("Student approved successfully!", "success");
      } catch (e) { 
        showToast(e.message, "error");
      }
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStudent = ({ item }) => (
    <View className="bg-[#333842] p-4 rounded-xl mb-3 flex-row justify-between items-center border border-[#4C5361]">
      <TouchableOpacity style={{ flex: 1 }} onPress={() => openDetailModal(item)}>
        <Text className="text-white font-bold text-lg">{item.name}</Text>
        <View className="mt-1 flex-row">
            <View className="bg-[#f49b33]/20 px-2 py-0.5 rounded">
                <Text className="text-[#f49b33] text-xs font-bold">Class: {item.standard}</Text>
            </View>
        </View>
        <Text className="text-gray-500 text-[10px] mt-1">Tap for details</Text>
      </TouchableOpacity>

      <View className="flex-row items-center">
        <TouchableOpacity onPress={() => handleCall(item.phone)} className="p-2 bg-blue-500/20 rounded-lg mr-2 border border-blue-500">
            <Ionicons name="call" size={18} color="#2196F3" />
        </TouchableOpacity>

        {viewMode === "pending" ? (
            <TouchableOpacity onPress={() => initiateApproval(item)} className="p-2 bg-green-500/20 rounded-lg mr-2 border border-green-500">
                <Ionicons name="checkmark" size={18} color="#4CAF50" />
            </TouchableOpacity>
        ) : (
            <TouchableOpacity onPress={() => openEditModal(item)} className="p-2 bg-yellow-500/20 rounded-lg mr-2 border border-yellow-500">
                <Ionicons name="pencil" size={18} color="#FFC107" />
            </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => handleDelete(item.id)} className="p-2 bg-red-500/10 rounded-lg border border-red-500/30">
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
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
        confirmText="Yes, Delete"
      />

      <CustomToast 
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />

      <Modal visible={detailModalVisible} animationType="fade" transparent={true} onRequestClose={() => setDetailModalVisible(false)}>
        <View className="flex-1 justify-center items-center bg-black/80 p-4">
            <View className="bg-[#333842] w-full rounded-xl p-6 border border-[#f49b33]">
                <Text className="text-white text-2xl font-bold mb-4 border-b border-gray-600 pb-2">{selectedStudent?.name}</Text>
                <View className="mb-4">
                    <Text className="text-gray-400 text-xs uppercase mb-1">Contact Info</Text>
                    <Text className="text-white text-base mb-1">📧 {selectedStudent?.email}</Text>
                    <TouchableOpacity onPress={() => handleCall(selectedStudent?.phone)} className="flex-row items-center">
                        <Text className="text-[#f49b33] text-base font-bold">📞 {selectedStudent?.phone || "N/A"}</Text>
                    </TouchableOpacity>
                </View>
                <View className="mb-4">
                    <Text className="text-gray-400 text-xs uppercase mb-1">Academic Info</Text>
                    <Text className="text-white text-base">Class: <Text className="font-bold">{selectedStudent?.standard}</Text></Text>
                    {selectedStudent?.stream !== "N/A" && <Text className="text-white text-base">Stream: {selectedStudent?.stream}</Text>}
                    <Text className="text-sm mt-1 text-gray-300">Subjects: {selectedStudent?.enrolledSubjects?.join(", ")}</Text>
                </View>
                <View className="mb-6">
                    <Text className="text-gray-400 text-xs uppercase mb-1">Financial Info</Text>
                    <Text className="text-[#4CAF50] text-xl font-bold">Fee: ₹{selectedStudent?.monthlyFeeAmount || "5000"}/month</Text>
                    <Text className="text-yellow-500 text-sm italic">{selectedStudent?.isApproved ? "Approved Student" : "Pending Approval"}</Text>
                </View>
                <TouchableOpacity onPress={() => setDetailModalVisible(false)} className="bg-[#f49b33] p-3 rounded-lg items-center">
                    <Text className="text-[#282C34] font-bold">Close</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      <Modal visible={editModalVisible} animationType="slide" transparent={true} onRequestClose={() => setEditModalVisible(false)}>
        <View className="flex-1 justify-center items-center bg-black/80 p-4">
            <View className="bg-[#333842] w-full rounded-xl p-5 border border-[#f49b33] max-h-[80%]">
                <Text className="text-white text-xl font-bold mb-4 text-center">Edit Student</Text>
                <ScrollView>
                    <Text className="text-gray-400 text-xs mb-1">Full Name</Text>
                    <TextInput value={editName} onChangeText={setEditName} className="bg-[#282C34] text-white p-3 rounded-lg border border-[#4C5361] mb-3"/>
                    <Text className="text-gray-400 text-xs mb-1">Phone</Text>
                    <TextInput value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" className="bg-[#282C34] text-white p-3 rounded-lg border border-[#4C5361] mb-3"/>
                    <View className="flex-row justify-between mb-3">
                        <TouchableOpacity onPress={() => setActiveModalType('class')} className={`bg-[#282C34] border border-[#4C5361] p-3 rounded-lg justify-center ${editClass === "CS" || (editClass && !["11th", "12th"].includes(editClass)) ? "w-full" : "w-[48%]"}`}>
                            <Text className="text-white">{editClass || "Class"}</Text>
                        </TouchableOpacity>
                        {["11th", "12th"].includes(editClass) && (
                            <TouchableOpacity onPress={() => setActiveModalType('stream')} className="bg-[#282C34] border border-[#4C5361] p-3 rounded-lg justify-center w-[48%]">
                                <Text className="text-white">{editStream || "Stream"}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {editClass !== "CS" && (
                        <>
                            <Text className="text-gray-400 text-xs mb-1">Subjects</Text>
                            <TouchableOpacity onPress={() => setActiveModalType('subject')} className="bg-[#282C34] border border-[#4C5361] p-3 rounded-lg justify-center mb-3">
                                <Text className="text-white" numberOfLines={1}>{editSubjects.length > 0 ? editSubjects.join(", ") : "Select Subjects"}</Text>
                            </TouchableOpacity>
                        </>
                    )}
                    <Text className="text-gray-400 text-xs mb-1">Monthly Fee (₹)</Text>
                    <TextInput value={editFee} onChangeText={setEditFee} keyboardType="numeric" className="bg-[#282C34] text-white p-3 rounded-lg border border-[#4C5361] mb-6 font-bold"/>
                    <View className="flex-row justify-between">
                        <TouchableOpacity onPress={() => setEditModalVisible(false)} className="bg-gray-600 px-6 py-3 rounded-lg"><Text className="text-white font-bold">Cancel</Text></TouchableOpacity>
                        <TouchableOpacity onPress={handleUpdateStudent} className="bg-[#f49b33] px-6 py-3 rounded-lg"><Text className="text-[#282C34] font-bold">Update</Text></TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={approveModalVisible} onRequestClose={() => setApproveModalVisible(false)}>
        <View className="flex-1 justify-center items-center bg-black/70">
          <View className="bg-[#333842] p-6 rounded-xl w-4/5 border border-[#f49b33]">
            <Text className="text-white text-xl font-bold mb-2">Approve Student</Text>
            <Text className="text-gray-400 mb-4">Set Fee for {selectedStudent?.name}</Text>
            <TextInput value={approvalFee} onChangeText={setApprovalFee} keyboardType="numeric" className="bg-[#282C34] text-white p-3 rounded-lg border border-[#4C5361] mb-6 text-lg font-bold" />
            <View className="flex-row justify-between">
              <TouchableOpacity onPress={() => setApproveModalVisible(false)} className="bg-gray-600 px-6 py-3 rounded-lg"><Text className="text-white font-bold">Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={confirmApproval} className="bg-[#f49b33] px-6 py-3 rounded-lg"><Text className="text-[#282C34] font-bold">Confirm</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!activeModalType} animationType="fade" transparent={true} onRequestClose={() => setActiveModalType(null)}>
        <View className="flex-1 bg-black/80 justify-center items-center p-4">
            <View className="bg-[#333842] w-full max-h-[60%] rounded-xl p-4 border border-[#f49b33]">
                <Text className="text-[#f49b33] text-xl font-bold mb-4 text-center">Select {activeModalType}</Text>
                <FlatList
                    data={
                        activeModalType === 'class' ? CLASS_OPTIONS :
                        activeModalType === 'stream' ? STREAM_OPTIONS :
                        getAvailableSubjects(editClass, editStream)
                    }
                    keyExtractor={item => item}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            onPress={() => {
                                if (activeModalType === 'class') {
                                    setEditClass(item);
                                    setActiveModalType(null);
                                } else if (activeModalType === 'stream') {
                                    setEditStream(item);
                                    setActiveModalType(null);
                                } else {
                                    toggleSubject(item);
                                }
                            }}
                            className={`p-3 mb-2 rounded border border-gray-600 items-center ${
                                (activeModalType === 'subject' && editSubjects.includes(item)) ? "bg-[#f49b33]" : ""
                            }`}
                        >
                            <Text className={`text-base ${(activeModalType === 'subject' && editSubjects.includes(item)) ? "text-black font-bold" : "text-white"}`}>{item}</Text>
                        </TouchableOpacity>
                    )}
                />
                <TouchableOpacity onPress={() => setActiveModalType(null)} className="bg-white p-3 rounded-lg mt-4"><Text className="text-center font-bold text-black">Close</Text></TouchableOpacity>
            </View>
        </View>
      </Modal>

      <View className="px-4 pt-6 pb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name="arrow-back" size={24} color="white" onPress={() => router.back()} />
          <Text className="text-white text-xl font-bold ml-4">Students Directory</Text>
        </View>
      </View>

      <View className="px-4 mb-4">
        <View className="flex-row items-center bg-[#333842] rounded-lg px-3 border border-[#4C5361]">
          <Ionicons name="search" size={20} color="#BBBBBB" />
          <TextInput placeholder="Search..." placeholderTextColor="#BBBBBB" value={searchQuery} onChangeText={setSearchQuery} className="flex-1 p-3 text-white"/>
        </View>
      </View>

      <View className="flex-row px-4 mb-4">
        <TouchableOpacity onPress={() => setViewMode("active")} className={`flex-1 py-2 items-center border-b-2 ${viewMode === "active" ? "border-[#f49b33]" : "border-transparent"}`}><Text className={`${viewMode === "active" ? "text-[#f49b33] font-bold" : "text-gray-400"}`}>Active</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setViewMode("pending")} className={`flex-1 py-2 items-center border-b-2 ${viewMode === "pending" ? "border-[#f49b33]" : "border-transparent"}`}><Text className={`${viewMode === "pending" ? "text-[#f49b33] font-bold" : "text-gray-400"}`}>Requests</Text></TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#f49b33" className="mt-10" />
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          renderItem={renderStudent}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={() => <Text className="text-gray-500 text-center mt-10">No students found.</Text>}
        />
      )}
    </SafeAreaView>
  );
};

export default ManageStudents;