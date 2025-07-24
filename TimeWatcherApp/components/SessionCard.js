// src/components/SessionCard.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import InlineSessionEditor from './InlineSessionEditor';

const SessionCard = ({
  session,
  index, 
  theme, 
  userType, 
  userName, 
  kidId, 
  getAppInfo, 
  handleDeletePress, 
  onSessionUpdated, 
  hideDeleteAndEdit = false // New prop to control visibility
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [passcodeVisible, setPasscodeVisible] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeAction, setPasscodeAction] = useState(''); // ✅ Track what action needs passcode

  const appInfo = getAppInfo(session.app);
  const isBonus = session.bonus;
  const isPunishment = session.punishment;
  const isNonCounting = session.countTowardsTotal === false && !isBonus && !isPunishment; // ✅ New: detect non-counting sessions

  let sessionType = 'Regular Session';
  let typeIcon = appInfo.icon;

  if (isBonus) {
    sessionType = 'Bonus Time';
    typeIcon = '🎁';
  } else if (isPunishment) {
    sessionType = 'Punishment';
    typeIcon = '⚠️';
  }

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    // Ensure negative minutes don't show odd formatting
    if (minutes < 0) return `-${formatTime(Math.abs(minutes))}`;
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

  // Handle edit button press
  const handleEditPress = () => {
    if (userType === 'kid') {
      // Kids need to enter passcode
      setPasscodeAction('edit'); // ✅ Set action type
      setPasscodeVisible(true);
      setPasscode('');
    } else {
      // Parents can edit directly
      setIsEditing(true);
    }
  };

  // ✅ Handle delete button press with passcode protection for kids
  const handleDeleteButtonPress = () => {
    if (userType === 'kid') {
      // Kids need to enter passcode for delete
      setPasscodeAction('delete');
      setPasscodeVisible(true);
      setPasscode('');
    } else {
      // Parents can delete directly
      handleDeletePress(session);
    }
  };

  // Handle passcode submission
  const handlePasscodeSubmit = () => {
    if (passcode === 'P@rent') {
      setPasscodeVisible(false);
      setPasscode('');
      
      // ✅ Execute the appropriate action
      if (passcodeAction === 'edit') {
        setIsEditing(true);
      } else if (passcodeAction === 'delete') {
        handleDeletePress(session);
      }
      
      setPasscodeAction(''); // ✅ Clear action
    } else {
      Alert.alert('Incorrect Passcode', 'Please ask a parent for help.');
      setPasscode('');
    }
  };

  // Handle passcode cancel
  const handlePasscodeCancel = () => {
    setPasscodeVisible(false);
    setPasscode('');
    setPasscodeAction(''); // ✅ Clear action
  };

  // Handle save from inline editor
  const handleEditorSave = () => {
    setIsEditing(false);
    if (onSessionUpdated) {
      onSessionUpdated();
    }
  };

  // Handle cancel from inline editor
  const handleEditorCancel = () => {
    setIsEditing(false);
  };

  // Determine the primary duration to display at the top right
  const primaryDisplayDuration = isBonus && session.bonusTime !== undefined
    ? session.bonusTime
    : session.duration;

  return (
    <View key={session.id || index} style={[
      styles.sessionCard,
      {
        backgroundColor: theme.isDark ? '#2A2A2A' : 'rgba(255,255,255,0.9)',
        borderLeftWidth: 3,
        borderLeftColor: isBonus ? '#4CAF50' : isPunishment ? '#F44336' : theme.buttonBackground,
      }
    ]}>
      <View style={styles.sessionHeader}>
        <View style={styles.sessionInfo}>
          <Text style={[styles.sessionTitle, { color: theme.text }]}>
            {typeIcon} {sessionType}
          </Text>
          {session.app && (
            <Text style={[styles.appName, { color: theme.text, opacity: 0.8 }]}>
              {appInfo.name}{isNonCounting ? ' 🚶' : ''} {/* ✅ Add walking icon for non-counting sessions */}
            </Text>
          )}
          {userType === 'parent' && session.kidName && (
            <Text style={[styles.kidName, { color: theme.text, opacity: 0.6 }]}>
              {session.kidName}
            </Text>
          )}
          {/* Display "Time Spent" specifically for bonus sessions, under kid's name */}
          {isBonus && session.duration !== undefined && (
            <Text style={[styles.timeSpent, { color: theme.text, opacity: 0.6 }]}>
              Time Spent: {formatTime(session.duration)}
            </Text>
          )}
        </View>

        <View style={styles.sessionStats}>
          {/* Display the primary duration (bonusTime for bonus, duration for others) */}
          <Text style={[
            styles.duration,
            { color: isPunishment ? '#F44336' : isBonus ? '#4CAF50' : theme.text }
          ]}>
            {isPunishment ? '-' : isBonus ? '+' : ''}{formatTime(primaryDisplayDuration)}
          </Text>

          <View style={styles.actionButtons}>
            {/* Only show edit button if it's not a 'bonusOnly' or 'punishmentOnly' type */}
            {!(session.bonusOnly || session.punishmentOnly) && !hideDeleteAndEdit && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditPress}
              >
                <Text style={styles.editButtonText}>✏️</Text>
              </TouchableOpacity>
            )}

            {!hideDeleteAndEdit && (
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: '#ff4444' }]}
              onPress={handleDeleteButtonPress} // ✅ Use new handler with passcode protection
            >
              <Text style={styles.deleteButtonText}>🗑️</Text>
            </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={styles.sessionDetails}>
        {session.timeStarted && session.timeEnded && (
          <Text style={[styles.timeRange, { color: theme.text, opacity: 0.7 }]}>
            {formatTimestamp(session.timeStarted)} - {formatTimestamp(session.timeEnded)}
          </Text>
        )}
        {session.device && (
          <Text style={[styles.device, { color: theme.text, opacity: 0.7 }]}>
            Device: {session.device}
          </Text>
        )}
        {(session.reason || session.reasonMessage) && (
          <Text style={[styles.reason, { color: theme.text, opacity: 0.7 }]}>
            Reason: {session.reason || session.reasonMessage}
          </Text>
        )}
      </View>

      {/* Inline Editor */}
      {isEditing && (
        <InlineSessionEditor
          session={session}
          theme={theme}
          userType={userType}
          userName={userName}
          kidId={kidId}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      )}

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
              Enter the parent passcode to {passcodeAction} this session {/* ✅ Dynamic message */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  sessionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  appName: {
    fontSize: 14,
    marginBottom: 2,
  },
  kidName: {
    fontSize: 12,
  },
  // New style for "Time Spent"
  timeSpent: {
    fontSize: 12,
    marginTop: 2,
  },
  sessionStats: {
    alignItems: 'flex-end',
  },
  duration: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  editButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    minWidth: 32,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 6,
    minWidth: 32,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
    color: 'white',
  },
  sessionDetails: {
    marginTop: 8,
  },
  timeRange: {
    fontSize: 12,
    marginBottom: 2,
  },
  device: {
    fontSize: 12,
    marginBottom: 2,
  },
  reason: {
    fontSize: 12,
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

export default SessionCard;