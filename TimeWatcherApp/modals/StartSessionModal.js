// src/components/StartSessionModal.js
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  TextInput, // Make sure to import TextInput
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import CustomDropdown from '../components/CustomDropdown';
import apiService from '../services/apiService';
import uuid from 'react-native-uuid';
import { DateTime } from 'luxon'; // Import DateTime from Luxon

const StartSessionModal = ({ visible, onClose, userName, selectedKid, userType }) => {
  const { theme } = useTheme();
  const { familyData, refreshFamilyData, getRemainingTime } = useData();

  const [formData, setFormData] = useState({
    app: '',
    device: '',
    estimatedDuration: '', // For planning purposes
    countTowardsTotal: true,
  });

  // Get today's date in YYYY-MM-DD format based on local time zone using Luxon
  const getTodayDate = () => {
    // DateTime.local() creates a DateTime object in the user's local time zone.
    // .toISODate() formats it as 'YYYY-MM-DD'.
    return DateTime.local().toISODate();
  };

  // Get available apps
  const getAvailableApps = () => {
    const apps = familyData?.settings?.availableApps || {};
    return Object.entries(apps)
      .filter(([_, app]) => app.available)
      .map(([appId, app]) => ({
        label: `${app.icon} ${app.displayName}`,
        value: appId,
      }));
  };

  // Get devices for selected kid
  const getDevicesForKid = () => {
    if (userType === 'parent' && selectedKid) {
      const devices = familyData?.kidsData?.[selectedKid]?.devices || [];
      return devices.map(device => ({
        label: device.deviceName || device.deviceId,
        value: device.deviceId,
      }));
    } else if (userType === 'kid') {
      const devices = familyData?.myData?.devices || [];
      return devices.map(device => ({
        label: device.deviceName || device.deviceId,
        value: device.deviceId,
      }));
    }
    return [];
  };

  // Get remaining time for validation
  const getRemainingTimeForValidation = () => {
    if (userType === 'parent' && selectedKid) {
      return getRemainingTime(selectedKid);
    } else if (userType === 'kid') {
      return getRemainingTime();
    }
    return 0;
  };

  // Quick time selection
  const selectQuickTime = (minutes) => {
    updateFormField('estimatedDuration', minutes.toString());
  };

  // Update form field
  const updateFormField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Clear form
  const clearForm = () => {
    setFormData({
      app: '',
      device: '',
      estimatedDuration: '',
      countTowardsTotal: true,
    });
  };

  // Close modal and clear form
  const handleClose = () => {
    clearForm();
    onClose();
  };

  // Validation
  const validateForm = () => {
    const { app, device } = formData;
    
    if (!app) return 'Please select an app';
    if (!device) return 'Please select a device';
    
    const remainingTime = getRemainingTimeForValidation();
    if (formData.countTowardsTotal && remainingTime <= 0) {
      return 'No remaining screen time available today';
    }
    
    return null;
  };

  // Submit handler
  const handleSubmit = async () => {
    const validation = validateForm();
    if (validation) {
      Alert.alert('Validation Error', validation);
      return;
    }

    try {
      const targetKidId = userType === 'parent' ? selectedKid : userName;
      const familyId = 'braithwaite_family_tracker';
      
      const now = DateTime.local(); // Current time in local timezone
      const sessionData = {
        id: uuid.v4(),
        date: getTodayDate(),
        timeStarted: now.toISO(), // Store start time as ISO (UTC) string from local time
        app: formData.app,
        device: formData.device,
        countTowardsTotal: formData.countTowardsTotal,
        active: true, // Mark as active session
        createdAt: now.toISO(),
        updatedAt: now.toISO(),
        updatedBy: userName,
      };

      // Add estimated duration if provided
      if (formData.estimatedDuration) {
        sessionData.estimatedDuration = parseInt(formData.estimatedDuration);
      }

      console.log('📤 STARTING SESSION:', sessionData);

      // Save to backend
      const result = await apiService.addSession(familyId, targetKidId, sessionData);
      console.log('✅ SESSION STARTED:', result);

      // Refresh data
      refreshFamilyData();

      // Get app name for success message
      const appInfo = getAvailableApps().find(app => app.value === formData.app);
      const appName = appInfo?.label.replace(/^[^\s]+ /, '') || formData.app;

      // Calculate estimated finish time and remaining time
      const estimatedDuration = parseInt(formData.estimatedDuration) || 0;
      let finishTimeMessage = '';
      
      if (estimatedDuration > 0) {
        const finishTime = now.plus({ minutes: estimatedDuration }); // Use Luxon's now object
        const finishTimeString = finishTime.toLocaleString(DateTime.TIME_24_SIMPLE); // Format in local time
        
        if (formData.countTowardsTotal) {
          const timeAfterSession = Math.max(0, remainingTime - estimatedDuration);
          finishTimeMessage = `\n\nEstimated ${estimatedDuration} minute session.\nPlan to finish by ${finishTimeString}.\nYou'll have ${timeAfterSession} minutes remaining after this session.`;
        } else {
          finishTimeMessage = `\n\nEstimated ${estimatedDuration} minute session.\nPlan to finish by ${finishTimeString}.\nThis won't count toward your ${remainingTime} minutes remaining.`;
        }
      } else {
        finishTimeMessage = `\n\nYou have ${remainingTime} minutes remaining today.`;
      }

      Alert.alert(
        'Session Started! ▶️', 
        `${appName} session started on ${formData.device}${finishTimeMessage}`
      );
      handleClose();
    } catch (error) {
      console.error('❌ START SESSION ERROR:', error);
      Alert.alert('Error', `Failed to start session: ${error.message}`);
    }
  };

  // Render quick time buttons
  const renderQuickTimeButtons = () => (
    <View style={styles.quickTimeContainer}>
      {[15, 30, 45, 60].map(minutes => (
        <TouchableOpacity
          key={minutes}
          style={[
            styles.quickTimeButton,
            {
              backgroundColor: formData.estimatedDuration === minutes.toString() 
                ? theme.buttonBackground 
                : theme.background,
              borderColor: theme.isDark ? '#444' : '#ddd',
            }
          ]}
          onPress={() => selectQuickTime(minutes)}
        >
          <Text style={[
            styles.quickTimeText,
            { 
              color: formData.estimatedDuration === minutes.toString() 
                ? theme.buttonText 
                : theme.text 
            }
          ]}>
            {minutes}m
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const availableApps = getAvailableApps();
  const availableDevices = getDevicesForKid();
  const remainingTime = getRemainingTimeForValidation();

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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.background }]}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Start Session
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.headerCloseX}>
              <Text style={[styles.headerCloseXText, { color: theme.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Device Selection */}
            {availableDevices.length > 0 && (
              <View style={styles.fieldContainer}>
                <CustomDropdown
                  title="📺 Device"
                  selectedValue={formData.device}
                  onValueChange={(value) => updateFormField('device', value)}
                  options={availableDevices}
                  placeholder="Select a device"
                  style={{ button: { width: '100%' } }}
                />
              </View>
            )}

            {/* App Selection */}
            {availableApps.length > 0 && (
              <View style={styles.fieldContainer}>
                <CustomDropdown
                  title="📱 App"
                  selectedValue={formData.app}
                  onValueChange={(value) => updateFormField('app', value)}
                  options={availableApps}
                  placeholder="Select an app"
                  style={{ button: { width: '100%' } }}
                />
              </View>
            )}

            {/* Estimated Duration */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>⏱️ Estimated Duration</Text>
              {renderQuickTimeButtons()}
              <TextInput
                style={[
                  styles.customInput,
                  {
                    backgroundColor: theme.menuBackground,
                    color: theme.text,
                    borderColor: theme.isDark ? '#444' : '#ddd',
                  }
                ]}
                value={formData.estimatedDuration}
                onChangeText={(value) => updateFormField('estimatedDuration', value)}
                placeholder="Custom minutes"
                placeholderTextColor={theme.isDark ? '#888' : '#666'}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                blurOnSubmit={true}
              />
            </View>

            {/* Counts Toward Total */}
            {(userType === 'parent' || (userType === 'kid' && formData.app === 'pokemonGo')) && (
              <View style={[styles.switchContainer, { backgroundColor: theme.menuBackground }]}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>
                  ☑️ Counts toward daily limit
                </Text>
                <Switch
                  value={formData.countTowardsTotal}
                  onValueChange={(value) => updateFormField('countTowardsTotal', value)}
                  trackColor={{ false: "#ccc", true: theme.buttonBackground }}
                  thumbColor={formData.countTowardsTotal ? "#fff" : "#f4f3f4"}
                />
              </View>
            )}

            {/* Time Planning Info */}
            <View style={[styles.infoContainer, { backgroundColor: theme.isDark ? '#1A3A1A' : 'rgba(76, 175, 80, 0.1)' }]}>
              <Text style={[styles.infoTitle, { color: '#4CAF50' }]}>
                📊 Time Planning
              </Text>
              <Text style={[styles.infoText, { color: theme.text }]}>
                Total remaining today: {remainingTime} minutes
              </Text>
              {formData.estimatedDuration && parseInt(formData.estimatedDuration) > 0 && (
                <>
                  <Text style={[styles.infoText, { color: theme.text, marginTop: 4 }]}>
                    Estimated session: {formData.estimatedDuration} minutes
                  </Text>
                  {formData.countTowardsTotal ? (
                    <Text style={[styles.infoText, { color: theme.text, marginTop: 4 }]}>
                      Time left after session: {Math.max(0, remainingTime - parseInt(formData.estimatedDuration))} minutes
                    </Text>
                  ) : (
                    <Text style={[styles.infoText, { color: theme.text, marginTop: 4 }]}>
                      Won't count toward limit - {remainingTime} minutes will remain
                    </Text>
                  )}
                </>
              )}
            </View>
          </View>

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
              style={[styles.submitButtonNew, { backgroundColor: '#4CAF50' }]}
              onPress={handleSubmit}
            >
              <Text style={[styles.submitButtonTextNew, { color: '#FFFFFF' }]}>
                ▶️ Start Session
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerCloseX: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCloseXText: {
    fontSize: 22,
    fontWeight: 'bold',
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
    fontWeight: '600',
    marginBottom: 12,
  },
  quickTimeContainer: {
    flexDirection: 'row',
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
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  customInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  switchLabel: {
    fontSize: 16,
    flex: 1,
  },
  infoContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cancelButtonNew: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  submitButtonNew: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonTextNew: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonTextNew: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default StartSessionModal;