import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useData } from "../context/DataContext";
import CustomDropdown from "../components/CustomDropdown";
import apiService from "../services/apiService";
import uuid from "react-native-uuid";
import { DateTime } from "luxon";

const BonusModal = ({ visible, onClose, userName, selectedKid, userType }) => {
  const { theme } = useTheme();
  const { familyData, refreshFamilyData } = useData();

  const [formData, setFormData] = useState({
    bonusType: userType === "kid" ? "activity" : "", // Kids only have activity option
    directMinutes: "",
    activityType: "",
    activityMinutes: "",
    reason: "",
    reasonMessage: "",
  });

  const getTodayDate = () => {
    // DateTime.local() gets the current time in the system's local timezone.
    // .toISODate() formats it as 'YYYY-MM-DD'.
    const today = DateTime.local().toISODate();
    return today;
  };

  // Get bonus activity settings for the current kid
  const getBonusActivitySettings = () => {
    let settings = {};
    if (userType === "parent" && selectedKid) {
      settings =
        familyData?.kidsData?.[selectedKid]?.settings?.bonusActivities || {};
    } else if (userType === "kid") {
      settings = familyData?.myData?.settings?.bonusActivities || {};
    }

    // Temporary debug logging
    console.log(
      "🎯 Bonus Activity Settings:",
      JSON.stringify(settings, null, 2)
    );

    return settings;
  };

  // Get available activity types for the kid
  const getAvailableActivities = () => {
    const bonusSettings = getBonusActivitySettings();
    const activities = [];

    Object.entries(bonusSettings).forEach(([activityId, activity]) => {
      if (activity.enabled) {
        const icons = {
          soccer: "⚽",
          reading: "📚",
          fitness: "💪",
          swimming: "🏊",
          running: "🏃",
          cycling: "🚴",
          basketball: "🏀",
          tennis: "🎾",
          chores: "🧹",
          homework: "📝",
          music: "🎵",
          art: "🎨",
        };

        const displayName =
          activityId.charAt(0).toUpperCase() + activityId.slice(1);

        activities.push({
          label: `${icons[activityId] || "🎯"} ${displayName}`,
          value: activityId,
          ratio: activity.ratio,
          description: activity.description,
        });
      }
    });

    return activities;
  };

  // Calculate current bonus for display (live calculation)
  const getCurrentBonus = () => {
    if (formData.activityType && formData.activityMinutes) {
      return calculateBonus(formData.activityMinutes, formData.activityType);
    }
    return 0;
  };

  // Calculate bonus minutes based on activity type and minutes
  const calculateBonus = (activityMinutes, activityType) => {
    if (!activityMinutes || !activityType) return 0;

    const bonusSettings = getBonusActivitySettings();
    const activity = bonusSettings[activityType];

    if (!activity || !activity.enabled) return 0;

    const ratio = activity.ratio || 0.5;

    // Calculate bonus (no daily max cap anymore)
    const bonusMinutes = Math.round(parseInt(activityMinutes) * ratio);

    // Debug logging
    console.log(`🧮 Calculating bonus for ${activityType}:`);
    console.log(`   Activity minutes: ${activityMinutes}`);
    console.log(`   Ratio: ${ratio}`);
    console.log(`   Bonus minutes: ${bonusMinutes}`);

    return bonusMinutes;
  };

  // Get ratio display text
  const getRatioDisplay = (activityType) => {
    const bonusSettings = getBonusActivitySettings();
    const activity = bonusSettings[activityType];
    if (!activity) return "";

    const ratio = activity.ratio;
    if (ratio === 0.5) return "1:2 ratio (1 bonus per 2 activity)";
    if (ratio === 1) return "1:1 ratio (1 bonus per 1 activity)";
    if (ratio === 2) return "2:1 ratio (2 bonus per 1 activity)";
    if (ratio === 0.25) return "1:4 ratio (1 bonus per 4 activity)";
    if (ratio === 4) return "4:1 ratio (4 bonus per 1 activity)";
    return `${ratio}:1 ratio`;
  };

  // Update form field
  const updateFormField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Quick time selection
  const selectQuickTime = (minutes, field) => {
    updateFormField(field, minutes.toString());
  };

  // Clear form
  const clearForm = () => {
    setFormData({
      bonusType: userType === "kid" ? "activity" : "",
      directMinutes: "",
      activityType: "",
      activityMinutes: "",
      reason: "",
      reasonMessage: "",
    });
  };

  // Close modal and clear form
  const handleClose = () => {
    clearForm();
    onClose();
  };

  // Validation
  const validateForm = () => {
    const { bonusType, directMinutes, activityType, activityMinutes, reason } =
      formData;

    if (userType === "parent") {
      if (!bonusType) return "Please select a bonus type";

      if (bonusType === "direct") {
        if (!directMinutes || parseInt(directMinutes) < 1)
          return "Direct bonus minutes required";
        if (!reason.trim()) return "Reason is required for direct bonus";
      } else if (bonusType === "activity") {
        if (!activityType) return "Please select an activity type";
        if (!activityMinutes || parseInt(activityMinutes) < 1)
          return "Activity minutes required";
      }
    } else {
      // Kids can only do activity bonuses
      if (!activityType) return "Please select an activity type";
      if (!activityMinutes || parseInt(activityMinutes) < 1)
        return "Activity minutes required";
    }

    return null;
  };

  // Submit handler
  const handleSubmit = async () => {
    const validation = validateForm();
    if (validation) {
      Alert.alert("Validation Error", validation);
      return;
    }

    try {
      const targetKidId = userType === "parent" ? selectedKid : userName;
      const familyId = "braithwaite_family_tracker";

      let sessionData;
      let successMessage;

      if (userType === "parent" && formData.bonusType === "direct") {
        // Parent direct bonus
        sessionData = {
          id: uuid.v4(),
          date: getTodayDate(),
          duration: parseInt(formData.directMinutes),
          bonusTime: parseInt(formData.directMinutes), // Direct bonus minutes
          bonus: true,
          countTowardsTotal: false,
          reason: formData.reason,
          reasonMessage: formData.reasonMessage || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: userName,
        };

        successMessage = `${formData.directMinutes} bonus minutes awarded!`;
      } else {
        // Activity-based bonus (both parent and kid)
        const activityMinutes = parseInt(formData.activityMinutes);
        const bonusMinutes = calculateBonus(
          activityMinutes,
          formData.activityType
        );
        const bonusSettings = getBonusActivitySettings();
        const activity = bonusSettings[formData.activityType];

        sessionData = {
          id: uuid.v4(),
          date: getTodayDate(),
          duration: activityMinutes, // Activity time
          bonusTime: bonusMinutes, // Earned screen time
          bonus: true,
          countTowardsTotal: false,
          activityType: formData.activityType,
          reason: activity?.description || `${formData.activityType} activity`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: userName,
        };

        successMessage =
          userType === "parent"
            ? `Activity Bonus Awarded! 🎉\n${activityMinutes} minutes of ${formData.activityType} activity\n${bonusMinutes} bonus screen time earned`
            : `Bonus Earned! 🎉\n${activityMinutes} minutes of ${formData.activityType} logged\n${bonusMinutes} bonus screen time earned`;
      }

      console.log("📤 SAVING BONUS TO BACKEND:", sessionData);

      // Save to backend
      const result = await apiService.addSession(
        familyId,
        targetKidId,
        sessionData
      );
      console.log("✅ BONUS SAVED:", result);

      // Refresh data
      refreshFamilyData();

      Alert.alert("Success", successMessage);
      handleClose();
    } catch (error) {
      console.error("❌ BONUS SAVE ERROR:", error);
      Alert.alert("Error", `Failed to add bonus: ${error.message}`);
    }
  };

  // Render quick time buttons
  const renderQuickTimeButtons = (field, currentValue) => (
    <View style={styles.quickTimeContainer}>
      {[15, 30, 45, 60].map((minutes) => (
        <TouchableOpacity
          key={minutes}
          style={[
            styles.quickTimeButton,
            {
              backgroundColor:
                currentValue === minutes.toString()
                  ? theme.buttonBackground
                  : theme.background,
              borderColor: theme.isDark ? "#444" : "#ddd",
            },
          ]}
          onPress={() => selectQuickTime(minutes, field)}
        >
          <Text
            style={[
              styles.quickTimeText,
              {
                color:
                  currentValue === minutes.toString()
                    ? theme.buttonText
                    : theme.text,
              },
            ]}
          >
            {minutes}m
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Common reasons for direct bonus
  const commonReasons = [
    "Good behavior",
    "Completed chores",
    "Helped sibling",
    "Good grades",
    "Following rules",
    "Being responsible",
    "Custom reason",
  ];

  const availableActivities = getAvailableActivities();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={[styles.container, { backgroundColor: theme.background }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.background }]}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {userType === "parent"
                ? "Award Bonus Time"
                : "Claim Activity Bonus"}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.headerCloseX}>
              <Text style={[styles.headerCloseXText, { color: theme.text }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Bonus Type Selection (Parents Only) */}
            {userType === "parent" && (
              <View style={styles.fieldContainer}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>
                  💰 Bonus Type
                </Text>
                <TouchableOpacity
                  style={[
                    styles.bonusTypeButton,
                    {
                      backgroundColor:
                        formData.bonusType === "direct"
                          ? theme.buttonBackground
                          : "transparent",
                      borderColor: theme.isDark ? "#444" : "#ddd",
                    },
                  ]}
                  onPress={() => updateFormField("bonusType", "direct")}
                >
                  <Text
                    style={[
                      styles.bonusTypeText,
                      {
                        color:
                          formData.bonusType === "direct"
                            ? theme.buttonText
                            : theme.text,
                      },
                    ]}
                  >
                    🎁 Direct Bonus Minutes
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.bonusTypeButton,
                    {
                      backgroundColor:
                        formData.bonusType === "activity"
                          ? theme.buttonBackground
                          : "transparent",
                      borderColor: theme.isDark ? "#444" : "#ddd",
                    },
                  ]}
                  onPress={() => updateFormField("bonusType", "activity")}
                >
                  <Text
                    style={[
                      styles.bonusTypeText,
                      {
                        color:
                          formData.bonusType === "activity"
                            ? theme.buttonText
                            : theme.text,
                      },
                    ]}
                  >
                    🏃 Activity-Based Bonus
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Direct Bonus Fields (Parents Only) */}
            {userType === "parent" && formData.bonusType === "direct" && (
              <>
                <View style={styles.fieldContainer}>
                  <Text style={[styles.fieldLabel, { color: theme.text }]}>
                    💰 Bonus Minutes
                  </Text>
                  {renderQuickTimeButtons(
                    "directMinutes",
                    formData.directMinutes
                  )}
                  <TextInput
                    style={[
                      styles.customInput,
                      {
                        backgroundColor: theme.menuBackground,
                        color: theme.text,
                        borderColor: theme.isDark ? "#444" : "#ddd",
                      },
                    ]}
                    value={formData.directMinutes}
                    onChangeText={(value) =>
                      updateFormField("directMinutes", value)
                    }
                    placeholder="Custom minutes"
                    placeholderTextColor={theme.isDark ? "#888" : "#666"}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    blurOnSubmit={true}
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={[styles.fieldLabel, { color: theme.text }]}>
                    📝 Reason
                  </Text>
                  <CustomDropdown
                    selectedValue={formData.reason}
                    onValueChange={(value) => updateFormField("reason", value)}
                    options={commonReasons.map((reason) => ({
                      label: reason,
                      value: reason,
                    }))}
                    placeholder="Select or type reason"
                    style={{ button: { width: "100%" } }}
                  />
                </View>

                {/* Custom Reason Message (when "Custom reason" selected) */}
                {formData.reason === "Custom reason" && (
                  <View style={styles.fieldContainer}>
                    <Text style={[styles.fieldLabel, { color: theme.text }]}>
                      💬 Custom Message
                    </Text>
                    <TextInput
                      style={[
                        styles.reasonInput,
                        {
                          backgroundColor: theme.menuBackground,
                          color: theme.text,
                          borderColor: theme.isDark ? "#444" : "#ddd",
                        },
                      ]}
                      value={formData.reasonMessage}
                      onChangeText={(value) =>
                        updateFormField("reasonMessage", value)
                      }
                      placeholder="Enter custom reason..."
                      placeholderTextColor={theme.isDark ? "#888" : "#666"}
                      multiline
                      returnKeyType="done"
                      blurOnSubmit={true}
                    />
                  </View>
                )}
              </>
            )}

            {/* Activity Bonus Fields */}
            {(formData.bonusType === "activity" || userType === "kid") && (
              <>
                <View style={styles.fieldContainer}>
                  <CustomDropdown
                    title="🏃 Activity Type"
                    selectedValue={formData.activityType}
                    onValueChange={(value) =>
                      updateFormField("activityType", value)
                    }
                    options={availableActivities}
                    placeholder="Select activity"
                    style={{ button: { width: "100%" } }}
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={[styles.fieldLabel, { color: theme.text }]}>
                    ⏱️ Activity Minutes
                  </Text>
                  {renderQuickTimeButtons(
                    "activityMinutes",
                    formData.activityMinutes
                  )}
                  <TextInput
                    style={[
                      styles.customInput,
                      {
                        backgroundColor: theme.menuBackground,
                        color: theme.text,
                        borderColor: theme.isDark ? "#444" : "#ddd",
                      },
                    ]}
                    value={formData.activityMinutes}
                    onChangeText={(value) =>
                      updateFormField("activityMinutes", value)
                    }
                    placeholder="Custom minutes"
                    placeholderTextColor={theme.isDark ? "#888" : "#666"}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    blurOnSubmit={true}
                  />
                </View>

                {/* Live Bonus Calculation */}
                {formData.activityType && (
                  <View
                    style={[
                      styles.bonusInfo,
                      {
                        backgroundColor: theme.isDark
                          ? "#1A3A1A"
                          : "rgba(76, 175, 80, 0.1)",
                      },
                    ]}
                  >
                    <Text style={[styles.bonusInfoTitle, { color: "#4CAF50" }]}>
                      📊 Activity Info
                    </Text>
                    <Text style={[styles.bonusInfoText, { color: theme.text }]}>
                      {getRatioDisplay(formData.activityType)}
                    </Text>
                    {formData.activityMinutes &&
                      parseInt(formData.activityMinutes) > 0 && (
                        <>
                          <Text
                            style={[
                              styles.bonusPreviewText,
                              { color: theme.text, marginTop: 8 },
                            ]}
                          >
                            {formData.activityMinutes} minutes of activity
                          </Text>
                          <Text
                            style={[
                              styles.bonusPreviewAmount,
                              { color: "#4CAF50" },
                            ]}
                          >
                            = {getCurrentBonus()} bonus minutes earned
                          </Text>
                        </>
                      )}
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Action Buttons Row */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.cancelButtonNew, { borderColor: theme.text }]}
              onPress={handleClose}
            >
              <Text style={[styles.cancelButtonTextNew, { color: theme.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButtonNew,
                { backgroundColor: theme.buttonBackground },
              ]}
              onPress={handleSubmit}
            >
              <Text
                style={[
                  styles.submitButtonTextNew,
                  { color: theme.buttonText },
                ]}
              >
                {userType === "parent" ? "Award Bonus" : "Claim Bonus"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  headerCloseX: {
    position: "absolute",
    right: 20,
    top: 20,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCloseXText: {
    fontSize: 22,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  bonusTypeButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  bonusTypeText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  quickTimeContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  quickTimeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickTimeText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  customInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    height: 80,
    textAlignVertical: "top",
  },
  bonusInfo: {
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
  },
  bonusInfoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  bonusInfoText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 4,
  },
  bonusPreviewText: {
    fontSize: 14,
    textAlign: "center",
  },
  bonusPreviewAmount: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 4,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cancelButtonNew: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  submitButtonNew: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  submitButtonTextNew: {
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButtonTextNew: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default BonusModal;
