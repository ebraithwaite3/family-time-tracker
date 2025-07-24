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
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import CustomDropdown from '../components/CustomDropdown';
import CustomTimePicker from '../components/CustomTimePicker';
import uuid from 'react-native-uuid';
import apiService from '../services/apiService';
import { DateTime } from 'luxon';

const QuickAddModal = ({ visible, onClose, userName, selectedKid, userType }) => {
  const { theme } = useTheme();
  const { familyData, getRemainingTime, refreshFamilyData } = useData();

  const [formData, setFormData] = useState({
    startTime: null,
    endTime: null,
    app: '',
    device: '',
    countTowardsTotal: true,
  });

  // Get today's date
  const getTodayDate = () => {
    // DateTime.local() gets the current time in the system's local timezone.
    // .toISODate() formats it as 'YYYY-MM-DD'.
    const today = DateTime.local().toISODate();
    return today;
  };

  // Calculate duration from start and end times
  const calculateDuration = () => {
    if (formData.startTime && formData.endTime) {
      const startTime = DateTime.fromJSDate(formData.startTime);
      const endTime = DateTime.fromJSDate(formData.endTime);
      const diffMinutes = Math.round(endTime.diff(startTime, 'minutes').minutes);
      return diffMinutes > 0 ? diffMinutes : 0;
    }
    return 0;
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

  // Update form field
  const updateFormField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Clear form
  const clearForm = () => {
    setFormData({
      startTime: null,
      endTime: null,
      app: '',
      device: '',
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
    const { startTime, endTime, app, device } = formData;
    
    if (!app) return 'Please select an app';
    if (!device) return 'Please select a device';
    if (!startTime) return 'Please select a start time';
    if (!endTime) return 'Please select an end time';
    
    const duration = calculateDuration();
    if (duration <= 0) return 'End time must be after start time';
    
    const remainingTime = getRemainingTimeForValidation();
    if (formData.countTowardsTotal && duration > remainingTime) {
      return `Duration (${duration} min) exceeds remaining daily time (${remainingTime} min)`;
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
      const duration = calculateDuration();
      
      const sessionData = {
        id: uuid.v4(),
        date: getTodayDate(),
        timeStarted: DateTime.fromJSDate(formData.startTime).toISO(),
        timeEnded: DateTime.fromJSDate(formData.endTime).toISO(),
        duration: duration,
        app: formData.app,
        device: formData.device,
        countTowardsTotal: formData.countTowardsTotal,
        createdAt: DateTime.local().toISO(),
        updatedAt: DateTime.local().toISO(),
        updatedBy: userName,
      };
  
      // Determine the target kid ID
      const targetKidId = userType === 'parent' ? selectedKid : userName;
      const familyId = 'braithwaite_family_tracker';
      
      console.log('📤 SAVING SESSION TO BACKEND:', sessionData);
  
      // Use your existing API service
      const result = await apiService.addSession(familyId, targetKidId, sessionData);
      console.log('✅ BACKEND RESPONSE:', result);
  
      // Update local family data
      refreshFamilyData();
      
      const startTimeStr = DateTime.fromJSDate(formData.startTime).toLocaleString(DateTime.TIME_SIMPLE);
      const endTimeStr = DateTime.fromJSDate(formData.endTime).toLocaleString(DateTime.TIME_SIMPLE);
      
      Alert.alert(
        'Session Added! ✅', 
        `${duration} minute session added\n${startTimeStr} - ${endTimeStr}`
      );
      handleClose();
    } catch (error) {
      console.error('❌ SAVE ERROR:', error);
      Alert.alert('Error', `Failed to add session: ${error.message}`);
    }
  };

  const availableApps = getAvailableApps();
  const availableDevices = getDevicesForKid();
  const duration = calculateDuration();
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
            <Text style={[styles.headerTitle, { color: theme.text }]}>Quick Add Session</Text>
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

            {/* Time Selection */}
            <View style={styles.timeContainer}>
              <CustomTimePicker
                label="⏰ Start Time"
                value={formData.startTime}
                onTimeChange={(time) => updateFormField('startTime', time)}
                placeholder="When did it start?"
              />
              
              <CustomTimePicker
                label="⏹️ End Time"
                value={formData.endTime}
                onTimeChange={(time) => updateFormField('endTime', time)}
                placeholder="When did it end?"
              />
            </View>

            {/* Duration Display */}
            {duration > 0 && (
              <View style={[styles.durationContainer, { backgroundColor: theme.isDark ? '#1A3A1A' : 'rgba(76, 175, 80, 0.1)' }]}>
                <Text style={[styles.durationText, { color: '#4CAF50' }]}>
                  📊 Session Duration: {duration} minutes
                </Text>
              </View>
            )}

            {/* Counts Toward Total - Only show for parents, or kids with Pokemon Go */}
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

            {/* Remaining Time Info */}
            <View style={[styles.infoContainer, { backgroundColor: theme.isDark ? '#1A3A1A' : 'rgba(76, 175, 80, 0.1)' }]}>
              <Text style={[styles.infoText, { color: theme.text }]}>
                📊 Remaining time today: {remainingTime} minutes
              </Text>
              {formData.countTowardsTotal && duration > 0 && (
                <Text style={[styles.infoText, { color: theme.text, marginTop: 4 }]}>
                  After this session: {Math.max(0, remainingTime - duration)} minutes remaining
                </Text>
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
              style={[styles.submitButtonNew, { backgroundColor: theme.buttonBackground }]}
              onPress={handleSubmit}
            >
              <Text style={[styles.submitButtonTextNew, { color: theme.buttonText }]}>
                Add Session
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
  timeContainer: {
    marginBottom: 16,
  },
  durationContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    marginBottom: 16,
  },
  durationText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
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
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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

export default QuickAddModal;