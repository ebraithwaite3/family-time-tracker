import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import TodaysSessionsSummary from '../components/TodaysSessionsSummary';
import ActiveSessionBanner from '../components/ActiveSessionBanner';
import StartSessionModal from '../modals/StartSessionModal';

/**
 * ChildHomeTab component displays the child's daily usage, limits, and bedtime status.
 * It receives data and calculated values as props from the parent ChildDashboard.
 */
const ChildHomeTab = ({
  userName,
  todaysDate,
  scheduleType,
  isLoadingData,
  dataError,
  familyData,
  mySettings,
  todaysSessions,
  usedTime,
  currentLimits,
  remainingTime,
  usagePercentage,
  inBedtime,
}) => {
  const { theme } = useTheme();
  const { familyData: contextFamilyData, getEffectiveDailyLimit } = useData(); // ✅ Added getEffectiveDailyLimit
  const [startSessionModalVisible, setStartSessionModalVisible] = useState(false);

  // ✅ Helper function to get punishment total for today
  const getPunishmentTotal = () => {
    const today = todaysDate.toFormat('yyyy-MM-dd');
    let punishmentTotal = 0;

    const myData = contextFamilyData?.myData;
    if (myData && myData.sessions) {
      const todaySessions = myData.sessions.filter(session => session.date === today);
      punishmentTotal = todaySessions
        .filter(session => session.punishment)
        .reduce((total, session) => total + (session.duration || 0), 0);
    }

    return punishmentTotal;
  };

  // ✅ Get effective daily limit (includes bonus time)
  const effectiveDailyLimit = getEffectiveDailyLimit(); // For kids, no kidId needed
  const punishmentTotal = getPunishmentTotal();

  // Check if there are active sessions
  const hasActiveSessions = () => {
    const myData = contextFamilyData?.myData;
    if (myData?.sessions) {
      return myData.sessions.some(session => 
        session.active && session.timeStarted && !session.timeEnded
      );
    }
    return false;
  };

  // Helper function to convert 24hr to 12hr format
  const formatTime12Hour = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const activeSessionExists = hasActiveSessions();
  const showStartSessionButton = !inBedtime && !activeSessionExists && remainingTime > 0;

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          {/* Title */}
          <Text style={[styles.title, { color: theme.text }]}>
            Welcome, {userName}!
          </Text>

          {/* Loading/Error States */}
          {isLoadingData && (
            <Text style={[styles.statusText, { color: theme.text }]}>
              Loading your data...
            </Text>
          )}

          {dataError && (
            <Text style={[styles.errorText, { color: 'red' }]}>
              Error: {dataError.message}
            </Text>
          )}

          {/* Display content only if familyData is available (meaning data has loaded) */}
          {familyData && (
            <>
              {/* Active Session Banner - only show if not in bedtime and has active session */}
              {!inBedtime && activeSessionExists && (
                <ActiveSessionBanner 
                  userType="kid"
                  selectedKid={null}
                  userName={userName}
                />
              )}

              {/* Start Session Button - only show if not in bedtime, no active session, and has remaining time */}
              {showStartSessionButton && (
                <View style={[styles.startSessionCard, { backgroundColor: theme.menuBackground }]}>
                  <Text style={[styles.startSessionTitle, { color: theme.text }]}>
                    🎮 Ready to Play?
                  </Text>
                  <Text style={[styles.startSessionSubtitle, { color: theme.text, opacity: 0.8 }]}>
                    You have {remainingTime} minutes remaining today
                  </Text>
                  <TouchableOpacity
                    style={[styles.startSessionButton, { backgroundColor: '#4CAF50' }]}
                    onPress={() => setStartSessionModalVisible(true)}
                  >
                    <Text style={[styles.startSessionButtonText, { color: '#FFFFFF' }]}>
                      ▶️ Start Session
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Bedtime Alert - only show if in bedtime */}
              {inBedtime && (
                <View style={[styles.bedtimeAlert, { backgroundColor: '#FFE5E5', borderColor: '#F44336' }]}>
                  <Text style={[styles.bedtimeAlertTitle, { color: '#F44336' }]}>
                    🌙 Bedtime Hours
                  </Text>
                  <Text style={[styles.bedtimeAlertText, { color: '#D32F2F' }]}>
                    Screen time is not available during bedtime hours
                  </Text>
                </View>
              )}

              {/* No Time Alert - only show if no remaining time and not in bedtime */}
              {!inBedtime && remainingTime <= 0 && (
                <View style={[styles.noTimeAlert, { backgroundColor: '#FFF3E0', borderColor: '#FF9800' }]}>
                  <Text style={[styles.noTimeAlertTitle, { color: '#FF9800' }]}>
                    ⏰ Daily Limit Reached
                  </Text>
                  <Text style={[styles.noTimeAlertText, { color: '#F57C00' }]}>
                    You've used all your screen time for today. Try again tomorrow!
                  </Text>
                </View>
              )}

              {/* Main Stats Card */}
              <View style={[styles.statsCard, { backgroundColor: theme.menuBackground }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  📅 Your {scheduleType.toUpperCase()}
                </Text>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {effectiveDailyLimit || 'N/A'} {/* ✅ Show effective limit instead of base limit */}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.text }]}>
                      Daily Limit{currentLimits?.dailyTotal !== effectiveDailyLimit ? '*' : ''} {/* ✅ Add asterisk if bonus time */}
                    </Text>
                    {/* ✅ Show bonus time if different from base limit */}
                    {currentLimits?.dailyTotal !== effectiveDailyLimit && (
                      <Text style={[styles.bonusLabel, { color: '#4CAF50' }]}>
                        +{effectiveDailyLimit - (currentLimits?.dailyTotal || 0)} bonus
                      </Text>
                    )}
                  </View>

                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {usedTime}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.text }]}>Used</Text>
                    {/* ✅ Show punishment time if any */}
                    {punishmentTotal > 0 && (
                      <Text style={[styles.punishmentLabel, { color: '#F44336' }]}>
                        +{punishmentTotal} punishment
                      </Text>
                    )}
                  </View>

                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {remainingTime}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.text }]}>Remaining</Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={[styles.progressContainer, { backgroundColor: theme.isDark ? '#333' : '#f0f0f0' }]}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.min(usagePercentage, 100)}%`,
                        backgroundColor: usagePercentage > 90 ? '#ff4444' :
                                      usagePercentage > 80 ? '#ff8800' : '#44aa44'
                      }
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: theme.text }]}>
                  {Math.round(usagePercentage)}% used
                </Text>
              </View>

              {/* Bedtime Status Card */}
              <View style={[styles.statusCard, { backgroundColor: theme.menuBackground }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  🌙 Bedtime Status
                </Text>
                <Text style={[
                  styles.statusText,
                  { color: inBedtime ? '#ff4444' : '#44aa44' }
                ]}>
                  {inBedtime ? 'IN BEDTIME' : 'ACTIVE HOURS'}
                </Text>
                {mySettings?.bedtimeRestrictions && (
                  <Text style={[styles.bedtimeInfo, { color: theme.text }]}>
                    {formatTime12Hour(mySettings.bedtimeRestrictions[scheduleType]?.wakeTime)} - {formatTime12Hour(mySettings.bedtimeRestrictions[scheduleType]?.bedtime)}
                  </Text>
                )}
              </View>

              {/* Today's Sessions Summary */}
              <TodaysSessionsSummary
                userType="kid"
                userId={null}
              />
            </>
          )}
        </View>
      </ScrollView>

      {/* Start Session Modal */}
      <StartSessionModal
        visible={startSessionModalVisible}
        onClose={() => setStartSessionModalVisible(false)}
        userName={userName}
        selectedKid={null}
        userType="kid"
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
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
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  startSessionCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  startSessionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  startSessionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  startSessionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  startSessionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  bedtimeAlert: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    alignItems: 'center',
  },
  bedtimeAlertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bedtimeAlertText: {
    fontSize: 14,
    textAlign: 'center',
  },
  noTimeAlert: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    alignItems: 'center',
  },
  noTimeAlertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noTimeAlertText: {
    fontSize: 14,
    textAlign: 'center',
  },
  statsCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  bonusLabel: { // ✅ Added bonus label style
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  punishmentLabel: { // ✅ Added punishment label style
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  statusCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bedtimeInfo: {
    fontSize: 14,
  },
});

export default ChildHomeTab;