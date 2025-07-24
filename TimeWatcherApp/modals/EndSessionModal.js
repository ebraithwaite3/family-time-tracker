import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import apiService from '../services/apiService';
import { DateTime } from 'luxon';

const EndSessionModal = ({ visible, onClose, userName, selectedKid, userType }) => {
  const { theme } = useTheme();
  const { familyData, refreshFamilyData } = useData();

  const [selectedSessionId, setSelectedSessionId] = useState('');

  // Get active sessions
  const getActiveSessions = () => {
    let sessions = [];
    if (userType === 'parent' && selectedKid) {
      const kidData = familyData?.kidsData?.[selectedKid];
      if (kidData?.sessions) {
        sessions = kidData.sessions.filter(session => 
          session.active && session.timeStarted && !session.timeEnded
        );
      }
    } else if (userType === 'kid') {
      const myData = familyData?.myData;
      if (myData?.sessions) {
        sessions = myData.sessions.filter(session => 
          session.active && session.timeStarted && !session.timeEnded
        );
      }
    }
    return sessions;
  };

  // Get available apps for display names
  const getAvailableApps = () => {
    const apps = familyData?.settings?.availableApps || {};
    return Object.entries(apps)
      .filter(([_, app]) => app.available)
      .reduce((acc, [appId, app]) => {
        acc[appId] = app;
        return acc;
      }, {});
  };

  // Calculate current session duration
  const calculateCurrentDuration = (timeStarted) => {
    const startTime = DateTime.fromISO(timeStarted);
    const now = DateTime.local();
    return Math.round(now.diff(startTime, 'minutes').minutes);
  };

  // Clear form
  const clearForm = () => {
    setSelectedSessionId('');
  };

  // Close modal and clear form
  const handleClose = () => {
    clearForm();
    onClose();
  };

  // Validation
  const validateForm = () => {
    if (!selectedSessionId) {
      return 'Please select a session to end';
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
      
      // Find the selected session
      const activeSessions = getActiveSessions();
      const session = activeSessions.find(s => s.id === selectedSessionId);
      if (!session) {
        Alert.alert('Error', 'Session not found');
        return;
      }

      // Calculate duration
      const startTime = DateTime.fromISO(session.timeStarted);
      const endTime = DateTime.local();
      const duration = Math.round(endTime.diff(startTime, 'minutes').minutes);

      // Prepare updates
      const updates = {
        timeEnded: endTime.toISO(),
        duration: duration,
        updatedAt: DateTime.local().toISO(),
        updatedBy: userName,
        // Remove these fields by not including them in the update
        // The backend should handle removing active and estimatedDuration
      };

      console.log('📤 ENDING SESSION:', {
        sessionId: selectedSessionId,
        updates,
        originalSession: session
      });

      // Update session via backend
      const result = await apiService.updateSession(familyId, targetKidId, selectedSessionId, updates);
      console.log('✅ SESSION ENDED:', result);

      // Refresh data
      refreshFamilyData();

      // Get app name for success message
      const availableApps = getAvailableApps();
      const appInfo = availableApps[session.app];
      const appName = appInfo?.displayName || session.app;

      Alert.alert(
        'Session Ended! ⏹️', 
        `${appName} session ended on ${session.device}\n\nSession duration: ${duration} minutes\nStarted: ${startTime.toLocaleString(DateTime.TIME_SIMPLE)}\nEnded: ${endTime.toLocaleString(DateTime.TIME_SIMPLE)}`
      );
      handleClose();
    } catch (error) {
      console.error('❌ END SESSION ERROR:', error);
      Alert.alert('Error', `Failed to end session: ${error.message}`);
    }
  };

  // Render session option
  const renderSessionOption = (session) => {
    const availableApps = getAvailableApps();
    const appInfo = availableApps[session.app];
    const appName = appInfo?.displayName || session.app;
    const appIcon = appInfo?.icon || '📱';
    
    const startTime = DateTime.fromISO(session.timeStarted);
    const currentDuration = calculateCurrentDuration(session.timeStarted);
    const estimatedText = session.estimatedDuration ? ` (estimated ${session.estimatedDuration}m)` : '';

    return (
      <TouchableOpacity
        key={session.id}
        style={[
          styles.sessionOption,
          {
            backgroundColor: selectedSessionId === session.id 
              ? theme.buttonBackground 
              : theme.menuBackground,
            borderColor: theme.isDark ? '#444' : '#ddd',
          }
        ]}
        onPress={() => setSelectedSessionId(session.id)}
      >
        <View style={styles.sessionHeader}>
          <Text style={[
            styles.sessionTitle,
            { 
              color: selectedSessionId === session.id 
                ? theme.buttonText 
                : theme.text 
            }
          ]}>
            {appIcon} {appName}
          </Text>
          <Text style={[
            styles.sessionDevice,
            { 
              color: selectedSessionId === session.id 
                ? theme.buttonText 
                : theme.text,
              opacity: 0.8
            }
          ]}>
            on {session.device}
          </Text>
        </View>
        
        <View style={styles.sessionDetails}>
          <Text style={[
            styles.sessionTime,
            { 
              color: selectedSessionId === session.id 
                ? theme.buttonText 
                : theme.text,
              opacity: 0.9
            }
          ]}>
            Started: {startTime.toLocaleString(DateTime.TIME_SIMPLE)}
          </Text>
          <Text style={[
            styles.sessionDuration,
            { 
              color: selectedSessionId === session.id 
                ? theme.buttonText 
                : '#4CAF50',
              fontWeight: 'bold'
            }
          ]}>
            Current: {currentDuration} minutes{estimatedText}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const activeSessions = getActiveSessions();

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
              End Active Session
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.headerCloseX}>
              <Text style={[styles.headerCloseXText, { color: theme.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {activeSessions.length === 0 ? (
              /* No Active Sessions */
              <View style={styles.noSessionsContainer}>
                <Text style={[styles.noSessionsIcon, { color: theme.text }]}>😴</Text>
                <Text style={[styles.noSessionsTitle, { color: theme.text }]}>
                  No Active Sessions
                </Text>
                <Text style={[styles.noSessionsText, { color: theme.text, opacity: 0.7 }]}>
                  There are no active sessions to end right now.{'\n'}
                  Start a session first to see it here.
                </Text>
              </View>
            ) : (
              /* Active Sessions List */
              <>
                <Text style={[styles.instructionsText, { color: theme.text }]}>
                  📱 Select the session you want to end:
                </Text>
                
                <ScrollView 
                  style={styles.sessionsList} 
                  showsVerticalScrollIndicator={false}
                >
                  {activeSessions.map(renderSessionOption)}
                </ScrollView>

                {/* Selected Session Info */}
                {selectedSessionId && (
                  <View style={[styles.selectedInfo, { backgroundColor: theme.isDark ? '#1A3A1A' : 'rgba(76, 175, 80, 0.1)' }]}>
                    <Text style={[styles.selectedInfoTitle, { color: '#4CAF50' }]}>
                      ⏹️ Ready to End
                    </Text>
                    <Text style={[styles.selectedInfoText, { color: theme.text }]}>
                      This will calculate the final duration and close the session.
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Action Buttons Row */}
          {activeSessions.length > 0 && (
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
                  { 
                    backgroundColor: selectedSessionId ? '#F44336' : '#999',
                    opacity: selectedSessionId ? 1 : 0.6
                  }
                ]}
                onPress={handleSubmit}
                disabled={!selectedSessionId}
              >
                <Text style={[styles.submitButtonTextNew, { color: '#FFFFFF' }]}>
                  ⏹️ End Session
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
  noSessionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noSessionsIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  noSessionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  noSessionsText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  instructionsText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  sessionsList: {
    flex: 1,
  },
  sessionOption: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sessionDevice: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  sessionDetails: {
    gap: 4,
  },
  sessionTime: {
    fontSize: 14,
  },
  sessionDuration: {
    fontSize: 16,
  },
  selectedInfo: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    marginTop: 16,
  },
  selectedInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  selectedInfoText: {
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

export default EndSessionModal;