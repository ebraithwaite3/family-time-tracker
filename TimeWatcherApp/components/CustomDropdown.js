import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const CustomDropdown = ({ 
  selectedValue, 
  onValueChange, 
  options = [], 
  placeholder = "Select an option",
  title = null,
  disabled = false,
  style = {},
  testID = null
}) => {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Find selected option label
  const selectedOption = options.find(option => option.value === selectedValue);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  const handleSelect = (value) => {
    onValueChange(value);
    setModalVisible(false);
  };

  const openModal = () => {
    if (!disabled) {
      setModalVisible(true);
    }
  };

  return (
    <>
      {/* Title if provided */}
      {title && (
        <Text style={[styles.title, { color: theme.text }, style.title]}>
          {title}
        </Text>
      )}

      {/* Dropdown Button */}
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          { 
            backgroundColor: theme.menuBackground,
            borderColor: theme.isDark ? '#444' : '#ddd',
            opacity: disabled ? 0.6 : 1
          },
          style.button
        ]}
        onPress={openModal}
        disabled={disabled}
        testID={testID}
      >
        <Text 
          style={[
            styles.dropdownText, 
            { 
              color: selectedOption ? theme.text : theme.isDark ? '#888' : '#666'
            },
            style.text
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        
        {/* Dropdown Arrow */}
        <View style={[
          styles.arrow, 
          { 
            borderTopColor: theme.text,
            transform: [{ rotate: modalVisible ? '180deg' : '0deg' }]
          }
        ]} />
      </TouchableOpacity>

      {/* Modal with Options */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={[
            styles.modalContent,
            { backgroundColor: theme.menuBackground }
          ]}>
            {title && (
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {title}
              </Text>
            )}
            
            <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
              {options.map((option, index) => (
                <TouchableOpacity
                  key={option.value || index}
                  style={[
                    styles.option,
                    { 
                      backgroundColor: selectedValue === option.value 
                        ? theme.isDark ? '#333' : '#f0f0f0'
                        : 'transparent'
                    }
                  ]}
                  onPress={() => handleSelect(option.value)}
                >
                  <Text 
                    style={[
                      styles.optionText, 
                      { 
                        color: theme.text,
                        fontWeight: selectedValue === option.value ? '600' : '400'
                      }
                    ]}
                  >
                    {option.label}
                  </Text>
                  
                  {/* Check mark for selected option */}
                  {selectedValue === option.value && (
                    <Text style={[styles.checkMark, { color: theme.buttonBackground }]}>
                      ✓
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 50,
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
    textAlign: 'center',
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    minWidth: 280,
    maxWidth: '90%',
    maxHeight: '70%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  optionsList: {
    maxHeight: 300,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
  checkMark: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default CustomDropdown;