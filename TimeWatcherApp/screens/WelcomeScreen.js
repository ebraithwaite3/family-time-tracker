import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext'; // Adjust path if needed

const PARENT_PASSWORD = 'P@rent'; // Hardcoded parent password for now

const WelcomeScreen = ({ onNameSaved }) => {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [isParent, setIsParent] = useState(false);
  const [parentPassword, setParentPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // No backend connection check needed for this simplified version
  // useEffect(() => { ... }, []);

  const handleSaveName = async () => {
    // Basic name validation
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name.');
      return;
    }

    setLoading(true);

    try {
      if (isParent) {
        // --- PARENT LOGIN FLOW (simplified) ---
        if (!parentPassword.trim()) {
          Alert.alert('Password Required', 'Please enter the parent password.');
          setLoading(false);
          return;
        }

        if (parentPassword.trim() !== PARENT_PASSWORD) {
          Alert.alert('Login Failed', 'Invalid parent password.');
          setLoading(false);
          return;
        }

        // Successful parent login: Save to AsyncStorage
        await AsyncStorage.setItem('userName', name.trim());
        await AsyncStorage.setItem('isParent', 'true');
        console.log('AsyncStorage saved: userName =', await AsyncStorage.getItem('userName'));
        console.log('AsyncStorage saved: isParent =', await AsyncStorage.getItem('isParent'));
        
        console.log('--- Parent Login Success ---');
        console.log('Name saved to storage:', name.trim());
        console.log('Parent mode: true');

        Alert.alert('Success', `Welcome, ${name}! You're in Parent Mode.`);
        onNameSaved(name.trim()); // Notify parent component
      } else {
        // --- CHILD LOGIN FLOW (simplified) ---
        const kidName = name.trim();
        
        // Just save the kid's name and parent status for now
        await AsyncStorage.setItem('userName', kidName);
        await AsyncStorage.setItem('isParent', 'false');

        console.log('--- Child Login Success ---');
        console.log('Name saved to storage:', kidName);
        console.log('Parent mode: false');

        Alert.alert('Success', `Welcome, ${kidName}!`);
        onNameSaved(kidName); // Notify parent component
      }
    } catch (error) {
      console.error('Error saving data to AsyncStorage:', error);
      Alert.alert('Error', 'Failed to save your name. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Removed backend status display as it's no longer relevant for this simplified version
  // const getStatusColor = () => { ... };
  // const getStatusText = () => { ... };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Welcome!</Text>
        <Text style={[styles.subtitle, { color: theme.text, opacity: 0.7 }]}>
          Enter your name to get started
        </Text>
        
        {/* Removed Connection Status UI */}
      </View>

      <View style={styles.formContainer}>
        <Text style={[styles.label, { color: theme.text }]}>
          {isParent ? 'Parent Name:' : "What's your name?"}
        </Text>

        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: theme.isDark ? '#333' : '#f5f5f5',
              color: theme.text,
              borderColor: theme.text,
            },
          ]}
          value={name}
          onChangeText={setName}
          placeholder={isParent ? 'Enter your name...' : 'Enter your name...'}
          placeholderTextColor={theme.isDark ? '#999' : '#666'}
          autoCapitalize="words"
          returnKeyType={isParent ? 'next' : 'done'}
          onSubmitEditing={isParent ? () => {} : handleSaveName}
          editable={!loading}
        />

        {/* Parent Mode Checkbox */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => {
            setIsParent(!isParent);
            setParentPassword(''); // Clear password when unchecking
          }}
          disabled={loading}>
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: isParent ? theme.buttonBackground : 'transparent',
                borderColor: theme.text,
              },
            ]}>
            {isParent && (
              <Text style={[styles.checkmark, { color: theme.buttonText }]}>
                ✓
              </Text>
            )}
          </View>
          <Text style={[styles.checkboxLabel, { color: theme.text }]}>
            I'm a parent
          </Text>
        </TouchableOpacity>

        {/* Parent Password Field */}
        {isParent && (
          <View style={styles.passwordContainer}>
            <Text style={[styles.label, { color: theme.text }]}>
              Parent Password:
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.isDark ? '#333' : '#f5f5f5',
                  color: theme.text,
                  borderColor: theme.text,
                },
              ]}
              value={parentPassword}
              onChangeText={setParentPassword}
              placeholder="Enter parent password..."
              placeholderTextColor={theme.isDark ? '#999' : '#666'}
              secureTextEntry={true}
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
              editable={!loading}
            />
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor: theme.buttonBackground,
              opacity: loading ? 0.7 : 1,
            },
          ]}
          onPress={handleSaveName}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={theme.buttonText} />
          ) : (
            <Text style={[styles.saveButtonText, { color: theme.buttonText }]}>
              {isParent ? 'Login as Parent' : 'Get Started'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Removed Backend Status Warning UI */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  statusContainer: { // Keeping styles for now, though not used in this simplified version
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDot: { // Keeping styles for now
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: { // Keeping styles for now
    fontSize: 12,
    fontWeight: '500',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  passwordContainer: {
    width: '100%',
    marginBottom: 20,
  },
  saveButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  warningContainer: { // Keeping styles for now
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  warningText: { // Keeping styles for now
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default WelcomeScreen;