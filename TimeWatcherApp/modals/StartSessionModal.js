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
import apiService from '../services/apiService';
import uuid from 'react-native-uuid';

const StartSessionModal = ({ visible, onClose, userName, selectedKid, userType }) => {
  const { theme } = useTheme();
  const { familyData, refreshFamilyData, getRemainingTime } = useData();

  const [formData, setFormData] = useState({
    app: '',
    device: '',
    countTowardsTotal: true,
  });

  // Get today's date
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
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
      
      const sessionData = {
        id: uuid.v4(),
        date: getTodayDate(),
        timeStarted: new Date().toISOString(), // Start time in UTC
        app: formData.app,
        device: formData.device,
        countTowardsTotal: formData.countTowardsTotal,
        active: true, // Mark as active session
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: userName,
      };

      console.log('📤 STARTING SESSION:', sessionData);

      // Save to backend
      const result = await apiService.addSession(familyId, targetKidId, sessionData);
      console.log('✅ SESSION STARTED:', result);

      // Refresh data
      refreshFamilyData();

      // Get app name for success message
      const appInfo = getAvailableApps().find(app => app.value === formData.app);
      const appName = appInfo?.label.replace(/^[^\s]+ /, '') || formData.app;

      Alert.alert(
        'Session Started! ▶️', 
        `${appName} session started on ${formData.device}\n\nTotal time remaining: ${remainingTime} minutes\nSession time will be deducted when you end the session.`
      );
      handleClose();
    } catch (error) {
      console.error('❌ START SESSION ERROR:', error);
      Alert.alert('Error', `Failed to start session: ${error.message}`);
    }
  };

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

            {/* Time Info */}
            <View style={[styles.infoContainer, { backgroundColor: theme.isDark ? '#1A3A1A' : 'rgba(76, 175, 80, 0.1)' }]}>
              <Text style={[styles.infoTitle, { color: '#4CAF50' }]}>
                📊 Time Available
              </Text>
              <Text style={[styles.infoText, { color: theme.text }]}>
                Total remaining today: {remainingTime} minutes
              </Text>
              {formData.countTowardsTotal && (
                <Text style={[styles.infoText, { color: theme.text, marginTop: 4 }]}>
                  After this session: Unlimited (session will count toward limit when ended)
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