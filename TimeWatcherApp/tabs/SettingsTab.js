import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useData } from "../context/DataContext";
import CustomDropdown from "../components/CustomDropdown";
import apiService from "../services/apiService";
import AddAppModal from "../components/AddAppModal";

const SettingsTab = ({ userName, selectedKid, onKidChange }) => {
  const { theme } = useTheme();
  const { familyData, updateLocalFamilyData } = useData();

  const [settingsMode, setSettingsMode] = useState("individual");
  const [hasChanges, setHasChanges] = useState(false);
  const [localSettings, setLocalSettings] = useState({});
  const [showAddAppModal, setShowAddAppModal] = useState(false);
  const [globalAppsLocal, setGlobalAppsLocal] = useState({});

  const kidsCount = familyData?.kidsData
    ? Object.keys(familyData.kidsData).length
    : 0;
  const showMasterTab = kidsCount > 1;
  const currentKidData = selectedKid
    ? familyData?.kidsData?.[selectedKid]
    : null;
  const currentKidSettings = currentKidData?.settings || {};

  // Initialize local settings when kid changes or component mounts
  useEffect(() => {
    if (settingsMode === "individual" && currentKidSettings) {
      setLocalSettings(JSON.parse(JSON.stringify(currentKidSettings)));
      setHasChanges(false);
    } else if (settingsMode === "master") {
      // Initialize with template settings for master mode
      const firstKidSettings = familyData?.kidsData
        ? Object.values(familyData.kidsData)[0]?.settings
        : {};
      setLocalSettings(JSON.parse(JSON.stringify(firstKidSettings || {})));
      setHasChanges(false);
    }

    // Initialize global apps whenever family data changes
    if (familyData?.settings?.availableApps) {
      setGlobalAppsLocal(JSON.parse(JSON.stringify(familyData.settings.availableApps)));
    }
  }, [selectedKid, settingsMode, familyData?.lastUpdated]);

  const handleAddApp = (appId, appData) => {
    const updatedApps = {
      ...globalAppsLocal,
      [appId]: appData
    };
    setGlobalAppsLocal(updatedApps);
    setHasChanges(true);
  };

  const handleRemoveApp = (appId) => {
    const app = globalAppsLocal[appId];
    if (!app?.custom) {
      Alert.alert('Error', 'Cannot remove built-in apps');
      return;
    }

    Alert.alert(
      'Remove App',
      `Are you sure you want to remove ${app.displayName}? This will affect all children.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedApps = { ...globalAppsLocal };
            delete updatedApps[appId];
            setGlobalAppsLocal(updatedApps);
            setHasChanges(true);
          }
        }
      ]
    );
  };

  const handleGlobalAppToggle = (appId, enabled) => {
    const updatedApps = {
      ...globalAppsLocal,
      [appId]: {
        ...globalAppsLocal[appId],
        available: enabled
      }
    };
    setGlobalAppsLocal(updatedApps);
    setHasChanges(true);
  };

  const handleSettingChange = (path, value) => {
    setHasChanges(true);
    const pathArray = path.split(".");
    const newSettings = JSON.parse(JSON.stringify(localSettings));

    let current = newSettings;
    for (let i = 0; i < pathArray.length - 1; i++) {
      if (!current[pathArray[i]]) {
        current[pathArray[i]] = {};
      }
      current = current[pathArray[i]];
    }
    current[pathArray[pathArray.length - 1]] = value;

    setLocalSettings(newSettings);
    console.log(`Setting changed: ${path} = ${value}`);
  };

  const handleSave = async () => {
    try {
      if (settingsMode === "individual") {
        // Save individual settings to backend
        console.log("Saving individual settings for:", selectedKid);
        console.log("Settings:", localSettings);

        // Use the new API method
        const result = await apiService.updateKidSettings(
          "braithwaite_family_tracker",
          selectedKid,
          localSettings
        );
        console.log("API response:", result);

        // Update local family data only after successful API call
        const updatedFamilyData = JSON.parse(JSON.stringify(familyData));
        updatedFamilyData.kidsData[selectedKid].settings = localSettings;
        updateLocalFamilyData(updatedFamilyData);

        Alert.alert("Success", `Settings saved for ${currentKidData?.name}!`);
      } else {
        // Apply master settings to all kids
        console.log("Applying master settings to all kids");
        console.log("Settings:", localSettings);

        // Use the new master settings API method
        const result = await apiService.applyMasterSettings(
          "braithwaite_family_tracker",
          localSettings
        );
        console.log("Master settings API response:", result);

        // Update local family data for all kids
        const updatedFamilyData = JSON.parse(JSON.stringify(familyData));
        Object.keys(updatedFamilyData.kidsData).forEach((kidId) => {
          updatedFamilyData.kidsData[kidId].settings = JSON.parse(
            JSON.stringify(localSettings)
          );
        });
        updateLocalFamilyData(updatedFamilyData);

        Alert.alert("Success", "Master settings applied to all children!");
      }

      // Save global apps if they changed
      if (JSON.stringify(globalAppsLocal) !== JSON.stringify(familyData?.settings?.availableApps)) {
        console.log("Saving global apps:", globalAppsLocal);
        
        const appsResult = await apiService.updateAvailableApps(
          "braithwaite_family_tracker",
          globalAppsLocal
        );
        console.log("Apps API response:", appsResult);

        // Update local family data with new apps
        const updatedFamilyData = JSON.parse(JSON.stringify(familyData));
        if (!updatedFamilyData.settings) updatedFamilyData.settings = {};
        updatedFamilyData.settings.availableApps = globalAppsLocal;
        updateLocalFamilyData(updatedFamilyData);

        console.log("✅ Global apps saved successfully");
      }

      setHasChanges(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      Alert.alert("Error", "Failed to save settings. Please try again.");
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Settings",
      "Are you sure you want to reset all changes?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            if (settingsMode === "individual") {
              setLocalSettings(JSON.parse(JSON.stringify(currentKidSettings)));
            } else {
              const firstKidSettings =
                Object.values(familyData?.kidsData || {})[0]?.settings || {};
              setLocalSettings(JSON.parse(JSON.stringify(firstKidSettings)));
            }
            
            // Reset global apps to original state
            if (familyData?.settings?.availableApps) {
              setGlobalAppsLocal(JSON.parse(JSON.stringify(familyData.settings.availableApps)));
            }
            
            setHasChanges(false);
          },
        },
      ]
    );
  };

  const renderTabButton = (mode, title) => (
    <TouchableOpacity
      key={mode}
      style={[
        styles.tabButton,
        {
          backgroundColor:
            settingsMode === mode ? theme.buttonBackground : "transparent",
          borderBottomWidth: settingsMode === mode ? 2 : 0,
          borderBottomColor: theme.buttonBackground,
        },
      ]}
      onPress={() => setSettingsMode(mode)}
    >
      <Text
        style={[
          styles.tabText,
          {
            color: settingsMode === mode ? theme.buttonText : theme.text,
            fontWeight: settingsMode === mode ? "600" : "400",
          },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderTimeInput = (label, path, placeholder = "00:00") => (
    <View style={styles.inputRow}>
      <Text style={[styles.inputLabel, { color: theme.text }]}>{label}:</Text>
      <TextInput
        style={[
          styles.timeInput,
          {
            backgroundColor: theme.menuBackground,
            color: theme.text,
            borderColor: theme.isDark ? "#444" : "#ddd",
          },
        ]}
        value={getValueByPath(localSettings, path) || ""}
        onChangeText={(text) => handleSettingChange(path, text)}
        placeholder={placeholder}
        placeholderTextColor={theme.isDark ? "#888" : "#666"}
      />
    </View>
  );

  const renderNumberInput = (
    label,
    path,
    placeholder = "0",
    unit = "minutes"
  ) => (
    <View style={styles.inputRow}>
      <Text style={[styles.inputLabel, { color: theme.text }]}>{label}:</Text>
      <TextInput
        style={[
          styles.numberInput,
          {
            backgroundColor: theme.menuBackground,
            color: theme.text,
            borderColor: theme.isDark ? "#444" : "#ddd",
          },
        ]}
        value={getValueByPath(localSettings, path)?.toString() || ""}
        onChangeText={(text) => handleSettingChange(path, parseInt(text) || 0)}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={theme.isDark ? "#888" : "#666"}
      />
      <Text style={[styles.inputUnit, { color: theme.text }]}>{unit}</Text>
    </View>
  );

  const renderFloatInput = (label, path, placeholder = "0") => (
    <View style={styles.inputRow}>
      <Text style={[styles.inputLabel, { color: theme.text }]}>{label}:</Text>
      <TextInput
        style={[
          styles.numberInput,
          {
            backgroundColor: theme.menuBackground,
            color: theme.text,
            borderColor: theme.isDark ? "#444" : "#ddd",
          },
        ]}
        value={getValueByPath(localSettings, path)?.toString() || ""}
        onChangeText={(text) =>
          handleSettingChange(path, parseFloat(text) || 0)
        }
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={theme.isDark ? "#888" : "#666"}
      />
    </View>
  );

  const renderSwitchInput = (label, path) => (
    <View style={styles.switchRow}>
      <Text style={[styles.switchLabel, { color: theme.text }]}>{label}</Text>
      <Switch
        value={getValueByPath(localSettings, path) || false}
        onValueChange={(value) => handleSettingChange(path, value)}
        trackColor={{ false: "#ccc", true: theme.buttonBackground }}
        thumbColor={getValueByPath(localSettings, path) ? "#fff" : "#f4f3f4"}
      />
    </View>
  );

  // Helper function to get nested values
  const getValueByPath = (obj, path) => {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  };

  // NEW: Dynamic Available Apps Section
  const renderAvailableAppsSection = () => (
    <View style={[styles.section, { backgroundColor: theme.menuBackground }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        📱 Available Apps
      </Text>
      <Text style={[styles.sectionDescription, { color: theme.text }]}>
        Apps that kids can select from during sessions (applies to all children)
      </Text>

      {/* Render existing apps dynamically */}
      {Object.entries(globalAppsLocal).map(([appId, app]) => (
        <View key={appId} style={styles.appRule}>
          <View style={styles.appHeader}>
            <Text style={[styles.appName, { color: theme.text }]}>
              {app.icon} {app.displayName}
            </Text>
            {app.custom && (
              <TouchableOpacity 
                style={styles.removeAppButton}
                onPress={() => handleRemoveApp(appId)}
              >
                <Text style={styles.removeAppText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: theme.text }]}>Available</Text>
            <Switch
              value={app.available || false}
              onValueChange={(value) => handleGlobalAppToggle(appId, value)}
              trackColor={{ false: "#ccc", true: theme.buttonBackground }}
              thumbColor={app.available ? "#fff" : "#f4f3f4"}
            />
          </View>

          {app.description && (
            <Text style={[styles.appDescription, { color: theme.text }]}>
              {app.description}
            </Text>
          )}
          
          {app.hasActivityToggle && (
            <Text style={[styles.appDescription, { color: theme.text }]}>
              Has activity toggle - doesn't count when exercising
            </Text>
          )}
          
          {app.freeMinutes && (
            <Text style={[styles.appDescription, { color: theme.text }]}>
              First {app.freeMinutes} minutes free daily, then counts toward total
            </Text>
          )}
          
          {!app.countsTowardTotal && app.countsTowardTotal !== "conditional" && app.countsTowardTotal !== "partial" && (
            <Text style={[styles.appDescription, { color: theme.text }]}>
              Free time - does not count toward daily limit
            </Text>
          )}
        </View>
      ))}

      {/* Add App Button */}
      <TouchableOpacity 
        style={[styles.addAppButton, { borderColor: theme.buttonBackground }]}
        onPress={() => setShowAddAppModal(true)}
      >
        <Text style={[styles.addAppText, { color: theme.buttonBackground }]}>
          + Add New App
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderIndividualSettings = () => (
    <ScrollView
      style={styles.settingsContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Kid Selector */}
      {familyData?.kidsData && Object.keys(familyData.kidsData).length > 0 && (
        <View style={styles.section}>
          <CustomDropdown
            title="👨‍👩‍👧‍👦 SELECT CHILD"
            selectedValue={selectedKid}
            onValueChange={onKidChange}
            options={Object.keys(familyData.kidsData).map((kidId) => ({
              label: familyData.kidsData[kidId].name,
              value: kidId,
            }))}
            placeholder="Select a child"
            style={{
              button: { width: "100%", marginVertical: 15 },
              title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
            }}
          />
        </View>
      )}

      {selectedKid && (
        <>
          {/* Time Limits Section */}
          <View
            style={[styles.section, { backgroundColor: theme.menuBackground }]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              ⏰ Daily Time Limits
            </Text>

            <Text style={[styles.subsectionTitle, { color: theme.text }]}>
              Weekday Schedule
            </Text>
            {renderNumberInput(
              "Daily Total",
              "limits.weekday.dailyTotal",
              "90"
            )}

            <Text style={[styles.subsectionTitle, { color: theme.text }]}>
              Weekend Schedule
            </Text>
            {renderNumberInput(
              "Daily Total",
              "limits.weekend.dailyTotal",
              "120"
            )}
          </View>

          {/* Bedtime Restrictions */}
          <View
            style={[styles.section, { backgroundColor: theme.menuBackground }]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              🌙 Bedtime Restrictions
            </Text>

            <Text style={[styles.subsectionTitle, { color: theme.text }]}>
              Weekday Schedule
            </Text>
            {renderTimeInput(
              "Bedtime",
              "bedtimeRestrictions.weekday.bedtime",
              "20:30"
            )}
            {renderTimeInput(
              "Wake Time",
              "bedtimeRestrictions.weekday.wakeTime",
              "07:00"
            )}

            <Text style={[styles.subsectionTitle, { color: theme.text }]}>
              Weekend Schedule
            </Text>
            {renderTimeInput(
              "Bedtime",
              "bedtimeRestrictions.weekend.bedtime",
              "21:30"
            )}
            {renderTimeInput(
              "Wake Time",
              "bedtimeRestrictions.weekend.wakeTime",
              "08:00"
            )}
          </View>

          {/* Bonus Activities */}
          <View
            style={[styles.section, { backgroundColor: theme.menuBackground }]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              💰 Bonus Activities
            </Text>

            {/* Soccer */}
            <View style={styles.bonusActivity}>
              <Text style={[styles.activityName, { color: theme.text }]}>
                ⚽ Soccer
              </Text>
              {renderSwitchInput("Enabled", "bonusActivities.soccer.enabled")}
              {getValueByPath(
                localSettings,
                "bonusActivities.soccer.enabled"
              ) && (
                <>
                  {renderFloatInput(
                    "Ratio (screen:activity)",
                    "bonusActivities.soccer.ratio"
                  )}
                  {renderNumberInput(
                    "Daily Max",
                    "bonusActivities.soccer.dailyMax",
                    "30"
                  )}
                </>
              )}
            </View>

            {/* Fitness */}
            <View style={styles.bonusActivity}>
              <Text style={[styles.activityName, { color: theme.text }]}>
                🏃 Fitness
              </Text>
              {renderSwitchInput("Enabled", "bonusActivities.fitness.enabled")}
              {getValueByPath(
                localSettings,
                "bonusActivities.fitness.enabled"
              ) && (
                <>
                  {renderFloatInput(
                    "Ratio (screen:activity)",
                    "bonusActivities.fitness.ratio"
                  )}
                  {renderNumberInput(
                    "Daily Max",
                    "bonusActivities.fitness.dailyMax",
                    "30"
                  )}
                </>
              )}
            </View>

            {/* Reading */}
            <View style={styles.bonusActivity}>
              <Text style={[styles.activityName, { color: theme.text }]}>
                📚 Reading
              </Text>
              {renderSwitchInput("Enabled", "bonusActivities.reading.enabled")}
              {getValueByPath(
                localSettings,
                "bonusActivities.reading.enabled"
              ) && (
                <>
                  {renderFloatInput(
                    "Ratio (screen:activity)",
                    "bonusActivities.reading.ratio"
                  )}
                  {renderNumberInput(
                    "Daily Max",
                    "bonusActivities.reading.dailyMax",
                    "30"
                  )}
                </>
              )}
            </View>
          </View>

          {/* Dynamic Available Apps Section */}
          {renderAvailableAppsSection()}

          {/* Parent Approval Settings */}
          <View
            style={[styles.section, { backgroundColor: theme.menuBackground }]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              ✋ Parent Approval Required
            </Text>
            {renderSwitchInput(
              "Bonus Time Requests",
              "requireParentApproval.bonusTime"
            )}
            {renderSwitchInput(
              "Session Edits",
              "requireParentApproval.sessionEdits"
            )}
          </View>
        </>
      )}
    </ScrollView>
  );

  const renderMasterSettings = () => (
    <ScrollView
      style={styles.settingsContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.section, { backgroundColor: theme.menuBackground }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          👑 Master Settings
        </Text>
        <Text style={[styles.sectionDescription, { color: theme.text }]}>
          Configure settings that will be applied to all children. This will
          overwrite individual settings.
        </Text>
        <Text style={[styles.warningText, { color: "#ff8800" }]}>
          ⚠️ Warning: Applying master settings will overwrite all individual
          child settings!
        </Text>
      </View>

      {/* Time Limits Section */}
      <View style={[styles.section, { backgroundColor: theme.menuBackground }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          ⏰ Daily Time Limits
        </Text>

        <Text style={[styles.subsectionTitle, { color: theme.text }]}>
          Weekday Schedule
        </Text>
        {renderNumberInput("Daily Total", "limits.weekday.dailyTotal", "90")}

        <Text style={[styles.subsectionTitle, { color: theme.text }]}>
          Weekend Schedule
        </Text>
        {renderNumberInput("Daily Total", "limits.weekend.dailyTotal", "120")}
      </View>

      {/* Bedtime Restrictions */}
      <View style={[styles.section, { backgroundColor: theme.menuBackground }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          🌙 Bedtime Restrictions
        </Text>

        <Text style={[styles.subsectionTitle, { color: theme.text }]}>
          Weekday Schedule
        </Text>
        {renderTimeInput(
          "Bedtime",
          "bedtimeRestrictions.weekday.bedtime",
          "20:30"
        )}
        {renderTimeInput(
          "Wake Time",
          "bedtimeRestrictions.weekday.wakeTime",
          "07:00"
        )}

        <Text style={[styles.subsectionTitle, { color: theme.text }]}>
          Weekend Schedule
        </Text>
        {renderTimeInput(
          "Bedtime",
          "bedtimeRestrictions.weekend.bedtime",
          "21:30"
        )}
        {renderTimeInput(
          "Wake Time",
          "bedtimeRestrictions.weekend.wakeTime",
          "08:00"
        )}
      </View>

      {/* Bonus Activities */}
      <View style={[styles.section, { backgroundColor: theme.menuBackground }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          💰 Bonus Activities
        </Text>

        {/* Soccer */}
        <View style={styles.bonusActivity}>
          <Text style={[styles.activityName, { color: theme.text }]}>
            ⚽ Soccer
          </Text>
          {renderSwitchInput("Enabled", "bonusActivities.soccer.enabled")}
          {getValueByPath(localSettings, "bonusActivities.soccer.enabled") && (
            <>
              {renderFloatInput(
                "Ratio (screen:activity)",
                "bonusActivities.soccer.ratio"
              )}
              {renderNumberInput(
                "Daily Max",
                "bonusActivities.soccer.dailyMax",
                "30"
              )}
            </>
          )}
        </View>

        {/* Fitness */}
        <View style={styles.bonusActivity}>
          <Text style={[styles.activityName, { color: theme.text }]}>
            🏃 Fitness
          </Text>
          {renderSwitchInput("Enabled", "bonusActivities.fitness.enabled")}
          {getValueByPath(localSettings, "bonusActivities.fitness.enabled") && (
            <>
              {renderFloatInput(
                "Ratio (screen:activity)",
                "bonusActivities.fitness.ratio"
              )}
              {renderNumberInput(
                "Daily Max",
                "bonusActivities.fitness.dailyMax",
                "30"
              )}
            </>
          )}
        </View>

        {/* Reading */}
        <View style={styles.bonusActivity}>
          <Text style={[styles.activityName, { color: theme.text }]}>
            📚 Reading
          </Text>
          {renderSwitchInput("Enabled", "bonusActivities.reading.enabled")}
          {getValueByPath(localSettings, "bonusActivities.reading.enabled") && (
            <>
              {renderFloatInput(
                "Ratio (screen:activity)",
                "bonusActivities.reading.ratio"
              )}
              {renderNumberInput(
                "Daily Max",
                "bonusActivities.reading.dailyMax",
                "30"
              )}
            </>
          )}
        </View>
      </View>

      {/* Dynamic Available Apps Section - ALSO in Master */}
      {renderAvailableAppsSection()}

      {/* Parent Approval Settings */}
      <View style={[styles.section, { backgroundColor: theme.menuBackground }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          ✋ Parent Approval Required
        </Text>
        {renderSwitchInput(
          "Bonus Time Requests",
          "requireParentApproval.bonusTime"
        )}
        {renderSwitchInput(
          "Session Edits",
          "requireParentApproval.sessionEdits"
        )}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View
        style={[
          styles.tabContainer,
          { borderBottomColor: theme.isDark ? "#444" : "#ddd" },
        ]}
      >
        {renderTabButton("individual", "Individual")}
        {showMasterTab && renderTabButton("master", "Master")}
      </View>

      {/* Settings Content */}
      {settingsMode === "individual"
        ? renderIndividualSettings()
        : renderMasterSettings()}

      {/* Action Buttons */}
      {hasChanges && (
        <View
          style={[
            styles.actionContainer,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.isDark ? "#444" : "#ddd",
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.resetButton, { borderColor: theme.text }]}
            onPress={handleReset}
          >
            <Text style={[styles.resetText, { color: theme.text }]}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: theme.buttonBackground },
            ]}
            onPress={handleSave}
          >
            <Text style={[styles.saveText, { color: theme.buttonText }]}>
              {settingsMode === "individual"
                ? "Save Settings"
                : "Apply to All Kids"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add App Modal */}
      <AddAppModal
        visible={showAddAppModal}
        onClose={() => setShowAddAppModal(false)}
        onAddApp={handleAddApp}
        existingApps={globalAppsLocal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  tabText: {
    fontSize: 16,
  },
  settingsContent: {
    flex: 1,
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
    opacity: 0.8,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    minWidth: 120,
    marginRight: 12,
  },
  numberInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 80,
    textAlign: "center",
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 100,
    textAlign: "center",
  },
  inputUnit: {
    fontSize: 14,
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 14,
    flex: 1,
  },
  bonusActivity: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  activityName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "500",
  },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
  },
  resetButton: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  resetText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 2,
    marginLeft: 8,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveText: {
    fontSize: 16,
    fontWeight: "600",
  },
  appRule: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  appName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
    fontStyle: "italic",
  },
  addAppButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  addAppText: {
    fontSize: 16,
    fontWeight: '600',
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  removeAppButton: {
    backgroundColor: '#ff4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeAppText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default SettingsTab;