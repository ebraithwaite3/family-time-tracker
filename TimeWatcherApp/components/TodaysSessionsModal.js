// src/components/TodaysSessionsModal.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import apiService from '../services/apiService';
import SessionCard from './SessionCard';
import { DateTime } from 'luxon';

const TodaysSessionsModal = ({
  visible,
  onClose,
  userType, // 'parent' or 'kid'
  userId,
  userName, // Add userName prop
  onSessionUpdate, // Callback when session is edited
}) => {
  const { theme } = useTheme();
  const { familyData, refreshFamilyData } = useData();
  const [todaysSessions, setTodaysSessions] = useState([]);
  const [editingSession, setEditingSession] = useState(null);
  const [deletingSession, setDeletingSession] = useState(null);
  const [passcodeVisible, setPasscodeVisible] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeAction, setPasscodeAction] = useState(''); // 'edit' or 'delete'

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    // DateTime.local() gets the current time in the system's local timezone.
    // .toISODate() formats it as 'YYYY-MM-DD'.
    const today = DateTime.local().toISODate();
    return today;
  };

  useEffect(() => {
    if (visible && familyData) {
      loadTodaysSessions();
    }
  }, [visible, familyData, userId]);

  const loadTodaysSessions = () => {
    const today = getTodayDate();
    let sessions = [];

    if (userType === 'parent' && userId) {
      // Parents viewing a specific kid's sessions
      const kidData = familyData.kidsData?.[userId];
      if (kidData && kidData.sessions) {
        sessions = kidData.sessions
          .filter(session => session.date === today)
          .map(session => ({ ...session, kidName: kidData.name, kidId: kidData.id }));
      }
    } else if (userType === 'parent') {
      // Parents can see all kids' sessions (fallback)
      if (familyData.kidsData) {
        Object.values(familyData.kidsData).forEach(kid => {
          const kidSessions = (kid.sessions || [])
            .filter(session => session.date === today)
            .map(session => ({ ...session, kidName: kid.name, kidId: kid.id }));
          sessions = sessions.concat(kidSessions);
        });
      }
    } else {
      // Kids only see their own sessions
      const myData = familyData.myData;
      if (myData && myData.sessions) {
        sessions = myData.sessions.filter(session => session.date === today);
      }
    }

    // Sort by most recent first
    sessions.sort((a, b) => {
      const aTime = new Date(a.timeStarted || a.createdAt).getTime();
      const bTime = new Date(b.timeStarted || b.createdAt).getTime();
      return bTime - aTime;
    });

    setTodaysSessions(sessions);
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAppInfo = (appId) => {
    const availableApps = familyData?.settings?.availableApps || {};
    const app = availableApps[appId];
    
    if (app) {
      return {
        name: app.displayName,
        icon: app.icon,
      };
    }
    
    // Fallback for unknown apps
    return {
      name: appId || 'Unknown App',
      icon: '📱',
    };
  };

  const showDeleteConfirmation = (session) => {
    const appInfo = getAppInfo(session.app);
    const sessionDesc = session.bonus ? 'bonus session' : 
                       session.punishment ? 'punishment' : 
                       `${appInfo.name} session`;

    Alert.alert(
      'Delete Session',
      `Are you sure you want to delete this ${formatTime(session.duration)} ${sessionDesc}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteSession(session),
        },
      ]
    );
  };

  const deleteSession = async (session) => {
    try {
      const familyId = 'braithwaite_family_tracker';
      const targetKidId = userType === 'parent' ? (session.kidId || userId) : userId;

      console.log('🗑️ DELETING SESSION:', {
        sessionId: session.id,
        targetKidId,
        session
      });

      // Call your delete session API
      await apiService.deleteSession(familyId, targetKidId, session.id);
      
      console.log('✅ SESSION DELETED');

      // Refresh data
      refreshFamilyData();

      loadTodaysSessions();

      const appInfo = getAppInfo(session.app);
      const sessionDesc = session.bonus ? 'bonus session' : 
                         session.punishment ? 'punishment' : 
                         `${appInfo.name} session`;

      Alert.alert(
        'Session Deleted',
        `${formatTime(session.duration)} ${sessionDesc} has been deleted.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onSessionUpdate) {
                onSessionUpdate();
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ DELETE ERROR:', error);
      Alert.alert('Error', `Failed to delete session: ${error.message}`);
    }
  };

  const handlePasscodeSubmit = () => {
    // Updated passcode to P@rent
    if (passcode === 'P@rent') {
      setPasscodeVisible(false);
      
      if (passcodeAction === 'edit' && editingSession) {
        handleSessionEdit(editingSession);
      } else if (passcodeAction === 'delete' && deletingSession) {
        showDeleteConfirmation(deletingSession);
      }
      
      // Clear state
      setPasscode('');
      setPasscodeAction('');
    } else {
      Alert.alert('Incorrect Passcode', 'Please ask a parent for help.');
      setPasscode('');
    }
  };

  const handlePasscodeCancel = () => {
    setPasscodeVisible(false);
    setEditingSession(null);
    setDeletingSession(null);
    setPasscode('');
    setPasscodeAction('');
  };

  const handleSessionEdit = (session) => {
    // For now, let's just show duration edit
    Alert.prompt(
      'Edit Session Duration',
      `Current duration: ${formatTime(session.duration)}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            setEditingSession(null);
          },
        },
        {
          text: 'Save',
          onPress: (newDuration) => {
            const duration = parseInt(newDuration);
            if (duration && duration > 0 && duration <= 300) {
              // Update the session
              updateSessionDuration(session, duration);
            } else {
              Alert.alert('Invalid Duration', 'Please enter a valid duration (1-300 minutes)');
            }
          },
        },
      ],
      'plain-text',
      session.duration.toString()
    );
  };

  const updateSessionDuration = async (session, newDuration) => {
    try {
      const familyId = 'braithwaite_family_tracker';
      const targetKidId = userType === 'parent' ? (session.kidId || userId) : userId;

      const updates = {
        duration: newDuration,
        updatedAt: new Date().toISOString(),
        updatedBy: userType === 'parent' ? 'Parent' : userId,
      };

      console.log('✏️ UPDATING SESSION:', {
        sessionId: session.id,
        targetKidId,
        updates
      });

      // Call your update session API
      await apiService.updateSession(familyId, targetKidId, session.id, updates);
      
      console.log('✅ SESSION UPDATED');

      // Refresh data
      refreshFamilyData();

      Alert.alert(
        'Session Updated',
        `Duration changed from ${formatTime(session.duration)} to ${formatTime(newDuration)}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setEditingSession(null);
              if (onSessionUpdate) {
                onSessionUpdate();
              }
              loadTodaysSessions();
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ UPDATE ERROR:', error);
      Alert.alert('Error', `Failed to update session: ${error.message}`);
    }
  };

  // Handle session updated callback from inline editor
  const handleSessionUpdated = () => {
    refreshFamilyData();
    loadTodaysSessions();
    if (onSessionUpdate) {
      onSessionUpdate();
    }
  };

  const renderSession = (session, index) => (
    <SessionCard
      key={session.id || index}
      session={session}
      index={index}
      theme={theme}
      userType={userType}
      userName={userName || userId} // Use userName or fallback to userId
      kidId={session.kidId || userId} // Pass the kid ID for targeting
      getAppInfo={getAppInfo}
      handleDeletePress={showDeleteConfirmation} // Pass delete handler
      onSessionUpdated={handleSessionUpdated} // Pass update callback
    />
  );
  
  const getTotalMinutes = () => {
    return todaysSessions.reduce((total, session) => {
      if (session.countTowardsTotal !== false) {
        return total + (session.duration || 0);
      }
      return total;
    }, 0);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContainer,
            { backgroundColor: theme.menuBackground }
          ]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Today's Sessions
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={[styles.closeButton, { color: theme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Summary */}
            {/* <View style={[
              styles.summaryCard,
              { backgroundColor: theme.isDark ? '#333' : 'rgba(255,255,255,0.8)' }
            ]}>
              <Text style={[styles.summaryTitle, { color: theme.text }]}>
                Daily Summary
              </Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: theme.text }]}>
                    {todaysSessions.length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: theme.text, opacity: 0.7 }]}>
                    Sessions
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#F44336' }]}>
                    {formatTime(getTotalMinutes())}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: theme.text, opacity: 0.7 }]}>
                    Total Time
                  </Text>
                </View>
              </View>
            </View> */}

            {/* Sessions List */}
            <ScrollView
              style={styles.sessionsList}
              showsVerticalScrollIndicator={false}
            >
              {todaysSessions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: theme.text, opacity: 0.6 }]}>
                    No sessions today
                  </Text>
                  <Text style={[styles.emptySubtext, { color: theme.text, opacity: 0.4 }]}>
                    Start a session to see it appear here!
                  </Text>
                </View>
              ) : (
                todaysSessions.map((session, index) => renderSession(session, index))
              )}
            </ScrollView>

            {/* Close Button */}
            <TouchableOpacity
              style={[styles.closeButtonLarge, { backgroundColor: theme.buttonBackground }]}
              onPress={onClose}
            >
              <Text style={[styles.closeButtonText, { color: theme.buttonText }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Passcode Modal */}
      <Modal
        visible={passcodeVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.passcodeOverlay}>
          <View style={[styles.passcodeContainer, { backgroundColor: theme.menuBackground }]}>
            <Text style={[styles.passcodeTitle, { color: theme.text }]}>
              Parent Passcode Required
            </Text>
            <Text style={[styles.passcodeMessage, { color: theme.text, opacity: 0.7 }]}>
              Enter the parent passcode to {passcodeAction} sessions
            </Text>
            
            <TextInput
              style={[
                styles.passcodeInput,
                { 
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.isDark ? '#444' : '#ddd',
                }
              ]}
              value={passcode}
              onChangeText={setPasscode}
              placeholder="Enter passcode"
              placeholderTextColor={theme.isDark ? '#888' : '#666'}
              secureTextEntry={true}
              autoFocus={true}
            />

            <View style={styles.passcodeButtons}>
              <TouchableOpacity
                style={[styles.passcodeButton, { borderColor: theme.text }]}
                onPress={handlePasscodeCancel}
              >
                <Text style={[styles.passcodeButtonText, { color: theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.passcodeButton, { backgroundColor: theme.buttonBackground }]}
                onPress={handlePasscodeSubmit}
              >
                <Text style={[styles.passcodeButtonText, { color: theme.buttonText }]}>
                  Submit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '95%',
    maxWidth: 500,
    height: '85%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 5,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  sessionsList: {
    flex: 1,
    marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  closeButtonLarge: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Passcode Modal Styles
  passcodeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passcodeContainer: {
    width: '80%',
    maxWidth: 300,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  passcodeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  passcodeMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  passcodeInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  passcodeButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  passcodeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  passcodeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TodaysSessionsModal;