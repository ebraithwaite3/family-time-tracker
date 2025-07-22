import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header'; // Import Header

const ParentDashboard = ({ userName, onLogout }) => {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Header userName={userName} onNameCleared={onLogout} />
      <View style={styles.contentContainer}>
        <Text style={[styles.text, { color: theme.text }]}>
          Parent Dashboard Here for {userName}!
        </Text>
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
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    text: {
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
    },
  });

export default ParentDashboard;