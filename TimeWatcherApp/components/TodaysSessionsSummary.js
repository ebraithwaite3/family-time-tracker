// src/components/TodaysSessionsSummary.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import TodaysSessionsModal from './TodaysSessionsModal';

const TodaysSessionsSummary = ({ userType, userId }) => {
  const { theme } = useTheme();
  const { familyData } = useData();
  const [modalVisible, setModalVisible] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Count today's sessions for the selected kid
  const getTodaysSessionCount = () => {
    const today = getTodayDate();
    let sessionCount = 0;

    if (userType === 'parent' && userId) {
      // Parents viewing a specific kid's sessions
      const kidData = familyData?.kidsData?.[userId];
      if (kidData && kidData.sessions) {
        sessionCount = kidData.sessions.filter(session => session.date === today).length;
      }
    } else if (userType === 'parent') {
      // Parents viewing all kids' sessions (fallback)
      if (familyData?.kidsData) {
        Object.values(familyData.kidsData).forEach(kid => {
          const todaySessions = (kid.sessions || []).filter(session => session.date === today);
          sessionCount += todaySessions.length;
        });
      }
    } else {
      // Kids only see their own sessions
      const myData = familyData?.myData;
      if (myData && myData.sessions) {
        sessionCount = myData.sessions.filter(session => session.date === today).length;
      }
    }

    return sessionCount;
  };

  // Get session count - this will recalculate when userId changes
  const sessionCount = getTodaysSessionCount();

  const handleSessionUpdate = () => {
    // Force re-render after session updates
    // Since we're calculating sessionCount directly, it will update automatically
  };

  // Early return if no userId provided for parents
  if (userType === 'parent' && !userId) {
    return null;
  }

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.menuBackground }]}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]}>
            Today's Sessions
          </Text>
          <Text style={[styles.count, { color: theme.text }]}>
            {sessionCount}
          </Text>
          
          {sessionCount > 0 && (
            <TouchableOpacity
              style={[styles.viewButton, { backgroundColor: theme.buttonBackground }]}
              onPress={() => setModalVisible(true)}
            >
              <Text style={[styles.viewButtonText, { color: theme.buttonText }]}>
                View Sessions
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TodaysSessionsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        userType={userType}
        userId={userId}
        onSessionUpdate={handleSessionUpdate}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16, // Match other cards
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18, // Match cardTitle size
    fontWeight: 'bold', // Match cardTitle weight
    marginBottom: 16, // Match other cards
    textAlign: 'center',
  },
  count: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16, // More space before button
  },
  viewButton: {
    paddingHorizontal: 24, // Wider button
    paddingVertical: 12, // Taller button
    borderRadius: 8,
    minWidth: 140, // Ensure consistent width
  },
  viewButtonText: {
    fontSize: 16, // Larger text
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default TodaysSessionsSummary;