import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import { View } from 'react-native'; // Import View for wrapping content

import { ThemeProvider } from '../context/ThemeContext';
import { DataProvider } from '../context/DataContext'; // Import DataProvider
import WelcomeScreen from '../screens/WelcomeScreen'; // Import your WelcomeScreen
import ChildDashboard from '../screens/ChildDashboard'; // Import ChildDashboard
import ParentDashboard from '../screens/ParentDashboard'; // Import ParentDashboard

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false); // State to track login status
  const [isParent, setIsParent] = useState(false); // State to track parent status
  const [userName, setUserName] = useState(null); // State to store userName
  const [initialLoad, setInitialLoad] = useState(true); // To prevent flashing

  useEffect(() => {
    // Check AsyncStorage for saved user data on app start
    const checkLoginStatus = async () => {
      try {
        const storedUserName = await AsyncStorage.getItem('userName');
        const storedIsParent = await AsyncStorage.getItem('isParent');

        if (storedUserName) {
          setUserName(storedUserName);
          setIsLoggedIn(true);
          setIsParent(storedIsParent === 'true'); // Convert string to boolean
        }
      } catch (e) {
        console.error("Failed to read login status from AsyncStorage", e);
      } finally {
        setInitialLoad(false); // Done checking, ready to render
      }
    };

    checkLoginStatus();
  }, []);

  const handleNameSaved = async (loggedInUserName) => {
    // This function is passed to WelcomeScreen and called when login is successful
    const storedIsParent = await AsyncStorage.getItem('isParent'); // Get the latest isParent status
    setUserName(loggedInUserName);
    setIsLoggedIn(true);
    setIsParent(storedIsParent === 'true');
  };

  // This function will be passed to Header for logout
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userName');
      await AsyncStorage.removeItem('isParent');
      setUserName(null);
      setIsLoggedIn(false);
      setIsParent(false); // Reset parent status on logout
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };


  if (!loaded || initialLoad) {
    // Show a blank screen or a loading indicator while fonts load and login status is checked
    return null;
  }

  return (
    <ThemeProvider>
      <DataProvider userName={userName} isParent={isParent}>
        <StatusBar style="auto" />
        {/* Wrap the conditional rendering in a View to ensure no direct text strings */}
        <View style={{ flex: 1 }}>
          {isLoggedIn ? (
            isParent ? (
              <ParentDashboard userName={userName} onLogout={handleLogout} />
            ) : (
              <ChildDashboard userName={userName} onLogout={handleLogout} />
            )
          ) : (
            <WelcomeScreen onNameSaved={handleNameSaved} />
          )}
        </View>
      </DataProvider>
    </ThemeProvider>
  );
}