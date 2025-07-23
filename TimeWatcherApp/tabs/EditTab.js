import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import CustomDropdown from '../components/CustomDropdown';

// Import modals (these will need to be created)
import QuickAddModal from '../modals/QuickAddModal';
import StartSessionModal from '../modals/StartSessionModal';
// import EndSessionModal from '../modals/EndSessionModal';
import BonusModal from '../modals/BonusModal';
import PunishmentModal from '../modals/PunishmentModal';

const EditTab = ({ userName, selectedKid, onKidChange, userType }) => {
  const { theme } = useTheme();
  const { familyData } = useData();

  // Modal visibility states
  const [activeModal, setActiveModal] = useState(null);

  // Get active sessions to show/hide "End Session" option
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

  // Get available action options based on user type and context
  const getActionOptions = () => {
    const activeSessions = getActiveSessions();
    const baseActions = [
      {
        id: 'quickAdd',
        title: 'Quick Add Session',
        subtitle: 'Add completed screen time',
        icon: '⚡',
        color: '#4CAF50',
      },
      {
        id: 'startSession',
        title: 'Start Session',
        subtitle: 'Begin a new timed session',
        icon: '▶️',
        color: '#2196F3',
      },
      {
        id: 'addBonus',
        title: userType === 'parent' ? 'Award Bonus Time' : 'Claim Activity Bonus',
        subtitle: userType === 'parent' 
          ? 'Give extra screen time' 
          : 'Convert activities to screen time',
        icon: '💰',
        color: '#FF9800',
      },
    ];

    // Add "End Session" if there are active sessions
    if (activeSessions.length > 0) {
      baseActions.splice(2, 0, {
        id: 'endSession',
        title: 'End Active Session',
        subtitle: `${activeSessions.length} session${activeSessions.length > 1 ? 's' : ''} running`,
        icon: '⏹️',
        color: '#F44336',
      });
    }

    // Add punishment option for parents
    if (userType === 'parent') {
      baseActions.push({
        id: 'addPunishment',
        title: 'Apply Punishment',
        subtitle: 'Deduct time for misbehavior',
        icon: '⚠️',
        color: '#9C27B0',
      });
    }

    return baseActions;
  };

  const openModal = (modalType) => {
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const renderActionButton = (action) => (
    <TouchableOpacity
      key={action.id}
      style={[
        styles.actionButton,
        {
          backgroundColor: theme.menuBackground,
          borderColor: theme.isDark ? '#444' : '#ddd',
        }
      ]}
      onPress={() => openModal(action.id)}
      activeOpacity={0.7}
    >
      <View style={styles.actionButtonContent}>
        <View style={[styles.iconContainer, { backgroundColor: action.color }]}>
          <Text style={styles.actionIcon}>{action.icon}</Text>
        </View>
        <View style={styles.actionTextContainer}>
          <Text style={[styles.actionTitle, { color: theme.text }]}>
            {action.title}
          </Text>
          <Text style={[styles.actionSubtitle, { color: theme.text, opacity: 0.7 }]}>
            {action.subtitle}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: theme.text, opacity: 0.5 }]}>
          ›
        </Text>
      </View>
    </TouchableOpacity>
  );

  const actionOptions = getActionOptions();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: theme.text }]}>
            {userType === 'parent' ? 'Manage Sessions' : 'My Sessions'}
          </Text>
          
          {/* Parent: Kid Selector */}
          {userType === 'parent' && familyData?.kidsData && Object.keys(familyData.kidsData).length > 0 && (
            <View style={[styles.kidSelectorContainer, { backgroundColor: theme.menuBackground }]}>
              <CustomDropdown
                title="👨‍👩‍👧‍👦 SELECT CHILD"
                selectedValue={selectedKid}
                onValueChange={onKidChange}
                options={Object.keys(familyData.kidsData).map(kidId => ({
                  label: familyData.kidsData[kidId].name,
                  value: kidId
                }))}
                placeholder="Select a child"
                style={{
                  button: { width: '100%' },
                  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }
                }}
              />
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              🎯 Quick Actions
            </Text>
            {actionOptions.map(renderActionButton)}
          </View>

          {/* Help Text */}
          <View style={[styles.helpContainer, { backgroundColor: theme.menuBackground }]}>
            <Text style={[styles.helpTitle, { color: theme.text }]}>💡 Quick Tips</Text>
            <Text style={[styles.helpText, { color: theme.text, opacity: 0.8 }]}>
              • Use Quick Add for sessions that already happened{'\n'}
              • Start Session to begin tracking time in real-time{'\n'}
              {userType === 'parent' 
                    ? `• Award bonus time for good behavior or activities\n• Apply punishments to deduct time when needed`
                    : `• Claim bonus time by logging physical activities\n• Check with parents about bonus activity ratios`
                }

            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      {activeModal === 'quickAdd' && (
        <QuickAddModal
          visible={true}
          onClose={closeModal}
          userName={userName}
          selectedKid={selectedKid}
          userType={userType}
        />
      )}

      {activeModal === 'startSession' && (
        <StartSessionModal
          visible={true}
          onClose={closeModal}
          userName={userName}
          selectedKid={selectedKid}
          userType={userType}
        />
      )}

      {activeModal === 'endSession' && (
        <EndSessionModal
          visible={true}
          onClose={closeModal}
          userName={userName}
          selectedKid={selectedKid}
          userType={userType}
        />
      )}

      {activeModal === 'addBonus' && (
        <BonusModal
          visible={true}
          onClose={closeModal}
          userName={userName}
          selectedKid={selectedKid}
          userType={userType}
        />
      )}

      {activeModal === 'addPunishment' && userType === 'parent' && (
        <PunishmentModal
          visible={true}
          onClose={closeModal}
          userName={userName}
          selectedKid={selectedKid}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  kidSelectorContainer: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  actionButton: {
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
  },
  helpContainer: {
    borderRadius: 12,
    padding: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default EditTab;