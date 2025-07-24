// src/components/InlineSessionEditor.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert 
} from 'react-native';
import CustomTimePicker from './CustomTimePicker';
import apiService from '../services/apiService';

const InlineSessionEditor = ({ 
  session, 
  theme, 
  userType,
  userName,
  kidId, // Add kidId prop for parent mode
  onSave, 
  onCancel 
}) => {
  const [formData, setFormData] = useState(() => {
    if (session.bonus || session.punishment) {
      // For bonus/punishment sessions
      return {
        reason: session.reason || session.reasonMessage || '',
        duration: session.duration?.toString() || '',
        bonusTime: session.bonusTime?.toString() || '',
      };
    } else {
      // For regular sessions
      return {
        startTime: session.timeStarted ? new Date(session.timeStarted) : null,
        endTime: session.timeEnded ? new Date(session.timeEnded) : null,
      };
    }
  });

  const [isSaving, setIsSaving] = useState(false);

  // Calculate duration from start/end times
  const calculateDuration = () => {
    if (formData.startTime && formData.endTime) {
      const diffMs = formData.endTime.getTime() - formData.startTime.getTime();
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      return diffMinutes > 0 ? diffMinutes : 0;
    }
    return 0;
  };

  // Update form field
  const updateFormField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Validation
  const validateForm = () => {
    if (session.bonus || session.punishment) {
      const duration = parseInt(formData.duration);
      if (!duration || duration < 1) {
        return 'Duration must be at least 1 minute';
      }
      if (duration > 300) {
        return 'Duration cannot exceed 300 minutes';
      }
      
      if (session.bonus) {
        const bonusTime = parseInt(formData.bonusTime);
        if (!bonusTime || bonusTime < 1) {
          return 'Bonus time must be at least 1 minute';
        }
        if (bonusTime > 300) {
          return 'Bonus time cannot exceed 300 minutes';
        }
      }
    } else {
      if (!formData.startTime || !formData.endTime) {
        return 'Please select both start and end times';
      }
      const duration = calculateDuration();
      if (duration <= 0) {
        return 'End time must be after start time';
      }
    }
    return null;
  };

  // Save changes
  const handleSave = async () => {
    const validation = validateForm();
    if (validation) {
      Alert.alert('Validation Error', validation);
      return;
    }

    setIsSaving(true);
    try {
      const familyId = 'braithwaite_family_tracker';
      const targetKidId = userType === 'parent' ? kidId : userName;

      console.log('🔧 TARGET KID ID:', targetKidId);
      console.log('🔧 SESSION:', session);

      let updates = {
        updatedAt: new Date().toISOString(),
        updatedBy: userName,
      };

      if (session.bonus || session.punishment) {
        // For bonus/punishment sessions
        updates.reason = formData.reason;
        updates.duration = parseInt(formData.duration);
        
        if (session.bonus) {
          updates.bonusTime = parseInt(formData.bonusTime);
        }
      } else {
        // For regular sessions
        const duration = calculateDuration();
        updates.timeStarted = formData.startTime.toISOString();
        updates.timeEnded = formData.endTime.toISOString();
        updates.duration = duration;
      }

      console.log('📤 UPDATING SESSION INLINE:', {
        sessionId: session.id,
        targetKidId,
        updates
      });

      await apiService.updateSession(familyId, targetKidId, session.id, updates);
      
      console.log('✅ SESSION UPDATED INLINE');
      
      // Call the save callback to refresh data
      if (onSave) {
        onSave();
      }

    } catch (error) {
      console.error('❌ INLINE UPDATE ERROR:', error);
      Alert.alert('Error', `Failed to update session: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <View style={[styles.editorContainer, { backgroundColor: theme.menuBackground }]}>
      <Text style={[styles.editorTitle, { color: theme.text }]}>
        ✏️ Edit {session.bonus ? 'Bonus' : session.punishment ? 'Punishment' : 'Session'}
      </Text>

      {session.bonus || session.punishment ? (
        // Bonus/Punishment Editor
        <>
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Reason</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.isDark ? '#444' : '#ddd',
                }
              ]}
              value={formData.reason}
              onChangeText={(value) => updateFormField('reason', value)}
              placeholder="Enter reason..."
              placeholderTextColor={theme.isDark ? '#888' : '#666'}
              multiline
              maxLength={200}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>
              Duration (time spent) - minutes
            </Text>
            <TextInput
              style={[
                styles.numberInput,
                {
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.isDark ? '#444' : '#ddd',
                }
              ]}
              value={formData.duration}
              onChangeText={(value) => updateFormField('duration', value)}
              placeholder="0"
              placeholderTextColor={theme.isDark ? '#888' : '#666'}
              keyboardType="numeric"
              maxLength={3}
            />
            {formData.duration && (
              <Text style={[styles.durationPreview, { color: theme.text, opacity: 0.7 }]}>
                = {formatTime(parseInt(formData.duration) || 0)}
              </Text>
            )}
          </View>

          {session.bonus && (
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>
                Bonus Time (awarded) - minutes
              </Text>
              <TextInput
                style={[
                  styles.numberInput,
                  {
                    backgroundColor: theme.background,
                    color: theme.text,
                    borderColor: theme.isDark ? '#444' : '#ddd',
                  }
                ]}
                value={formData.bonusTime}
                onChangeText={(value) => updateFormField('bonusTime', value)}
                placeholder="0"
                placeholderTextColor={theme.isDark ? '#888' : '#666'}
                keyboardType="numeric"
                maxLength={3}
              />
              {formData.bonusTime && (
                <Text style={[styles.durationPreview, { color: '#4CAF50', opacity: 0.8 }]}>
                  = +{formatTime(parseInt(formData.bonusTime) || 0)} bonus
                </Text>
              )}
            </View>
          )}
        </>
      ) : (
        // Regular Session Editor
        <>
          <View style={styles.timeFieldContainer}>
            <CustomTimePicker
              label="⏰ Start Time"
              value={formData.startTime}
              onTimeChange={(time) => updateFormField('startTime', time)}
              placeholder="Select start time"
            />
          </View>

          <View style={styles.timeFieldContainer}>
            <CustomTimePicker
              label="⏹️ End Time"
              value={formData.endTime}
              onTimeChange={(time) => updateFormField('endTime', time)}
              placeholder="Select end time"
            />
          </View>

          {formData.startTime && formData.endTime && (
            <View style={[styles.durationDisplay, { backgroundColor: theme.isDark ? '#1A3A1A' : 'rgba(76, 175, 80, 0.1)' }]}>
              <Text style={[styles.durationText, { color: '#4CAF50' }]}>
                📊 Duration: {formatTime(calculateDuration())}
              </Text>
            </View>
          )}
        </>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: theme.text }]}
          onPress={onCancel}
          disabled={isSaving}
        >
          <Text style={[styles.cancelButtonText, { color: theme.text }]}>
            Cancel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.saveButton, 
            { 
              backgroundColor: isSaving ? '#999' : '#4CAF50',
              opacity: isSaving ? 0.6 : 1
            }
          ]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={[styles.saveButtonText, { color: '#FFFFFF' }]}>
            {isSaving ? 'Saving...' : '💾 Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  editorContainer: {
    margin: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  editorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  timeFieldContainer: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  numberInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  durationPreview: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  durationDisplay: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 16,
  },
  durationText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default InlineSessionEditor;