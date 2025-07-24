// src/components/ActiveSessionBanner.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import EndSessionModal from '../modals/EndSessionModal';
import { DateTime } from 'luxon';

const ActiveSessionBanner = ({ userType, selectedKid, userName }) => {
  const { theme } = useTheme();
  const { familyData } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(DateTime.local());

  // Update current time every second ONLY for countdown display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(DateTime.local());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Get active sessions
  const getActiveSessions = () => {
    let activeSessions = [];
    
    if (userType === 'parent' && selectedKid) {
      const kidData = familyData?.kidsData?.[selectedKid];
      if (kidData?.sessions) {
        activeSessions = kidData.sessions.filter(session => 
          session.active && session.timeStarted && !session.timeEnded
        );
      }
    } else if (userType === 'kid') {
      const myData = familyData?.myData;
      if (myData?.sessions) {
        activeSessions = myData.sessions.filter(session => 
          session.active && session.timeStarted && !session.timeEnded
        );
      }
    }
    
    return activeSessions;
  };

  // Get app info for display
  const getAppInfo = (appId) => {
    const availableApps = familyData?.settings?.availableApps || {};
    const app = availableApps[appId];
    
    if (app) {
      return {
        name: app.displayName,
        icon: app.icon,
      };
    }
    
    return {
      name: appId || 'Unknown App',
      icon: '📱',
    };
  };

  // Calculate time remaining until estimated session end
  const calculateSessionTimeRemaining = (session) => {
    if (!session.estimatedDuration) {
      return null; // No estimated end time
    }

    const startTime = DateTime.fromISO(session.timeStarted);
    const estimatedEndTime = startTime.plus({ minutes: session.estimatedDuration });
    const remaining = estimatedEndTime.diff(currentTime);
    
    return Math.max(0, Math.ceil(remaining.as('seconds')));
  };

  // Format time with seconds (e.g., "26m 25s" or "1h 5m 30s")
  const formatTimeWithSeconds = (totalSeconds) => {
    if (totalSeconds <= 0) return "Time up!";
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else {
      return `${minutes}m ${seconds}s`;
    }
  };

  const activeSessions = getActiveSessions();
  const hasActiveSessions = activeSessions.length > 0;

  // Don't render if no active sessions
  if (!hasActiveSessions) {
    return null;
  }

  // Get primary session info
  const primarySession = activeSessions[0];
  const appInfo = getAppInfo(primarySession.app);
  const sessionTimeRemaining = calculateSessionTimeRemaining(primarySession);
  const isRunningLow = sessionTimeRemaining && sessionTimeRemaining <= 300; // Less than 5 minutes
  const isTimeUp = sessionTimeRemaining !== null && sessionTimeRemaining <= 0;

  return (
    <>
      <View style={[
        styles.bannerContainer,
        {
          backgroundColor: theme.isDark ? '#333' : '#F5F5F5',
          borderColor: '#4CAF50', // ✅ Always green border for visibility
        }
      ]}>
        {/* Left Section - App Icon */}
        <View style={styles.iconSection}>
          <Text style={styles.appIcon}>{appInfo.icon}</Text>
        </View>

        {/* Middle Section - App Info */}
        <View style={styles.infoSection}>
          <Text style={[styles.appName, { color: theme.text }]}>
            {appInfo.name}
          </Text>
          <Text style={[styles.deviceName, { color: theme.text, opacity: 0.7 }]}>
            {primarySession.device}
          </Text>
          
          {sessionTimeRemaining !== null && (
            <Text style={[styles.timeRemaining, { 
              color: isTimeUp ? '#F44336' : isRunningLow ? '#FF9800' : '#4CAF50' 
            }]}>
              Time remaining: {formatTimeWithSeconds(sessionTimeRemaining)}
            </Text>
          )}
        </View>

        {/* Right Section - Status and Button */}
        <View style={styles.rightSection}>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusDot,
              { backgroundColor: isTimeUp ? '#F44336' : isRunningLow ? '#FF9800' : '#4CAF50' } // ✅ Dynamic dot color
            ]} />
            <Text style={[
              styles.statusText, 
              { color: isTimeUp ? '#F44336' : isRunningLow ? '#FF9800' : '#4CAF50' } // ✅ Dynamic text color
            ]}>
              ACTIVE
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.endButton, { backgroundColor: '#F44336' }]}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.endButtonText}>End</Text>
          </TouchableOpacity>
        </View>
      </View>

      <EndSessionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        userName={userName}
        selectedKid={selectedKid}
        userType={userType}
      />
    </>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,  // ✅ Match other cards exactly
    marginTop: 8,
    padding: 16,
    borderRadius: 12,  // ✅ Match other cards
    borderWidth: 2,
    elevation: 2,      // ✅ Match other cards
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconSection: {
    marginRight: 16,
  },
  appIcon: {
    fontSize: 28,
  },
  infoSection: {
    flex: 1,
    marginRight: 16,
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  deviceName: {
    fontSize: 14,
    marginBottom: 4,
  },
  timeRemaining: {
    fontSize: 14,
    fontWeight: '500',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  endButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  endButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ActiveSessionBanner;