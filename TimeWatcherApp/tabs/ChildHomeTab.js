import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import TodaysSessionsSummary from '../components/TodaysSessionsSummary'; // Assuming this component exists

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
  familyData, // familyData is passed but not directly used within this tab, as specific child data is derived in parent
  mySettings,
  todaysSessions,
  usedTime,
  currentLimits,
  remainingTime,
  usagePercentage,
  inBedtime,
}) => {
  const { theme } = useTheme();

  // Helper function to convert 24hr to 12hr format
  const formatTime12Hour = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
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
            {/* Main Stats Card */}
            <View style={[styles.statsCard, { backgroundColor: theme.menuBackground }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                📅 Your {scheduleType.toUpperCase()}
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {currentLimits?.dailyTotal || 'N/A'}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.text }]}>Daily Limit</Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {usedTime}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.text }]}>Used</Text>
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
            {/* Note: For ChildHomeTab, userId prop to TodaysSessionsSummary should be null or undefined
                as it will automatically use the current user's data from useData context. */}
            <TodaysSessionsSummary
              userType="child" // Indicate it's for a child dashboard
              userId={null} // Or omit this prop, as useData will infer current user
            />
          </>
        )}
      </View>
    </ScrollView>
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