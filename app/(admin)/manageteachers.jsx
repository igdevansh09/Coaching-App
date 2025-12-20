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

const ManageTeachers = () => {
  const router = useRouter();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("active");
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null); 
  const [approvalSalary, setApprovalSalary] = useState("15000");
  const [approvalType, setApprovalType] = useState("Fixed");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSalary, setEditSalary] = useState("");
  const [editSalaryType, setEditSalaryType] = useState("Fixed");
  const [editClasses, setEditClasses] = useState([]);
  const [editSubjects, setEditSubjects] = useState([]);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); 
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
    const q = query(collection(db, "users"), where("role", "==", "teacher"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (viewMode === "pending") {
        setTeachers(list.filter((t) => t.isApproved === false));
      } else {
        setTeachers(list.filter((t) => t.isApproved !== false));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [viewMode]);

  useEffect(() => {
    const isJunior = editClasses.some(c => JUNIOR_CLASSES.includes(c));
    if (isJunior) {
      setEditSubjects(["All Subjects"]);
    } else {
      setEditSubjects(prev => prev.filter(s => s !== "All Subjects"));
    }
  }, [editClasses]);

  const isJuniorSelected = (isEditMode ? editClasses : []).some(c => JUNIOR_CLASSES.includes(c));
  const isOnlyCS = (isEditMode ? editClasses : []).length === 1 && (isEditMode ? editClasses : []).includes("CS");

  const toggleClass = (item) => {
    const currentClasses = isEditMode ? editClasses : [];
    const setClasses = isEditMode ? setEditClasses : () => {};

    const isTargetJunior = JUNIOR_CLASSES.includes(item);

    if (isTargetJunior) {
      if (currentClasses.includes(item)) {
        setClasses([]);
      } else {
        setClasses([item]); 
      }
    } else {
      let newSelection = currentClasses.filter(c => !JUNIOR_CLASSES.includes(c));
      if (newSelection.includes(item)) {
        newSelection = newSelection.filter(i => i !== item);
      } else {
        newSelection.push(item);
      }
      setClasses(newSelection);
    }
  };

  const toggleSubject = (item) => {
    const currentSubjects = isEditMode ? editSubjects : [];
    const setSubjects = isEditMode ? setEditSubjects : () => {};

    const isJunior = (isEditMode ? editClasses : []).some(c => JUNIOR_CLASSES.includes(c));
    
    if (isJunior) {
      showToast("Junior classes are set to 'All Subjects' by default.", "warning");
      return;
    }

    if (currentSubjects.includes(item)) {
      setSubjects(currentSubjects.filter((i) => i !== item));
    } else {
      setSubjects([...currentSubjects, item]);
    }
  };

  const handleCall = (phoneNumber) => {
    if (phoneNumber) Linking.openURL(`tel:${phoneNumber}`);
    else showToast("No phone number registered.", "error");
  };

  const openDetailModal = (teacher) => {
    setSelectedTeacher(teacher);
    setDetailModalVisible(true);
  };

  const openEditModal = (teacher) => {
    setEditingId(teacher.id);
    setEditName(teacher.name);
    setEditPhone(teacher.phone || "");
    setEditSalary(teacher.salary || "");
    setEditSalaryType(teacher.salaryType || "Fixed");
    setEditClasses(teacher.classesTaught || []);
    setEditSubjects(teacher.subjects || []);
    
    setIsEditMode(true);
    setEditModalVisible(true);
  };

  const handleUpdateTeacher = async () => {
    if (!editName.trim() || editClasses.length === 0) {
      showToast("Name and Classes are required.", "error");
      return;
    }
    if (editSalaryType === "Fixed" && !editSalary.trim()) {
      showToast("Please enter salary amount.", "error");
      return;
    }

    const isCS = editClasses.length === 1 && editClasses.includes("CS");
    const isJunior = editClasses.some(c => JUNIOR_CLASSES.includes(c));
    const skipSubjectCheck = isCS || isJunior;

    if (!skipSubjectCheck && editSubjects.length === 0) {
      showToast("Please select at least one subject.", "error");
      return;
    }

    try {
      const finalSubjects = isCS ? [] : editSubjects;

      await updateDoc(doc(db, "users", editingId), {
        name: editName,
        phone: editPhone,
        salary: editSalaryType === "Fixed" ? editSalary : "0",
        salaryType: editSalaryType,
        classesTaught: editClasses,
        subjects: finalSubjects,
      });

      showToast("Teacher updated successfully!", "success");
      setEditModalVisible(false);
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const handleDelete = (id) => {
    setAlertTitle("Remove Teacher?");
    setAlertMessage("This will delete their profile and all uploaded data.");
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
      
      const collections = ["homework", "materials", "attendance"];
      for (const colName of collections) {
          const q = query(collection(db, colName), where("teacherId", "==", id));
          const snap = await getDocs(q);
          snap.forEach((d) => batch.delete(d.ref));
      }

      await batch.commit();
      showToast("Teacher deleted successfully.", "success");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const initiateApproval = (teacher) => {
    setSelectedTeacher(teacher);
    setApproveModalVisible(true);
  };

  const confirmApproval = async () => {
    try {
      await updateDoc(doc(db, "users", selectedTeacher.id), {
        isApproved: true,
        salary: approvalType === "Fixed" ? approvalSalary : "0",
        salaryType: approvalType,
      });
      setApproveModalVisible(false);
      showToast("Teacher approved successfully!", "success");
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTeacher = ({ item }) => (
    <View className="bg-[#333842] p-4 rounded-xl mb-3 flex-row justify-between items-center border border-[#4C5361]">
      
      <TouchableOpacity 
        style={{ flex: 1 }} 
        onPress={() => openDetailModal(item)}
      >
        <Text className="text-white font-bold text-lg">{item.name}</Text>
        
        <View className="mt-1 flex-row flex-wrap">
          {item.classesTaught?.slice(0, 3).map((c, i) => (
            <View key={i} className="bg-[#f49b33]/20 px-2 py-0.5 rounded mr-1 mb-1">
              <Text className="text-[#f49b33] text-[10px] font-bold">{c}</Text>
            </View>
          ))}
          {item.classesTaught?.length > 3 && (
             <Text className="text-gray-500 text-xs self-center ml-1">+{item.classesTaught.length - 3} more</Text>
          )}
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
        confirmText="Yes, Remove"
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
                <Text className="text-white text-2xl font-bold mb-4 border-b border-gray-600 pb-2">{selectedTeacher?.name}</Text>
                
                <View className="mb-4">
                    <Text className="text-gray-400 text-xs uppercase mb-1">Contact Info</Text>
                    <Text className="text-white text-base mb-1">📧 {selectedTeacher?.email}</Text>
                    <TouchableOpacity onPress={() => handleCall(selectedTeacher?.phone)} className="flex-row items-center">
                        <Text className="text-[#f49b33] text-base font-bold">📞 {selectedTeacher?.phone || "N/A"}</Text>
                    </TouchableOpacity>
                </View>

                <View className="mb-4">
                    <Text className="text-gray-400 text-xs uppercase mb-1">Academic Info</Text>
                    <Text className="text-white text-base mb-1"><Text className="font-bold">Classes:</Text> {selectedTeacher?.classesTaught?.join(", ")}</Text>
                    <Text className=" text-sm text-gray-300"><Text className="font-bold">Subjects:</Text> {selectedTeacher?.subjects?.join(", ")}</Text>
                </View>

                <View className="mb-6">
                    <Text className="text-gray-400 text-xs uppercase mb-1">Financial Info</Text>
                    <Text className="text-[#4CAF50] text-xl font-bold">
                        {selectedTeacher?.salaryType === "Commission" ? "Commission Based" : `Salary: ₹${selectedTeacher?.salary}`}
                    </Text>
                    <Text className="text-yellow-500 text-sm italic">{selectedTeacher?.isApproved ? "Approved Teacher" : "Pending Approval"}</Text>
                </View>

                <TouchableOpacity onPress={() => setDetailModalVisible(false)} className="bg-[#f49b33] p-3 rounded-lg items-center">
                    <Text className="text-[#282C34] font-bold">Close</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      <Modal visible={editModalVisible} animationType="slide" transparent={true} onRequestClose={() => setEditModalVisible(false)}>
        <View className="flex-1 justify-center items-center bg-black/80 p-4">
            <View className="bg-[#333842] w-full rounded-xl p-5 border border-[#f49b33] max-h-[85%]">
                <Text className="text-white text-xl font-bold mb-4 text-center">Edit Teacher</Text>
                <ScrollView>
                    <Text className="text-gray-400 text-xs mb-1">Full Name</Text>
                    <TextInput value={editName} onChangeText={setEditName} className="bg-[#282C34] text-white p-3 rounded-lg border border-[#4C5361] mb-3"/>
                    
                    <Text className="text-gray-400 text-xs mb-1">Phone</Text>
                    <TextInput value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" className="bg-[#282C34] text-white p-3 rounded-lg border border-[#4C5361] mb-3"/>

                    <Text className="text-gray-400 text-xs mb-1">Classes</Text>
                    <TouchableOpacity onPress={() => setShowClassModal(true)} className="h-12 border border-[#4C5361] rounded px-3 justify-center bg-[#282C34] mb-3">
                        <Text className="text-white" numberOfLines={1}>{editClasses.length > 0 ? editClasses.join(", ") : "Select Classes"}</Text>
                    </TouchableOpacity>

                    {!isOnlyCS && (
                        <>
                            <Text className="text-gray-400 text-xs mb-1">Subjects</Text>
                            <TouchableOpacity 
                                onPress={() => setShowSubjectModal(true)} 
                                className={`h-12 border border-[#4C5361] rounded px-3 justify-center ${isJuniorSelected ? "bg-gray-700" : "bg-[#282C34]"} mb-3`}
                            >
                                <Text className={isJuniorSelected ? "text-gray-400" : "text-white"} numberOfLines={1}>
                                    {editSubjects.length > 0 ? editSubjects.join(", ") : "Select Subjects"}
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}

                    <View className="flex-row mb-3 bg-[#282C34] rounded-lg p-1 border border-[#4C5361]">
                        <TouchableOpacity onPress={() => setEditSalaryType("Fixed")} className={`flex-1 py-2 rounded ${editSalaryType === "Fixed" ? "bg-[#f49b33]" : ""}`}>
                            <Text className={`text-center font-bold ${editSalaryType === "Fixed" ? "text-[#282C34]" : "text-gray-400"}`}>Fixed</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditSalaryType("Commission")} className={`flex-1 py-2 rounded ${editSalaryType === "Commission" ? "bg-[#f49b33]" : ""}`}>
                            <Text className={`text-center font-bold ${editSalaryType === "Commission" ? "text-[#282C34]" : "text-gray-400"}`}>Commission</Text>
                        </TouchableOpacity>
                    </View>

                    {editSalaryType === "Fixed" && (
                        <TextInput value={editSalary} onChangeText={setEditSalary} keyboardType="numeric" className="bg-[#282C34] text-white p-3 rounded-lg border border-[#4C5361] mb-6 font-bold"/>
                    )}

                    <View className="flex-row justify-between">
                        <TouchableOpacity onPress={() => setEditModalVisible(false)} className="bg-gray-600 px-6 py-3 rounded-lg"><Text className="text-white font-bold">Cancel</Text></TouchableOpacity>
                        <TouchableOpacity onPress={handleUpdateTeacher} className="bg-[#f49b33] px-6 py-3 rounded-lg"><Text className="text-[#282C34] font-bold">Update</Text></TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={approveModalVisible} onRequestClose={() => setApproveModalVisible(false)}>
        <View className="flex-1 justify-center items-center bg-black/70">
          <View className="bg-[#333842] p-6 rounded-xl w-4/5 border border-[#f49b33]">
            <Text className="text-white text-xl font-bold mb-4">Approve Teacher</Text>
            <View className="flex-row mb-4 bg-[#282C34] rounded-lg p-1">
              <TouchableOpacity onPress={() => setApprovalType("Fixed")} className={`flex-1 py-2 rounded ${approvalType === "Fixed" ? "bg-[#f49b33]" : ""}`}>
                <Text className={`text-center font-bold ${approvalType === "Fixed" ? "text-[#282C34]" : "text-gray-400"}`}>Fixed Salary</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setApprovalType("Commission")} className={`flex-1 py-2 rounded ${approvalType === "Commission" ? "bg-[#f49b33]" : ""}`}>
                <Text className={`text-center font-bold ${approvalType === "Commission" ? "text-[#282C34]" : "text-gray-400"}`}>Commission</Text>
              </TouchableOpacity>
            </View>
            {approvalType === "Fixed" && (
                <TextInput value={approvalSalary} onChangeText={setApprovalSalary} keyboardType="numeric" className="bg-[#282C34] text-white p-3 rounded-lg border border-[#4C5361] mb-6 text-lg font-bold" />
            )}
            <View className="flex-row justify-between">
              <TouchableOpacity onPress={() => setApproveModalVisible(false)} className="bg-gray-600 px-6 py-3 rounded-lg"><Text className="text-white font-bold">Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={confirmApproval} className="bg-[#f49b33] px-6 py-3 rounded-lg"><Text className="text-[#282C34] font-bold">Approve</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showClassModal} animationType="slide" transparent={true} onRequestClose={() => setShowClassModal(false)}>
        <View className="flex-1 bg-black/80 justify-center items-center p-4">
          <View className="bg-[#333842] w-full max-h-[60%] rounded-xl p-4 border border-[#f49b33]">
            <Text className="text-[#f49b33] text-xl font-bold mb-4 text-center">Select Classes</Text>
            <FlatList
              data={CLASS_OPTIONS}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => toggleClass(item)} className={`flex-row justify-between items-center p-3 mb-2 rounded border ${editClasses.includes(item) ? "bg-[#f49b33] border-[#f49b33]" : "border-gray-600"}`}>
                  <Text className={`text-base ${editClasses.includes(item) ? "text-black font-bold" : "text-white"}`}>{item}</Text>
                  {editClasses.includes(item) && <Ionicons name="checkmark-circle" size={20} color="black" />}
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
                <TouchableOpacity onPress={() => toggleSubject(item)} className={`flex-row justify-between items-center p-3 mb-2 rounded border ${editSubjects.includes(item) ? "bg-[#f49b33] border-[#f49b33]" : "border-gray-600"} ${isJuniorSelected ? "opacity-50" : ""}`}>
                  <Text className={`text-base ${editSubjects.includes(item) ? "text-black font-bold" : "text-white"}`}>{item}</Text>
                  {editSubjects.includes(item) && <Ionicons name="checkmark-circle" size={20} color="black" />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setShowSubjectModal(false)} className="bg-white p-3 rounded-lg mt-4"><Text className="text-center font-bold text-black">Done</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View className="px-4 pt-6 pb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name="arrow-back" size={24} color="white" onPress={() => router.back()} />
          <Text className="text-white text-xl font-bold ml-4">Teachers Staff</Text>
        </View>
      </View>

      <View className="px-4 mb-4">
        <View className="flex-row items-center bg-[#333842] rounded-lg px-3 border border-[#4C5361]">
          <Ionicons name="search" size={20} color="#BBBBBB" />
          <TextInput placeholder="Search Teachers..." placeholderTextColor="#BBBBBB" value={searchQuery} onChangeText={setSearchQuery} className="flex-1 p-3 text-white"/>
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery("")}><Ionicons name="close-circle" size={20} color="#BBBBBB" /></TouchableOpacity>}
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
          data={filteredTeachers}
          keyExtractor={(item) => item.id}
          renderItem={renderTeacher}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={() => <Text className="text-gray-500 text-center mt-10">No teachers found.</Text>}
        />
      )}
    </SafeAreaView>
  );
};

export default ManageTeachers;