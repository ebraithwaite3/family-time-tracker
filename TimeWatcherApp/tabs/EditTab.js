import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import CustomDropdown from '../components/CustomDropdown';

const EditTab = ({ userName, selectedKid, onKidChange }) => {
  const { theme } = useTheme();
  const { familyData } = useData();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.contentContainer}>
        <Text style={[styles.title, { color: theme.text }]}>
          Edit Sessions
        </Text>
        
        {/* Kid Selector */}
        {familyData?.kidsData && Object.keys(familyData.kidsData).length > 0 && (
          <CustomDropdown
            title="👨‍👩‍👧‍👦 SELECT CHILD"
            selectedValue={selectedKid}
            onValueChange={onKidChange}
            options={Object.keys(familyData.kidsData).map(kidId => ({
              label: familyData.kidsData[kidId].name,
              value: kidId
            }))}
            placeholder="Select a child"
            style={{
              button: { width: '100%', marginVertical: 15 },
              title: { fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 10 }
            }}
          />
        )}

        <View style={[styles.placeholderCard, { backgroundColor: theme.menuBackground }]}>
          <Text style={[styles.placeholderText, { color: theme.text }]}>
            ✏️ Edit Tab Content
          </Text>
          <Text style={[styles.placeholderDescription, { color: theme.text }]}>
            This will contain:
            {'\n'}• Add new sessions
            {'\n'}• Quick time adjustments
            {'\n'}• Session editing
            {'\n'}• Bonus time awards
            {'\n'}• Manual time additions/subtractions
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  placeholderCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  placeholderDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default EditTab;