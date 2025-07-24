import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';

/**
 * ChildSettingsTab component displays the child's settings in read-only format.
 */
const ChildSettingsTab = ({ userName, onLogout }) => {
  const { theme } = useTheme();
  const { familyData, todaysDate } = useData();

  // Get the current user's settings
  const mySettings = familyData?.myData?.settings || {};
  const isWeekend = todaysDate.weekday >= 6;
  const scheduleType = isWeekend ? 'weekend' : 'weekday';

  // Helper function to convert 24hr to 12hr format
  const formatTime12Hour = (time24) => {
    if (!time24) return 'Not set';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Get current schedule limits
  const currentLimits = mySettings?.limits?.[scheduleType];
  const weekdayLimits = mySettings?.limits?.weekday;
  const weekendLimits = mySettings?.limits?.weekend;
  const bonusSettings = mySettings?.limits?.bonus;

  // Get bedtime restrictions
  const weekdayBedtime = mySettings?.bedtimeRestrictions?.weekday;
  const weekendBedtime = mySettings?.bedtimeRestrictions?.weekend;

  // Get bonus activities
  const bonusActivities = mySettings?.bonusActivities || {};

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.contentContainer}>
        {/* Header */}
        <Text style={[styles.title, { color: theme.text }]}>
          My Settings
        </Text>
        <Text style={[styles.subtitle, { color: theme.text, opacity: 0.7 }]}>
          Hello {userName}! Here are your current settings.
        </Text>

        {/* Current Schedule Card */}
        <View style={[styles.card, { backgroundColor: theme.menuBackground }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            📅 Current Schedule ({scheduleType.charAt(0).toUpperCase() + scheduleType.slice(1)})
          </Text>
          
          {currentLimits ? (
            <View style={styles.scheduleInfo}>
              <View style={styles.scheduleItem}>
                <Text style={[styles.scheduleLabel, { color: theme.text }]}>Daily Limit:</Text>
                <Text style={[styles.scheduleValue, { color: theme.text }]}>
                  {currentLimits.dailyTotal} minutes
                </Text>
              </View>
              
              {bonusSettings?.enabled && (
                <View style={styles.scheduleItem}>
                  <Text style={[styles.scheduleLabel, { color: theme.text }]}>Max Bonus Time:</Text>
                  <Text style={[styles.scheduleValue, { color: '#4CAF50' }]}>
                    +{bonusSettings.dailyMax} minutes
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={[styles.noData, { color: theme.text, opacity: 0.6 }]}>
              No schedule limits set
            </Text>
          )}
        </View>

        {/* Weekly Schedule Card */}
        <View style={[styles.card, { backgroundColor: theme.menuBackground }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            📊 Weekly Schedule
          </Text>
          
          <View style={styles.weeklySchedule}>
            <View style={styles.scheduleRow}>
              <Text style={[styles.scheduleType, { color: theme.text }]}>📚 Weekdays:</Text>
              <Text style={[styles.scheduleValue, { color: theme.text }]}>
                {weekdayLimits?.dailyTotal || 'Not set'} minutes
              </Text>
            </View>
            
            <View style={styles.scheduleRow}>
              <Text style={[styles.scheduleType, { color: theme.text }]}>🎮 Weekends:</Text>
              <Text style={[styles.scheduleValue, { color: theme.text }]}>
                {weekendLimits?.dailyTotal || 'Not set'} minutes
              </Text>
            </View>
          </View>
        </View>

        {/* Bedtime Card */}
        <View style={[styles.card, { backgroundColor: theme.menuBackground }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            🌙 Bedtime Schedule
          </Text>
          
          <View style={styles.bedtimeSchedule}>
            <View style={styles.bedtimeRow}>
              <Text style={[styles.bedtimeDay, { color: theme.text }]}>Weekdays:</Text>
              <Text style={[styles.bedtimeTime, { color: theme.text }]}>
                {weekdayBedtime ? 
                  `${formatTime12Hour(weekdayBedtime.wakeTime)} - ${formatTime12Hour(weekdayBedtime.bedtime)}` :
                  'Not set'
                }
              </Text>
            </View>
            
            <View style={styles.bedtimeRow}>
              <Text style={[styles.bedtimeDay, { color: theme.text }]}>Weekends:</Text>
              <Text style={[styles.bedtimeTime, { color: theme.text }]}>
                {weekendBedtime ? 
                  `${formatTime12Hour(weekendBedtime.wakeTime)} - ${formatTime12Hour(weekendBedtime.bedtime)}` :
                  'Not set'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Bonus Activities Card */}
        <View style={[styles.card, { backgroundColor: theme.menuBackground }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            🎁 Bonus Activities
          </Text>
          
          {Object.keys(bonusActivities).length > 0 ? (
            <View style={styles.bonusActivities}>
              {Object.entries(bonusActivities)
                .filter(([_, activity]) => activity.enabled)
                .map(([activityId, activity]) => {
                  const icons = {
                    soccer: "⚽",
                    reading: "📚",
                    fitness: "💪",
                    swimming: "🏊",
                    running: "🏃",
                    cycling: "🚴",
                    basketball: "🏀",
                    tennis: "🎾",
                    chores: "🧹",
                    homework: "📝",
                    music: "🎵",
                    art: "🎨",
                  };
                  
                  const displayName = activityId.charAt(0).toUpperCase() + activityId.slice(1);
                  const icon = icons[activityId] || "🎯";
                  
                  return (
                    <View key={activityId} style={styles.bonusActivity}>
                      <Text style={[styles.activityName, { color: theme.text }]}>
                        {icon} {displayName}
                      </Text>
                      <Text style={[styles.activityDescription, { color: theme.text, opacity: 0.7 }]}>
                        {activity.description}
                      </Text>
                    </View>
                  );
                })}
            </View>
          ) : (
            <Text style={[styles.noData, { color: theme.text, opacity: 0.6 }]}>
              No bonus activities available
            </Text>
          )}
        </View>

        {/* App Permissions Card */}
        <View style={[styles.card, { backgroundColor: theme.menuBackground }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            📱 Available Apps
          </Text>
          
          {familyData?.settings?.availableApps ? (
            <View style={styles.appsList}>
              {Object.entries(familyData.settings.availableApps)
                .filter(([_, app]) => app.available)
                .map(([appId, app]) => (
                  <View key={appId} style={styles.appItem}>
                    <Text style={[styles.appName, { color: theme.text }]}>
                      {app.icon} {app.displayName}
                    </Text>
                    <Text style={[styles.appRule, { 
                      color: app.countsTowardTotal === false ? '#4CAF50' : 
                            app.countsTowardTotal === 'conditional' ? '#FF9800' : 
                            theme.text 
                    }]}>
                      {app.countsTowardTotal === false ? 'Free time' :
                       app.countsTowardTotal === 'conditional' ? 'Conditional' :
                       'Counts toward limit'}
                    </Text>
                  </View>
                ))}
            </View>
          ) : (
            <Text style={[styles.noData, { color: theme.text, opacity: 0.6 }]}>
              No apps configured
            </Text>
          )}
        </View>

        {/* Note */}
        <View style={[styles.noteCard, { backgroundColor: theme.isDark ? '#2A2A2A' : '#F0F0F0' }]}>
          <Text style={[styles.noteText, { color: theme.text, opacity: 0.8 }]}>
            ℹ️ These settings are managed by your parents. If you need changes, please ask them to update your settings.
          </Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.buttonBackground }]}
          onPress={onLogout}
        >
          <Text style={[styles.logoutButtonText, { color: theme.buttonText }]}>
            🚪 Logout
          </Text>
        </TouchableOpacity>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
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
    marginBottom: 16,
  },
  scheduleInfo: {
    gap: 8,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleLabel: {
    fontSize: 16,
  },
  scheduleValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  weeklySchedule: {
    gap: 12,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleType: {
    fontSize: 16,
    fontWeight: '500',
  },
  bedtimeSchedule: {
    gap: 12,
  },
  bedtimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bedtimeDay: {
    fontSize: 16,
    fontWeight: '500',
  },
  bedtimeTime: {
    fontSize: 16,
    fontWeight: '600',
  },
  bonusActivities: {
    gap: 12,
  },
  bonusActivity: {
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
    paddingLeft: 12,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 14,
  },
  appsList: {
    gap: 8,
  },
  appItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  appName: {
    fontSize: 16,
    flex: 1,
  },
  appRule: {
    fontSize: 14,
    fontWeight: '500',
  },
  noteCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  noteText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  noData: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  logoutButton: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChildSettingsTab;