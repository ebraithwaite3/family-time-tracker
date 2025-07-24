import React, { useState } from 'react';
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
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import CustomDropdown from '../components/CustomDropdown';
import apiService from '../services/apiService';
import uuid from 'react-native-uuid';
import { DateTime } from 'luxon';

const PunishmentModal = ({ visible, onClose, userName, selectedKid }) => {
  const { theme } = useTheme();
  const { refreshFamilyData, getRemainingTime } = useData();

  const [formData, setFormData] = useState({
    punishmentMinutes: '',
    reason: '',
    customReason: '',
  });

  // Get today's date
  const getTodayDate = () => {
    // DateTime.local() gets the current time in the system's local timezone.
    // .toISODate() formats it as 'YYYY-MM-DD'.
    const today = DateTime.local().toISODate();
    return today;
  };

  // Get remaining time for validation
  const getRemainingTimeForValidation = () => {
    return getRemainingTime(selectedKid) || 0;
  };

  // Update form field
  const updateFormField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Quick time selection
  const selectQuickTime = (minutes) => {
    updateFormField('punishmentMinutes', minutes.toString());
  };

  // Clear form
  const clearForm = () => {
    setFormData({
      punishmentMinutes: '',
      reason: '',
      customReason: '',
    });
  };

  // Close modal and clear form
  const handleClose = () => {
    clearForm();
    onClose();
  };

  // Validation
  const validateForm = () => {
    const { punishmentMinutes, reason, customReason } = formData;
    
    if (!punishmentMinutes || parseInt(punishmentMinutes) < 1) {
      return 'Punishment minutes required';
    }
    
    if (!reason) {
      return 'Please select a reason';
    }
    
    if (reason === 'Custom' && !customReason.trim()) {
      return 'Please enter a custom reason';
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
      const familyId = 'braithwaite_family_tracker';
      const finalReason = formData.reason === 'Custom' ? formData.customReason : formData.reason;
      
      const sessionData = {
        id: uuid.v4(),
        date: getTodayDate(),
        duration: parseInt(formData.punishmentMinutes),
        punishment: true,
        countTowardsTotal: true, // This reduces their available time
        reason: finalReason,
        createdAt: DateTime.local().toISO(),
        updatedAt: DateTime.local().toISO(),
        updatedBy: userName,
      };

      console.log('📤 SAVING PUNISHMENT TO BACKEND:', sessionData);

      // Save to backend
      const result = await apiService.addSession(familyId, selectedKid, sessionData);
      console.log('✅ PUNISHMENT SAVED:', result);

      // Refresh data
      refreshFamilyData();

      Alert.alert(
        'Punishment Applied', 
        `${formData.punishmentMinutes} minutes deducted for: ${finalReason}`
      );
      handleClose();
    } catch (error) {
      console.error('❌ PUNISHMENT SAVE ERROR:', error);
      Alert.alert('Error', `Failed to apply punishment: ${error.message}`);
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
              backgroundColor: formData.punishmentMinutes === minutes.toString() 
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
              color: formData.punishmentMinutes === minutes.toString() 
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

  // Predefined reasons
  const reasonOptions = [
    'Not following screen time rules',
    'Rude to sibling',
    'Attitude to parent', 
    'Room not clean',
    'Custom',
  ];

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
              Apply Punishment
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.headerCloseX}>
              <Text style={[styles.headerCloseXText, { color: theme.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Punishment Minutes */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>⚠️ Punishment Minutes</Text>
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
                value={formData.punishmentMinutes}
                onChangeText={(value) => updateFormField('punishmentMinutes', value)}
                placeholder="Custom minutes"
                placeholderTextColor={theme.isDark ? '#888' : '#666'}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                blurOnSubmit={true}
              />
            </View>

            {/* Reason Selection */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>📝 Reason</Text>
              <CustomDropdown
                selectedValue={formData.reason}
                onValueChange={(value) => updateFormField('reason', value)}
                options={reasonOptions.map(reason => ({
                  label: reason,
                  value: reason,
                }))}
                placeholder="Select reason"
                style={{ button: { width: '100%' } }}
              />
            </View>

            {/* Custom Reason Input */}
            {formData.reason === 'Custom' && (
              <View style={styles.fieldContainer}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>💬 Custom Reason</Text>
                <TextInput
                  style={[
                    styles.customReasonInput,
                    {
                      backgroundColor: theme.menuBackground,
                      color: theme.text,
                      borderColor: theme.isDark ? '#444' : '#ddd',
                    }
                  ]}
                  value={formData.customReason}
                  onChangeText={(value) => updateFormField('customReason', value)}
                  placeholder="Enter specific reason for punishment..."
                  placeholderTextColor={theme.isDark ? '#888' : '#666'}
                  multiline
                  returnKeyType="done"
                  blurOnSubmit={true}
                />
              </View>
            )}

            {/* Impact Info */}
            <View style={[styles.infoContainer, { backgroundColor: theme.isDark ? '#3A1A1A' : 'rgba(244, 67, 54, 0.1)' }]}>
              <Text style={[styles.infoTitle, { color: '#F44336' }]}>
                ⚠️ Impact
              </Text>
              <Text style={[styles.infoText, { color: theme.text }]}>
                This will reduce available screen time by {formData.punishmentMinutes || '0'} minutes
              </Text>
              <Text style={[styles.infoText, { color: theme.text, marginTop: 4 }]}>
                Remaining time after punishment: {Math.max(0, getRemainingTimeForValidation() - (parseInt(formData.punishmentMinutes) || 0))} minutes
              </Text>
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
              style={[styles.submitButtonNew, { backgroundColor: '#F44336' }]}
              onPress={handleSubmit}
            >
              <Text style={[styles.submitButtonTextNew, { color: '#FFFFFF' }]}>
                Apply Punishment
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
  customReasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    height: 80,
    textAlignVertical: 'top',
  },
  infoContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
    marginTop: 16,
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

export default PunishmentModal;