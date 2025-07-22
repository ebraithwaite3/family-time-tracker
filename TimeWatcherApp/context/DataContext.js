import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/apiService'; // Import your API service
import { DateTime } from 'luxon'; // Import Luxon for date handling
import { AppState } from 'react-native'; // Import AppState to handle app state changes

const DataContext = createContext();

// Correctly receive userName and isParent as props
export const DataProvider = ({ children, userName, isParent }) => {
  const [familyData, setFamilyData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);

  const [todaysDate, setTodaysDate] = useState(() => DateTime.now());

  useEffect(() => {
    const updateDate = () => {
      const newDate = DateTime.now();
      setTodaysDate(newDate);
      console.log('📅 Date updated:', newDate.toFormat('yyyy-MM-dd'));
    };

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        updateDate();
      }
    });

    return () => subscription?.remove();
  }, []);

  // This effect will now re-run when userName or isParent props change
  useEffect(() => {
    console.log('🔍 DataProvider useEffect triggered');
    console.log('🔍 userName:', userName);
    console.log('🔍 isParent:', isParent);
    
    // Only attempt to load data if a user is logged in (userName is not null/undefined)
    if (userName) { // Check if userName is provided (implies logged in)
      console.log('🔍 Calling loadFamilyData...');
      loadFamilyData(userName, isParent); // Pass current userName and isParent from props
    } else {
      // If no user is logged in (userName is null), clear data and reset states
      console.log('🔍 No userName - clearing data');
      setFamilyData(null);
      setIsLoadingData(false);
      setDataError(null);
      console.log("👤 No user logged in, DataProvider cleared data.");
    }
  }, [userName, isParent]); // Dependency array includes userName and isParent props

  // loadFamilyData now accepts currentUserName and currentIsParent as arguments
  const loadFamilyData = async (currentUserName, currentIsParent) => {
    console.log('🔍 STEP 1: loadFamilyData called');
    console.log('🔍 STEP 2: currentUserName:', currentUserName);
    console.log('🔍 STEP 3: currentIsParent:', currentIsParent);

    setIsLoadingData(true);
    setDataError(null);
    
    try {
      // First, try to load from AsyncStorage (for offline capability)
      const storedFamilyData = await AsyncStorage.getItem('familyData');
      if (storedFamilyData) {
        setFamilyData(JSON.parse(storedFamilyData));
        console.log("💾 Loaded family data from AsyncStorage.");
      }

      // Then, fetch fresh data from the backend using the props
      const userType = currentIsParent ? 'parent' : 'kid'; // Convert boolean to string for backend
      const userId = currentUserName; // Use the userName passed as prop

      console.log('🔍 STEP 4: Calling API with:', { userType, userId });
      console.log('🔍 STEP 5: API URL will be:', `https://family-time-tracker-production.up.railway.app/api/family/braithwaite_family_tracker?userType=${userType}&userId=${userId}`);

      console.log(`🔄 Fetching data for ${userType}: ${userId} from backend...`);
      const data = await apiService.getFamilyData('braithwaite_family_tracker', userType, userId);
      
      console.log('🔍 STEP 6: RAW API RESPONSE:', JSON.stringify(data, null, 2));
      console.log('🔍 STEP 7: Setting family data...');
      
      setFamilyData(data);
      await AsyncStorage.setItem('familyData', JSON.stringify(data)); // Cache fresh data
      console.log("✅ Successfully fetched and cached family data from backend.");
      
      // Log the new data structure
      if (data?.myData) {
        console.log("👤 My Data:", data.myData);
        if (data.myData.settings) {
          console.log("⚙️ My Settings:", data.myData.settings);
        }
      }
      if (data?.kidsData) {
        console.log("👨‍👩‍👧‍👦 Kids Data:", Object.keys(data.kidsData));
      }
      if (data?.globalSettings) {
        console.log("🌍 Global Settings:", data.globalSettings);
      }

      // Mark the Time of last update into Async Store, key lastUpdated (using Luxon)
      const lastUpdated = DateTime.now().toISO();
      await AsyncStorage.setItem('lastUpdated', lastUpdated);
      console.log("⏰ Last updated time saved to AsyncStorage:", lastUpdated);

      console.log('🔍 STEP 8: Family data set successfully');

    } catch (error) {
      console.error('❌ STEP ERROR: Error loading family data:', error);
      setDataError(error);
      // If backend fails, ensure we still use cached data if available
      const storedFamilyData = await AsyncStorage.getItem('familyData');
      if (storedFamilyData) {
        setFamilyData(JSON.parse(storedFamilyData));
        console.warn("⚠️ Backend fetch failed, but using cached data.");
      } else {
        setFamilyData(null); // No cached data either
      }
    } finally {
      setIsLoadingData(false);
      console.log('🔍 STEP 9: Loading complete');
    }
  };

  // Function to refresh data manually (e.g., pull to refresh)
  const refreshFamilyData = () => {
    console.log("🔄 Manual refresh triggered");
    loadFamilyData(userName, isParent);
  };

  // Function to update data (e.g., after an API call that modifies data)
  const updateLocalFamilyData = (newData) => {
    console.log("📝 Updating local family data");
    setFamilyData(newData);
    AsyncStorage.setItem('familyData', JSON.stringify(newData)).catch(e => console.error("❌ Failed to update cached family data:", e));
  };

  // Helper function to get current user's settings
  const getCurrentUserSettings = () => {
    const settings = familyData?.myData?.settings || null;
    console.log("⚙️ Getting current user settings:", settings ? "Found" : "Not found");
    return settings;
  };

  // Helper function to get today's sessions
  const getTodaysSessions = (kidId = null) => {
    // If no kidId provided and we're a parent, return empty array
    if (!kidId && isParent) {
      console.log('📅 Parent user - no sessions to get');
      return [];
    }

    const today = todaysDate.toFormat('yyyy-MM-dd');
    let sessions = [];
    
    if (isParent && kidId) {
      // Parent getting specific kid's sessions
      sessions = familyData?.kidsData?.[kidId]?.sessions?.filter(s => s.date === today) || [];
      console.log(`📅 Getting today's sessions for ${kidId}:`, sessions.length, "sessions");
    } else {
      // Kid getting their own sessions
      sessions = familyData?.myData?.sessions?.filter(s => s.date === today) || [];
      console.log(`📅 Getting today's sessions for current user:`, sessions.length, "sessions");
    }
    
    return sessions;
  };

  // Helper function to calculate used time today
  const calculateUsedTime = (kidId = null) => {
    // If no kidId provided and we're a parent, return 0
    if (!kidId && isParent) {
      console.log('⏱️ Parent user - no used time to calculate');
      return 0;
    }

    const sessions = getTodaysSessions(kidId);
    const usedTime = sessions
      .filter(s => s.countTowardsTotal)
      .reduce((total, session) => total + session.duration, 0);
    
    const targetUser = kidId || userName;
    console.log(`⏱️ Calculated used time for ${targetUser}:`, usedTime, "minutes");
    return usedTime;
  };

  // Helper function to get current limits (weekday/weekend aware)
  const getCurrentLimits = (kidId = null) => {
    // If no kidId provided and we're a parent, return null
    if (!kidId && isParent) {
      console.log('📊 Parent user - no limits to get');
      return null;
    }

    const isWeekend = todaysDate.weekday >= 6; // Saturday = 6, Sunday = 7
    let limits = null;
    
    if (isParent && kidId) {
      // Parent getting specific kid's limits
      const kidSettings = familyData?.kidsData?.[kidId]?.settings;
      limits = kidSettings?.limits?.[isWeekend ? 'weekend' : 'weekday'];
    } else {
      // Kid getting their own limits
      const mySettings = familyData?.myData?.settings;
      limits = mySettings?.limits?.[isWeekend ? 'weekend' : 'weekday'];
    }
    
    const targetUser = kidId || userName;
    const scheduleType = isWeekend ? 'weekend' : 'weekday';
    console.log(`📊 Getting ${scheduleType} limits for ${targetUser}:`, limits ? `${limits.dailyTotal} min` : "Not found");
    return limits;
  };

  // Helper function to calculate remaining time
  const getRemainingTime = (kidId = null) => {
    // If no kidId provided and we're a parent, return 0
    if (!kidId && isParent) {
      console.log('⏳ Parent user - no remaining time to calculate');
      return 0;
    }

    const limits = getCurrentLimits(kidId);
    const usedTime = calculateUsedTime(kidId);
    const remaining = limits ? limits.dailyTotal - usedTime : 0;
    
    const targetUser = kidId || userName;
    console.log(`⏳ Remaining time for ${targetUser}:`, remaining, "minutes");
    return Math.max(0, remaining); // Don't return negative time
  };

  // Helper function to get usage percentage
  const getUsagePercentage = (kidId = null) => {
    // If no kidId provided and we're a parent, return 0
    if (!kidId && isParent) {
      console.log('📈 Parent user - no usage percentage to calculate');
      return 0;
    }

    const limits = getCurrentLimits(kidId);
    const usedTime = calculateUsedTime(kidId);
    const percentage = limits && limits.dailyTotal > 0 ? (usedTime / limits.dailyTotal) * 100 : 0;
    
    const targetUser = kidId || userName;
    console.log(`📈 Usage percentage for ${targetUser}:`, Math.round(percentage), "%");
    return Math.min(100, percentage); // Cap at 100%
  };

  // Helper function to check if user is in bedtime
  const isInBedtime = (kidId = null) => {
    // If no kidId provided and we're a parent, return false
    if (!kidId && isParent) {
      console.log('🌙 Parent user - no bedtime to check');
      return false;
    }

    const now = DateTime.now();
    const isWeekend = now.weekday >= 6;
    let bedtimeRules = null;
    
    if (isParent && kidId) {
      // Parent checking specific kid's bedtime
      const kidSettings = familyData?.kidsData?.[kidId]?.settings;
      bedtimeRules = kidSettings?.bedtimeRestrictions?.[isWeekend ? 'weekend' : 'weekday'];
    } else {
      // Kid checking their own bedtime
      const mySettings = familyData?.myData?.settings;
      bedtimeRules = mySettings?.bedtimeRestrictions?.[isWeekend ? 'weekend' : 'weekday'];
    }
    
    if (!bedtimeRules) return false;
    
    const bedtime = DateTime.fromFormat(bedtimeRules.bedtime, 'HH:mm');
    const wakeTime = DateTime.fromFormat(bedtimeRules.wakeTime, 'HH:mm');
    const currentTime = DateTime.fromFormat(now.toFormat('HH:mm'), 'HH:mm');
    
    // Handle overnight bedtime (bedtime > wakeTime)
    const inBedtime = bedtime > wakeTime 
      ? currentTime >= bedtime || currentTime <= wakeTime
      : currentTime >= bedtime && currentTime <= wakeTime;
    
    const targetUser = kidId || userName;
    console.log(`🌙 Bedtime check for ${targetUser}:`, inBedtime ? "In bedtime" : "Not in bedtime");
    return inBedtime;
  };

  return (
    <DataContext.Provider
      value={{
        familyData,
        isLoadingData,
        dataError,
        refreshFamilyData,
        updateLocalFamilyData,
        todaysDate,
        getCurrentUserSettings,
        getTodaysSessions,
        calculateUsedTime,
        getCurrentLimits,
        getRemainingTime,
        getUsagePercentage,
        isInBedtime,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};