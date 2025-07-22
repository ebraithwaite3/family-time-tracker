import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
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
import uuid from 'react-native-uuid';
import apiService from '../services/apiService';

const QuickAddModal = ({ visible, onClose, userName, selectedKid, userType }) => {
  const { theme } = useTheme();
  const { familyData, getRemainingTime, refreshFamilyData } = useData();

  const [formData, setFormData] = useState({
    duration: '',
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

  // Quick time selection
  const selectQuickTime = (minutes) => {
    updateFormField('duration', minutes.toString());
  };

  // Clear form
  const clearForm = () => {
    setFormData({
      duration: '',
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
    const { duration, app, device } = formData;
    
    if (!app) return 'Please select an app';
    if (!device) return 'Please select a device';
    if (!duration || parseInt(duration) < 1) return 'Duration must be at least 1 minute';
    
    const remainingTime = getRemainingTimeForValidation();
    if (parseInt(duration) > remainingTime) {
      return `Duration exceeds remaining daily time (${remainingTime} minutes left)`;
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
      const sessionData = {
        id: uuid.v4(),
        date: getTodayDate(),
        duration: parseInt(formData.duration),
        app: formData.app,
        device: formData.device,
        countTowardsTotal: formData.countTowardsTotal,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: userName,
      };
  
      // Determine the target kid ID
      const targetKidId = userType === 'parent' ? selectedKid : userName; // Use userName for kids
      const familyId = 'braithwaite_family_tracker'; // Your family ID
      
      console.log('📤 SAVING TO BACKEND:');
      console.log('Family ID:', familyId);
      console.log('Target Kid ID:', targetKidId);
      console.log('Session Data:', sessionData);
  
      // Use your existing API service
      const result = await apiService.addSession(familyId, targetKidId, sessionData);
      console.log('✅ BACKEND RESPONSE:', result);
  
      // Update local family data
      refreshFamilyData();
      
      Alert.alert('Success', 'Session added successfully!');
      handleClose();
    } catch (error) {
      console.error('❌ SAVE ERROR:', error);
      Alert.alert('Error', `Failed to add session: ${error.message}`);
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
              backgroundColor: formData.duration === minutes.toString() 
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
              color: formData.duration === minutes.toString() 
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
          <View style={[styles.header, { backgroundColor: theme.headerBackground }]}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Quick Add Session</Text>
            <TouchableOpacity onPress={handleClose} style={styles.headerCloseX}>
                <Text style={[styles.headerCloseXText, { color: theme.text }]}>x</Text>
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

            {/* Duration */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>⏱️ Duration</Text>
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
                value={formData.duration}
                onChangeText={(value) => updateFormField('duration', value)}
                placeholder="Custom minutes"
                placeholderTextColor={theme.isDark ? '#888' : '#666'}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                blurOnSubmit={true}
              />
            </View>

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
                📊 Remaining time today: {getRemainingTimeForValidation()} minutes
              </Text>
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
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '300',
  },
  headerSpacer: {
    width: 30, // Same width as close button for centering
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 10, // Reduced padding at top
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
  },
  infoText: {
    fontSize: 14,
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
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    gap: 10,
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