import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import Header from '../components/Header';
import { DateTime } from 'luxon';

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

 // Get all the data using helper functions
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

 // Log everything for debugging
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

 }, [familyData, isLoadingData, dataError, mySettings, todaysSessions, usedTime, currentLimits, remainingTime, usagePercentage, inBedtime, scheduleType]);

 return (
   <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
     <Header userName={userName} onNameCleared={onLogout} />
     <View style={styles.contentContainer}>
       <Text style={[styles.text, { color: theme.text }]}>
         Child Dashboard for {userName}!
       </Text>
       
       {/* Display loading/error states */}
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
         <View style={styles.dataContainer}>
           {/* Basic Info */}
           <Text style={[styles.sectionTitle, { color: theme.text }]}>
             📅 {scheduleType.toUpperCase()} SCHEDULE
           </Text>
           
           {/* Time Info */}
           <Text style={[styles.dataText, { color: theme.text }]}>
             Daily Limit: {currentLimits?.dailyTotal || 'N/A'} minutes
           </Text>
           <Text style={[styles.dataText, { color: theme.text }]}>
             Used Time: {usedTime} minutes
           </Text>
           <Text style={[styles.dataText, { color: theme.text }]}>
             Remaining: {remainingTime} minutes
           </Text>
           <Text style={[styles.dataText, { color: theme.text }]}>
             Usage: {Math.round(usagePercentage)}%
           </Text>
           
           {/* Session Info */}
           <Text style={[styles.sectionTitle, { color: theme.text }]}>
             📱 TODAY'S SESSIONS
           </Text>
           <Text style={[styles.dataText, { color: theme.text }]}>
             Total Sessions: {todaysSessions.length}
           </Text>
           <Text style={[styles.dataText, { color: theme.text }]}>
             Counting Sessions: {todaysSessions.filter(s => s.countTowardsTotal).length}
           </Text>
           
           {/* Bedtime Info */}
           <Text style={[styles.sectionTitle, { color: theme.text }]}>
             🌙 BEDTIME STATUS
           </Text>
           <Text style={[styles.dataText, { color: inBedtime ? 'red' : 'green' }]}>
             Status: {inBedtime ? 'IN BEDTIME' : 'ACTIVE HOURS'}
           </Text>
           {mySettings?.bedtimeRestrictions && (
             <>
               <Text style={[styles.dataText, { color: theme.text }]}>
                 Bedtime: {mySettings.bedtimeRestrictions[scheduleType]?.bedtime || 'N/A'}
               </Text>
               <Text style={[styles.dataText, { color: theme.text }]}>
                 Wake Time: {mySettings.bedtimeRestrictions[scheduleType]?.wakeTime || 'N/A'}
               </Text>
             </>
           )}
           
           {/* Bonus Activities */}
           <Text style={[styles.sectionTitle, { color: theme.text }]}>
             💰 BONUS ACTIVITIES
           </Text>
           {mySettings?.bonusActivities && Object.entries(mySettings.bonusActivities).map(([activity, rules]) => (
             <Text key={activity} style={[styles.dataText, { color: theme.text }]}>
               {activity}: {rules.enabled ? `${rules.ratio}:1 (max ${rules.dailyMax}min)` : 'Disabled'}
             </Text>
           ))}
           
           {/* Device Limits */}
           {currentLimits?.perDevice && (
             <>
               <Text style={[styles.sectionTitle, { color: theme.text }]}>
                 📱 DEVICE LIMITS
               </Text>
               {Object.entries(currentLimits.perDevice).map(([device, limit]) => (
                 <Text key={device} style={[styles.dataText, { color: theme.text }]}>
                   {device}: {limit} minutes
                 </Text>
               ))}
             </>
           )}
           
           {/* App Limits */}
           {currentLimits?.perApp && (
             <>
               <Text style={[styles.sectionTitle, { color: theme.text }]}>
                 🎮 APP LIMITS
               </Text>
               {Object.entries(currentLimits.perApp).map(([app, limit]) => (
                 <Text key={app} style={[styles.dataText, { color: theme.text }]}>
                   {app}: {limit} minutes
                 </Text>
               ))}
             </>
           )}
         </View>
       )}
     </View>
   </SafeAreaView>
 );
};

const styles = StyleSheet.create({
 safeArea: {
   flex: 1,
 },
 contentContainer: {
   flex: 1,
   justifyContent: 'flex-start',
   alignItems: 'center',
   paddingHorizontal: 20,
   paddingTop: 20,
 },
 text: {
   fontSize: 24,
   fontWeight: 'bold',
   textAlign: 'center',
   marginBottom: 20,
 },
 sectionTitle: {
   fontSize: 18,
   fontWeight: 'bold',
   textAlign: 'center',
   marginTop: 15,
   marginBottom: 10,
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
 dataContainer: {
   alignItems: 'center',
   width: '100%',
 },
 dataText: {
   fontSize: 14,
   marginBottom: 5,
   textAlign: 'center',
 },
});

export default ChildDashboard;