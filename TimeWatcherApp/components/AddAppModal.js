import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const AddAppModal = ({ visible, onClose, onAddApp, existingApps = {} }) => {
  const { theme } = useTheme();
  const [appName, setAppName] = useState('');
  const [appIcon, setAppIcon] = useState('📱');
  const [countsTowardTotal, setCountsTowardTotal] = useState(true);

  const handleAddApp = () => {
    if (!appName.trim()) {
      Alert.alert('Error', 'Please enter an app name');
      return;
    }

    const appId = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (existingApps[appId]) {
      Alert.alert('Error', 'An app with this name already exists');
      return;
    }

    const newApp = {
      displayName: appName.trim(),
      countsTowardTotal,
      icon: appIcon,
      available: true,
      custom: true,
      addedAt: new Date().toISOString()
    };

    onAddApp(appId, newApp);
    handleClose();
  };

  const handleClose = () => {
    setAppName('');
    setAppIcon('📱');
    setCountsTowardTotal(true);
    onClose();
  };

  const commonIcons = ['📱', '🎮', '📺', '🎵', '📚', '🏃', '🎨', '🎯', '⚽', '🎪', '🎭', '🎲'];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.isDark ? '#444' : '#ddd' }]}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={[styles.cancelText, { color: theme.buttonBackground }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Add New App</Text>
          <TouchableOpacity onPress={handleAddApp}>
            <Text style={[styles.addText, { color: theme.buttonBackground }]}>
              Add
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* App Name Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: theme.text }]}>App Name</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.menuBackground,
                  color: theme.text,
                  borderColor: theme.isDark ? '#444' : '#ddd',
                }
              ]}
              value={appName}
              onChangeText={setAppName}
              placeholder="e.g. TikTok, Snapchat, YouTube Kids"
              placeholderTextColor={theme.isDark ? '#888' : '#666'}
              autoFocus
            />
          </View>

          {/* Icon Selection */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: theme.text }]}>Choose Icon</Text>
            <View style={styles.iconGrid}>
              {commonIcons.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconButton,
                    {
                      backgroundColor: appIcon === icon ? theme.buttonBackground : theme.menuBackground,
                      borderColor: theme.isDark ? '#444' : '#ddd',
                    }
                  ]}
                  onPress={() => setAppIcon(icon)}
                >
                  <Text style={styles.iconText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Custom Icon Input */}
            <Text style={[styles.orText, { color: theme.text }]}>Or enter custom emoji:</Text>
            <TextInput
              style={[
                styles.customIconInput,
                {
                  backgroundColor: theme.menuBackground,
                  color: theme.text,
                  borderColor: theme.isDark ? '#444' : '#ddd',
                }
              ]}
              value={appIcon}
              onChangeText={setAppIcon}
              placeholder="📱"
              placeholderTextColor={theme.isDark ? '#888' : '#666'}
              maxLength={2}
            />
          </View>

          {/* Time Counting Option */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: theme.text }]}>Time Tracking</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: countsTowardTotal ? theme.buttonBackground : theme.menuBackground,
                    borderColor: theme.isDark ? '#444' : '#ddd',
                  }
                ]}
                onPress={() => setCountsTowardTotal(true)}
              >
                <Text style={[
                  styles.optionText,
                  { color: countsTowardTotal ? theme.buttonText : theme.text }
                ]}>
                  Counts toward daily limit
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: !countsTowardTotal ? theme.buttonBackground : theme.menuBackground,
                    borderColor: theme.isDark ? '#444' : '#ddd',
                  }
                ]}
                onPress={() => setCountsTowardTotal(false)}
              >
                <Text style={[
                  styles.optionText,
                  { color: !countsTowardTotal ? theme.buttonText : theme.text }
                ]}>
                  Free time (educational)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Preview */}
          <View style={[styles.previewSection, { backgroundColor: theme.menuBackground }]}>
            <Text style={[styles.previewLabel, { color: theme.text }]}>Preview:</Text>
            <Text style={[styles.previewText, { color: theme.text }]}>
              {appIcon} {appName || 'App Name'}
            </Text>
            <Text style={[styles.previewSubtext, { color: theme.text }]}>
              {countsTowardTotal ? 'Counts toward daily limit' : 'Free time - does not count toward limit'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '400',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  orText: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.7,
  },
  customIconInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 80,
    textAlign: 'center',
    fontSize: 20,
  },
  optionRow: {
    gap: 8,
  },
  optionButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  previewSection: {
    padding: 16,
    borderRadius: 8,
    marginTop: 'auto',
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewSubtext: {
    fontSize: 12,
    opacity: 0.7,
  },
});

export default AddAppModal;