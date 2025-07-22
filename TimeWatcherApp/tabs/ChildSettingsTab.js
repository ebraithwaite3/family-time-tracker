import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * ChildSettingsTab component (placeholder).
 * This tab would typically contain settings specific to the child's account,
 * such as theme preferences or a logout button.
 */
const ChildSettingsTab = ({ userName, onLogout }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.text, { color: theme.text }]}>
        Hello {userName}, this is your Settings Tab!
      </Text>
      <Text style={[styles.subText, { color: theme.text }]}>
        You can manage your preferences here.
      </Text>
      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: theme.buttonBackground }]}
        onPress={onLogout}
      >
        <Text style={[styles.logoutButtonText, { color: theme.buttonText }]}>
          Logout
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  logoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 20,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChildSettingsTab;