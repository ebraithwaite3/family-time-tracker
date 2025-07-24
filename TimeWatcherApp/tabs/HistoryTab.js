import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import CustomDropdown from '../components/CustomDropdown';
import UsageChart from '../components/UsageChart';
import HistorySessionsList from '../components/HistorySessionsList';
import { DateTime } from 'luxon';

const HistoryTab = ({ userName, selectedKid, onKidChange, userType }) => {
  const { theme } = useTheme();
  const { familyData, todaysDate } = useData();
  const [selectedPeriod, setSelectedPeriod] = useState('thisWeek');
  console.log("USER TYPE HISTORY TAB:", userType);

  // Calculate date ranges for different periods
  const getDateRange = (period) => {
    const today = todaysDate;
    
    switch (period) {
      case 'thisWeek':
        const startOfWeek = today.startOf('week');
        return {
          start: startOfWeek,
          end: today,
          label: 'This Week'
        };
      case 'lastWeek':
        const lastWeekStart = today.minus({ weeks: 1 }).startOf('week');
        const lastWeekEnd = lastWeekStart.endOf('week');
        return {
          start: lastWeekStart,
          end: lastWeekEnd,
          label: 'Last Week'
        };
      case 'thisMonth':
        const startOfMonth = today.startOf('month');
        return {
          start: startOfMonth,
          end: today,
          label: 'This Month'
        };
      case 'lastMonth':
        const lastMonthStart = today.minus({ months: 1 }).startOf('month');
        const lastMonthEnd = lastMonthStart.endOf('month');
        return {
          start: lastMonthStart,
          end: lastMonthEnd,
          label: 'Last Month'
        };
      default:
        return getDateRange('thisWeek');
    }
  };

  // Get sessions for the target user and date range
  const getSessionsForPeriod = () => {
    const dateRange = getDateRange(selectedPeriod);
    let allSessions = [];

    if (userType === 'parent' && selectedKid) {
      // Parent viewing specific kid
      const kidData = familyData?.kidsData?.[selectedKid];
      allSessions = kidData?.sessions || [];
    } else if (userType === 'kid') {
      // Kid viewing their own data
      allSessions = familyData?.myData?.sessions || [];
    }

    // Filter sessions by date range
    return allSessions.filter(session => {
      const sessionDate = DateTime.fromISO(session.date);
      return sessionDate >= dateRange.start && sessionDate <= dateRange.end;
    });
  };

  // Calculate statistics for the selected period
  const calculateStats = useMemo(() => {
    const sessions = getSessionsForPeriod();
    const dateRange = getDateRange(selectedPeriod);
    
    // Total time (regular sessions + punishments)
    const totalTime = sessions.reduce((total, session) => {
      if (session.punishment) {
        return total + (session.duration || 0);
      } else if (session.countTowardsTotal !== false && !session.bonus) {
        return total + (session.duration || 0);
      }
      return total;
    }, 0);

    // Total bonus time earned
    const totalBonusTime = sessions
      .filter(session => session.bonus)
      .reduce((total, session) => total + (session.bonusTime || 0), 0);

    // Session counts
    const regularSessions = sessions.filter(session => !session.bonus && !session.punishment).length;
    const bonusSessions = sessions.filter(session => session.bonus).length;
    const punishmentSessions = sessions.filter(session => session.punishment).length;

    // Calculate days in period and average
    const daysInPeriod = Math.max(1, dateRange.end.diff(dateRange.start, 'days').days + 1);
    const avgDaily = Math.round(totalTime / daysInPeriod);

    // Get daily limit for compliance calculation
    const isWeekend = todaysDate.weekday >= 6;
    let dailyLimit = 120; // Default fallback
    
    if (userType === 'parent' && selectedKid) {
      const kidSettings = familyData?.kidsData?.[selectedKid]?.settings;
      dailyLimit = kidSettings?.limits?.[isWeekend ? 'weekend' : 'weekday']?.dailyTotal || 120;
    } else if (userType === 'kid') {
      const mySettings = familyData?.myData?.settings;
      dailyLimit = mySettings?.limits?.[isWeekend ? 'weekend' : 'weekday']?.dailyTotal || 120;
    }

    // Calculate compliance (days under limit)
    const dailyUsage = {};
    sessions.forEach(session => {
      const date = session.date;
      if (!dailyUsage[date]) dailyUsage[date] = 0;
      
      if (session.punishment || (session.countTowardsTotal !== false && !session.bonus)) {
        dailyUsage[date] += (session.duration || 0);
      }
    });

    const daysWithData = Object.keys(dailyUsage).length;
    const compliantDays = Object.values(dailyUsage).filter(usage => usage <= dailyLimit).length;
    const complianceRate = daysWithData > 0 ? Math.round((compliantDays / daysWithData) * 100) : 100;

    return {
      totalTime,
      totalBonusTime,
      avgDaily,
      regularSessions,
      bonusSessions,
      punishmentSessions,
      complianceRate,
      daysInPeriod: Math.round(daysInPeriod)
    };
  }, [selectedPeriod, selectedKid, familyData, userType]);

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const dateRange = getDateRange(selectedPeriod);
  const sessions = getSessionsForPeriod();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.contentContainer}>
        <Text style={[styles.title, { color: theme.text }]}>
          History & Reports
        </Text>
        
        {/* Kid Selector - Only for Parents */}
        {userType === 'parent' && familyData?.kidsData && Object.keys(familyData.kidsData).length > 0 && (
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
              button: { width: '100%', marginVertical: 15 },
              title: { fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 10 }
            }}
          />
        )}

        {/* Show message if parent hasn't selected a kid */}
        {userType === 'parent' && !selectedKid && familyData?.kidsData && Object.keys(familyData.kidsData).length > 0 && (
          <View style={[styles.selectKidMessage, { backgroundColor: theme.menuBackground }]}>
            <Text style={[styles.selectKidText, { color: theme.text }]}>
              👆 Please select a child to view their history
            </Text>
          </View>
        )}

        {/* Only show content if we have a target user */}
        {(userType === 'kid' || (userType === 'parent' && selectedKid)) && (
          <View>

        {/* Time Period Selector */}
        <View style={styles.periodContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            📅 Time Period
          </Text>
          <View style={styles.periodButtons}>
            {[
              { key: 'thisWeek', label: 'This Week' },
              { key: 'lastWeek', label: 'Last Week' },
            //   { key: 'thisMonth', label: 'This Month' },
            //   { key: 'lastMonth', label: 'Last Month' }
            ].map(period => (
              <TouchableOpacity
                key={period.key}
                style={[
                  styles.periodButton,
                  {
                    backgroundColor: selectedPeriod === period.key 
                      ? theme.buttonBackground 
                      : theme.menuBackground,
                    borderColor: theme.isDark ? '#444' : '#ddd',
                  }
                ]}
                onPress={() => setSelectedPeriod(period.key)}
              >
                <Text style={[
                  styles.periodButtonText,
                  {
                    color: selectedPeriod === period.key 
                      ? theme.buttonText 
                      : theme.text
                  }
                ]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.menuBackground }]}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {formatTime(calculateStats.totalTime)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                Total Time
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.menuBackground }]}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {formatTime(calculateStats.avgDaily)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                Avg Daily
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.menuBackground }]}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {calculateStats.regularSessions + calculateStats.bonusSessions + calculateStats.punishmentSessions}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                Total Sessions
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.menuBackground }]}>
              <Text style={[
                styles.statValue, 
                { color: calculateStats.complianceRate >= 80 ? '#4CAF50' : calculateStats.complianceRate >= 60 ? '#FF9800' : '#F44336' }
              ]}>
                {calculateStats.complianceRate}%
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>
                Compliance
              </Text>
            </View>
          </View>

          {/* Bonus Time Card - Only if there's bonus time */}
          {calculateStats.totalBonusTime > 0 && (
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: theme.menuBackground, borderLeftWidth: 3, borderLeftColor: '#4CAF50' }]}>
                <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                  +{formatTime(calculateStats.totalBonusTime)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.text }]}>
                  Bonus Earned
                </Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.menuBackground }]}>
                <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                  {calculateStats.bonusSessions}
                </Text>
                <Text style={[styles.statLabel, { color: theme.text }]}>
                  Bonus Activities
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Usage Chart */}
        <View style={[styles.chartContainer, { backgroundColor: theme.menuBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            📊 Daily Usage - {dateRange.label}
          </Text>
          <UsageChart 
            sessions={sessions}
            dateRange={dateRange}
            theme={theme}
            userType={userType}
            selectedKid={selectedKid}
            familyData={familyData}
          />
        </View>

        {/* Recent Sessions */}
        <View style={[styles.sessionsContainer, { backgroundColor: theme.menuBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            📋 Sessions - {dateRange.label}
          </Text>
          <HistorySessionsList 
            sessions={sessions}
            theme={theme}
            userType={userType}
            userName={userName}
            selectedKid={selectedKid}
          />
        </View>
        </View>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  periodContainer: {
    marginBottom: 20,
  },
  periodButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 80,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  chartContainer: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sessionsContainer: {
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
});

export default HistoryTab;