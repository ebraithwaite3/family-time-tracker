import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import WheelPicker from 'react-native-wheel-picker-expo';
import { useTheme } from '../context/ThemeContext'; // Assuming you still use this

const CustomTimePicker = ({ label, value, onTimeChange, placeholder = "Select time" }) => {
    const { theme } = useTheme();
    const [showPicker, setShowPicker] = useState(false);
    const [selectedHour, setSelectedHour] = useState(1); // Default for hour
    const [selectedMinute, setSelectedMinute] = useState(0); // Default for minute
    const [selectedPeriod, setSelectedPeriod] = useState('AM'); // Default for period

    const hoursData = Array.from({ length: 12 }, (_, i) => ({ label: (i + 1).toString(), value: i + 1 }));
    const minutesData = Array.from({ length: 12 }, (_, i) => ({ label: (i * 5).toString().padStart(2, '0'), value: i * 5 }));
    const periodsData = [{ label: 'AM', value: 'AM' }, { label: 'PM', value: 'PM' }];

    // Initialize local state from prop value when picker opens
    React.useEffect(() => {
        if (value) {
            const date = new Date(value);
            const hours = date.getHours();
            const minutes = date.getMinutes();
            setSelectedHour(hours === 0 ? 12 : hours > 12 ? hours - 12 : hours);
            setSelectedMinute(minutes);
            setSelectedPeriod(hours >= 12 ? 'PM' : 'AM');
        } else {
            // Set sensible defaults if no initial value
            const now = new Date();
            const hours = now.getHours();
            let minutes = Math.round(now.getMinutes() / 5) * 5;
            if (minutes === 60) { minutes = 0; } // Handle rollover for minutes
            setSelectedHour(hours === 0 ? 12 : hours > 12 ? hours - 12 : hours);
            setSelectedMinute(minutes);
            setSelectedPeriod(hours >= 12 ? 'PM' : 'AM');
        }
    }, [value, showPicker]); // Re-run when `value` changes or picker becomes visible

    const handleConfirm = () => {
        let hour24 = selectedHour;
        if (selectedPeriod === 'AM' && selectedHour === 12) {
          hour24 = 0;
        } else if (selectedPeriod === 'PM' && selectedHour !== 12) {
          hour24 = selectedHour + 12;
        }

        const today = new Date();
        const selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour24, selectedMinute);

        onTimeChange(selectedDate);
        setShowPicker(false);
    };

    const formatTime = (date) => {
        if (!date) return placeholder;
        return date.toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
    };

    return (
        <View style={styles.timePickerContainer}>
            <Text style={[styles.timePickerLabel, { color: theme.text }]}>{label}</Text>
            <TouchableOpacity
                style={[
                    styles.timePickerButton,
                    {
                        backgroundColor: theme.menuBackground,
                        borderColor: theme.isDark ? '#444' : '#ddd',
                    }
                ]}
                onPress={() => setShowPicker(true)}
            >
                <Text style={[
                    styles.timePickerText,
                    { color: value ? theme.text : (theme.isDark ? '#888' : '#666') },
                    !value && styles.timePickerPlaceholder
                ]}>
                    {formatTime(value)}
                </Text>
                <Text style={styles.timePickerIcon}>🕐</Text>
            </TouchableOpacity>

            <Modal visible={showPicker} transparent animationType="fade">
                <View style={styles.overlay}>
                    <View style={[styles.pickerModal, { backgroundColor: theme.menuBackground }]}>
                        <Text style={[styles.pickerTitle, { color: theme.text }]}>
                            <Text style={{ fontSize: 22 }}>⏰</Text> {label}
                        </Text>

                        <View style={styles.pickersContainer}>
                            <WheelPicker
                                items={hoursData}
                                onChange={({ item }) => setSelectedHour(item.value)}
                                selectedItem={hoursData.find(h => h.value === selectedHour)}
                                containerStyle={{ width: 60 }}
                                itemTextStyle={{ color: theme.text, fontSize: 18 }}
                                selectedItemTextStyle={{ color: theme.buttonText, fontSize: 18, fontWeight: 'bold' }}
                                selectedItemBorderColor={theme.text}
                                selectedItemBackgroundColor={theme.buttonBackground}
                            />
                            <Text style={[styles.separator, { color: theme.text }]}>:</Text>
                            <WheelPicker
                                items={minutesData}
                                onChange={({ item }) => setSelectedMinute(item.value)}
                                selectedItem={minutesData.find(m => m.value === selectedMinute)}
                                containerStyle={{ width: 60 }}
                                itemTextStyle={{ color: theme.text, fontSize: 18 }}
                                selectedItemTextStyle={{ color: theme.buttonText, fontSize: 18, fontWeight: 'bold' }}
                                selectedItemBorderColor={theme.text}
                                selectedItemBackgroundColor={theme.buttonBackground}
                            />
                            <WheelPicker
                                items={periodsData}
                                onChange={({ item }) => setSelectedPeriod(item.value)}
                                selectedItem={periodsData.find(p => p.value === selectedPeriod)}
                                containerStyle={{ width: 60 }}
                                itemTextStyle={{ color: theme.text, fontSize: 18 }}
                                selectedItemTextStyle={{ color: theme.buttonText, fontSize: 18, fontWeight: 'bold' }}
                                selectedItemBorderColor={theme.text}
                                selectedItemBackgroundColor={theme.buttonBackground}
                            />
                        </View>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.cancelButton, { borderColor: theme.text }]}
                                onPress={() => setShowPicker(false)}
                            >
                                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmButton, { backgroundColor: theme.buttonBackground }]}
                                onPress={handleConfirm}
                            >
                                <Text style={[styles.confirmButtonText, { color: theme.buttonText }]}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    // ... (keep your existing styles, some might need slight adjustments for WheelPicker)
    timePickerContainer: { marginBottom: 16 },
    timePickerLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
    timePickerButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    timePickerText: { fontSize: 16 },
    timePickerPlaceholder: { fontStyle: 'italic' },
    timePickerIcon: { fontSize: 18 },

    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    pickerModal: {
      borderRadius: 12,
      padding: 20,
      width: '85%',
      maxWidth: 350,
    },
    pickerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 20,
    },
    pickersContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    separator: {
      fontSize: 24,
      fontWeight: 'bold',
      marginHorizontal: 10,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
    },
    confirmButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
});

export default CustomTimePicker;