import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import CustomDropdown from '../components/CustomDropdown';
import TodaysSessionsSummary from '../components/TodaysSessionsSummary';
import { DateTime } from 'luxon';

const ParentHomeTab = ({ userName, selectedKid, onKidChange }) => {
  const { theme } = useTheme();
  const { 
    familyData, 
    isLoadingData, 
    dataError,
    todaysDate,
    getTodaysSessions,
    calculateUsedTime,
    getCurrentLimits,
    getRemainingTime,
    getUsagePercentage,
    isInBedtime
  } = useData();

  // Get data for selected kid
  const selectedKidData = selectedKid ? familyData?.kidsData?.[selectedKid] : null;
  const selectedKidSessions = getTodaysSessions(selectedKid);
  const selectedKidUsedTime = calculateUsedTime(selectedKid);
  const selectedKidLimits = getCurrentLimits(selectedKid);
  const selectedKidRemainingTime = getRemainingTime(selectedKid);
  const selectedKidUsagePercentage = getUsagePercentage(selectedKid);
  const selectedKidInBedtime = isInBedtime(selectedKid);

  // Determine if it's weekend
  const isWeekend = todaysDate.weekday >= 6;
  const scheduleType = isWeekend ? 'weekend' : 'weekday';

  // Helper function to convert 24hr to 12hr format
  const formatTime12Hour = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Log data for debugging
  useEffect(() => {
    console.log('=== HOME TAB DATA ===');
    console.log('📅 Date:', todaysDate.toFormat('yyyy-MM-dd'));
    console.log('📅 Schedule Type:', scheduleType);
    console.log('🎯 Selected Kid:', selectedKid);
    if (selectedKid && selectedKidData) {
      console.log('👦 Selected Kid Data:', selectedKidData);
      console.log('📅 Sessions Today:', selectedKidSessions.length);
      console.log('⏱️ Used Time:', selectedKidUsedTime, 'minutes');
      console.log('⏳ Remaining Time:', selectedKidRemainingTime, 'minutes');
      console.log('📈 Usage Percentage:', Math.round(selectedKidUsagePercentage), '%');
    }
  }, [selectedKid, selectedKidData, selectedKidSessions, selectedKidUsedTime, selectedKidRemainingTime, selectedKidUsagePercentage, scheduleType]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.contentContainer}>
        {/* Title */}
        <Text style={[styles.title, { color: theme.text }]}>
          Family Dashboard
        </Text>
        
        {/* Loading/Error States */}
        {isLoadingData && (
          <Text style={[styles.statusText, { color: theme.text }]}>
            Loading family data...
          </Text>
        )}
        
        {dataError && (
          <Text style={[styles.errorText, { color: 'red' }]}>
            Error: {dataError.message}
          </Text>
        )}
        
        {familyData && (
          <>
            {/* Kid Selector */}
            {familyData.kidsData && Object.keys(familyData.kidsData).length > 0 && (
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
                testID="kid-selector"
              />
            )}

            {/* Quick Stats Cards */}
            {selectedKid && selectedKidData && (
              <>
                {/* Main Stats Card */}
                <View style={[styles.statsCard, { backgroundColor: theme.menuBackground }]}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    📅 {selectedKidData.name}'s {scheduleType.toUpperCase()} 
                  </Text>
                  
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: theme.text }]}>
                        {selectedKidLimits?.dailyTotal || 'N/A'}
                      </Text>
                      <Text style={[styles.statLabel, { color: theme.text }]}>Daily Limit</Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: theme.text }]}>
                        {selectedKidUsedTime}
                      </Text>
                      <Text style={[styles.statLabel, { color: theme.text }]}>Used</Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: theme.text }]}>
                        {selectedKidRemainingTime}
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
                          width: `${Math.min(selectedKidUsagePercentage, 100)}%`,
                          backgroundColor: selectedKidUsagePercentage > 90 ? '#ff4444' : 
                                        selectedKidUsagePercentage > 80 ? '#ff8800' : '#44aa44'
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.progressText, { color: theme.text }]}>
                    {Math.round(selectedKidUsagePercentage)}% used
                  </Text>
                </View>

                {/* FIXED: Bedtime Status Card */}
                <View style={[styles.statusCard, { backgroundColor: theme.menuBackground }]}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    🌙 Bedtime Status
                  </Text>
                  <Text style={[
                    styles.statusText, 
                    { color: selectedKidInBedtime ? '#ff4444' : '#44aa44' }
                  ]}>
                    {selectedKidInBedtime ? 'BEDTIME' : 'ACTIVE HOURS'}
                  </Text>
                  {selectedKidData.settings?.bedtimeRestrictions && (
                    <Text style={[styles.bedtimeInfo, { color: theme.text }]}>
                      {/* FIXED: Active hours (wake to bedtime) in 12hr format */}
                      {formatTime12Hour(selectedKidData.settings.bedtimeRestrictions[scheduleType]?.wakeTime)} - {formatTime12Hour(selectedKidData.settings.bedtimeRestrictions[scheduleType]?.bedtime)}
                    </Text>
                  )}
                </View>

                {/* UPDATED: Today's Sessions with better spacing */}
                <TodaysSessionsSummary 
                  userType="parent"
                  userId={selectedKid}
                />

                {/* All Kids Quick Overview */}
                <View style={[styles.overviewCard, { backgroundColor: theme.menuBackground }]}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    👨‍👩‍👧‍👦 Family Overview
                  </Text>
                  {Object.entries(familyData.kidsData).map(([kidId, kidData]) => {
                    const kidUsedTime = calculateUsedTime(kidId);
                    const kidLimits = getCurrentLimits(kidId);
                    const kidUsage = getUsagePercentage(kidId);
                    const isSelected = kidId === selectedKid;
                    
                    return (
                      <View key={kidId} style={[
                        styles.kidOverviewItem,
                        { 
                          backgroundColor: isSelected ? theme.buttonBackground : 'transparent',
                          opacity: isSelected ? 1 : 0.7
                        }
                      ]}>
                        <Text style={[
                          styles.kidName, 
                          { color: isSelected ? theme.buttonText : theme.text }
                        ]}>
                          {kidData.name}
                        </Text>
                        <Text style={[
                          styles.kidStats, 
                          { color: isSelected ? theme.buttonText : theme.text }
                        ]}>
                          {kidUsedTime}/{kidLimits?.dailyTotal || 0}min ({Math.round(kidUsage)}%)
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
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
  overviewCard: {
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  kidOverviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  kidName: {
    fontSize: 16,
    fontWeight: '600',
  },
  kidStats: {
    fontSize: 14,
  },
});

export default ParentHomeTab;