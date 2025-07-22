import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import Header from '../components/Header';
import { DateTime } from 'luxon';

// Import tab components
import ChildHomeTab from '../tabs/ChildHomeTab';
import EditTab from '../tabs/EditTab';
import HistoryTab from '../tabs/HistoryTab';
import ChildSettingsTab from '../tabs/ChildSettingsTab';

const ChildDashboard = ({ userName, onLogout }) => {
  const { theme } = useTheme();
  const {
    familyData,
    isLoadingData,
    dataError,
    refreshFamilyData,
    todaysDate,
    getCurrentUserSettings,
    getTodaysSessions,
    calculateUsedTime,
    getCurrentLimits,
    getRemainingTime,
    getUsagePercentage,
    isInBedtime
  } = useData();

  const [activeTab, setActiveTab] = useState('home');

  // Get all the data using helper functions (these will be passed to ChildHomeTab)
  const mySettings = getCurrentUserSettings();
  const todaysSessions = getTodaysSessions();
  const usedTime = calculateUsedTime();
  const currentLimits = getCurrentLimits();
  const remainingTime = getRemainingTime();
  const usagePercentage = getUsagePercentage();
  const inBedtime = isInBedtime();

  // Determine if it's weekend
  const isWeekend = todaysDate.weekday >= 6;
  const scheduleType = isWeekend ? 'weekend' : 'weekday';

  // Log everything for debugging (kept here as this component processes the data)
  useEffect(() => {
    console.log('=== CHILD DASHBOARD DATA ===');
    console.log('📅 Date:', todaysDate.toFormat('yyyy-MM-dd'));
    console.log('📅 Schedule Type:', scheduleType);
    console.log('👤 User:', userName);
    console.log('🔄 Loading:', isLoadingData);
    console.log('❌ Error:', dataError);
    console.log('📊 Family Data Structure:', familyData ? Object.keys(familyData) : 'null');

    if (familyData) {
      console.log('👤 My Data Keys:', familyData.myData ? Object.keys(familyData.myData) : 'null');
      console.log('👤 My Full Data:', familyData.myData);
      console.log('🌍 Global Settings:', familyData.globalSettings);
    }

    console.log('⚙️ My Settings:', mySettings);
    console.log('📅 Today\'s Sessions:', todaysSessions);
    console.log('⏱️ Used Time:', usedTime, 'minutes');
    console.log('📊 Current Limits:', currentLimits);
    console.log('⏳ Remaining Time:', remainingTime, 'minutes');
    console.log('📈 Usage Percentage:', Math.round(usagePercentage), '%');
    console.log('🌙 In Bedtime:', inBedtime);

    // Log specific settings details
    if (mySettings) {
      console.log('💰 Bonus Activities:', mySettings.bonusActivities);
      console.log('🛏️ Bedtime Restrictions:', mySettings.bedtimeRestrictions);
      console.log('📱 App Rules:', mySettings.appRules);
    }

    // Log session details
    if (todaysSessions.length > 0) {
      console.log('📋 Session Details:');
      todaysSessions.forEach((session, index) => {
        console.log(`  Session ${index + 1}:`, {
          duration: session.duration,
          device: session.device,
          app: session.app,
          countTowardsTotal: session.countTowardsTotal,
          weekend: session.weekend,
          dailyLimitWhenRecorded: session.dailyLimitWhenRecorded
        });
      });
    }

  }, [familyData, isLoadingData, dataError, mySettings, todaysSessions, usedTime, currentLimits, remainingTime, usagePercentage, inBedtime, scheduleType, todaysDate, userName]);

  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'edit', label: 'Edit', icon: '✏️' },
    { id: 'history', label: 'History', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const renderTabButton = (tab) => {
    const isActive = activeTab === tab.id;
    return (
      <TouchableOpacity
        key={tab.id}
        style={[
          styles.tabButton,
          {
            backgroundColor: isActive ? theme.buttonBackground : 'transparent',
          }
        ]}
        onPress={() => setActiveTab(tab.id)}
      >
        <Text style={[
          styles.tabIcon,
          { color: isActive ? theme.buttonText : theme.text }
        ]}>
          {tab.icon}
        </Text>
        <Text style={[
          styles.tabLabel,
          {
            color: isActive ? theme.buttonText : theme.text,
            fontWeight: isActive ? '600' : '400'
          }
        ]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderActiveTab = () => {
    // Props common to most tabs
    const commonProps = {
      userName,
      onLogout,
    };

    switch (activeTab) {
      case 'home':
        return (
          <ChildHomeTab
            {...commonProps}
            todaysDate={todaysDate}
            scheduleType={scheduleType}
            isLoadingData={isLoadingData}
            dataError={dataError}
            familyData={familyData}
            mySettings={mySettings}
            todaysSessions={todaysSessions}
            usedTime={usedTime}
            currentLimits={currentLimits}
            remainingTime={remainingTime}
            usagePercentage={usagePercentage}
            inBedtime={inBedtime}
          />
        );
      case 'edit':
        return <EditTab {...commonProps} />;
      case 'history':
        return <HistoryTab {...commonProps} />;
      case 'settings':
        return <ChildSettingsTab {...commonProps} />;
      default:
        return <ChildHomeTab {...commonProps} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.headerBackground }]}>
      <Header userName={userName} onNameCleared={onLogout} />

      {/* Tab Content */}
      <View style={[styles.content, { backgroundColor: theme.background }]}>
        {renderActiveTab()}
      </View>

      {/* Bottom Tab Bar */}
      <View style={[
        styles.tabBar,
        {
          backgroundColor: theme.headerBackground,
          borderTopColor: theme.isDark ? '#444' : '#ddd'
        }
      ]}>
        {tabs.map(renderTabButton)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 20, // Extra padding for safe area
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default ChildDashboard;