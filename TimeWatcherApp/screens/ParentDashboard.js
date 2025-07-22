import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import Header from '../components/Header';

// Import tab components
import ParentHomeTab from '../tabs/ParentHomeTab';
import EditTab from '../tabs/EditTab';
import HistoryTab from '../tabs/HistoryTab';
import SettingsTab from '../tabs/SettingsTab';

const ParentDashboard = ({ userName, onLogout }) => {
  const { theme } = useTheme();
  const { familyData } = useData();
  
  const [activeTab, setActiveTab] = useState('home');
  const [selectedKid, setSelectedKid] = useState(null);

  // Set default kid when data loads
  useEffect(() => {
    if (familyData?.kidsData && !selectedKid) {
      const firstKid = Object.keys(familyData.kidsData)[0];
      setSelectedKid(firstKid);
      console.log('👨‍👩‍👧‍👦 Default selected kid:', firstKid);
    }
  }, [familyData, selectedKid]);

  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'edit', label: 'Edit', icon: '✏️' },
    { id: 'history', label: 'History', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const renderTabButton = (tab) => {
    const isActive = activeTab === tab.id;
    return (
      <TouchableOpacity
        key={tab.id}
        style={[
          styles.tabButton,
          {
            backgroundColor: isActive ? theme.buttonBackground : 'transparent',
          }
        ]}
        onPress={() => setActiveTab(tab.id)}
      >
        <Text style={[
          styles.tabIcon,
          { color: isActive ? theme.buttonText : theme.text }
        ]}>
          {tab.icon}
        </Text>
        <Text style={[
          styles.tabLabel,
          { 
            color: isActive ? theme.buttonText : theme.text,
            fontWeight: isActive ? '600' : '400'
          }
        ]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderActiveTab = () => {
    const tabProps = {
      userName,
      selectedKid,
      onKidChange: setSelectedKid,
      onLogout
    };

    switch (activeTab) {
      case 'home':
        return <ParentHomeTab {...tabProps} />;
      case 'edit':
        return <EditTab userName={userName} selectedKid={selectedKid} onKidChange={setSelectedKid} userType="parent" />;
      case 'history':
        return <HistoryTab {...tabProps} />;
      case 'settings':
        return <SettingsTab {...tabProps} />;
      default:
        return <ParentHomeTab {...tabProps} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.headerBackground }]}>
      <Header userName={userName} onNameCleared={onLogout} />
      
      {/* Tab Content */}
      <View style={[styles.content, { backgroundColor: theme.background }]}>
        {renderActiveTab()}
      </View>

      {/* Bottom Tab Bar */}
      <View style={[
        styles.tabBar, 
        { 
          backgroundColor: theme.headerBackground,
          borderTopColor: theme.isDark ? '#444' : '#ddd'
        }
      ]}>
        {tabs.map(renderTabButton)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 20, // Extra padding for safe area
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default ParentDashboard;