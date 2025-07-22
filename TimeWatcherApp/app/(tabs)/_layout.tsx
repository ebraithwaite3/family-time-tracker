import React, { useEffect, useState } from 'react';
import { Tabs, useLocalSearchParams, useRouter } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native'; // Import Platform for OS-specific styles
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage

import { useTheme } from '../../context/ThemeContext'; // Adjust path if needed
import Header from '../../components/Header'; // Adjust path if needed

// Keep your existing imports for HapticTab, IconSymbol, TabBarBackground, Colors, useColorScheme
import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
// import { Colors } from '@/constants/Colors'; // No longer needed if using custom theme for tab bar colors
// import { useColorScheme } from '@/hooks/useColorScheme'; // Keep if you use it for other purposes, but not for tab bar colors directly now

export default function TabLayout() {
  const { theme } = useTheme(); // Use your custom theme
  const router = useRouter();
  
  // Retrieve params passed from RootLayout (userName)
  const params = useLocalSearchParams();
  const userNameFromParams = params.userName;

  // State to hold the current user name for the Header
  const [currentUserName, setCurrentUserName] = useState(userNameFromParams);

  useEffect(() => {
    const loadUserName = async () => {
      // If userName wasn't passed via params (e.g., direct deep link or app restart),
      // try to load it directly from AsyncStorage.
      if (!userNameFromParams) { 
        const storedName = await AsyncStorage.getItem('userName');
        if (storedName) {
          setCurrentUserName(storedName);
        }
      }
    };
    loadUserName();
  }, [userNameFromParams]);

  // Function to handle logout, passed to Header
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userName');
      await AsyncStorage.removeItem('isParent');
      await AsyncStorage.removeItem('familyData'); // Clear family data on logout
      // Navigate back to the root, which will re-evaluate login status in RootLayout
      router.replace('/'); 
    } catch (error) {
      console.error('Error during logout from tabs layout:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Render the Header component */}
      <Header userName={currentUserName} onNameCleared={handleLogout} />

      {/* The Tabs component will render your tab screens below the header */}
      <Tabs
        screenOptions={{
          // Use your custom theme colors for tab bar
          tabBarActiveTintColor: theme.buttonBackground, 
          tabBarInactiveTintColor: theme.text, 
          headerShown: false, // Hide default header for tab screens
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
              position: 'absolute',
              backgroundColor: 'transparent', // Ensure it's transparent for blur effect
            },
            default: {
              backgroundColor: theme.headerBackground, // Use theme for default background
            },
          }),
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
          }}
        />
        {/* Add more Tabs.Screen components for your other tabs */}
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // Ensure it takes full height
  },
});