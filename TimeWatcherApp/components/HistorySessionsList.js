import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import SessionCard from './SessionCard';
import { DateTime } from 'luxon';

const HistorySessionsList = ({ sessions, theme, userType, userName, selectedKid }) => {
  const [filter, setFilter] = useState('all');
  const [showLimit, setShowLimit] = useState(5); // Show 5 sessions initially

  // Get app info function (simplified version)
  const getAppInfo = (appId) => {
    // This is a simplified version - you might want to pass familyData as prop for full app info
    const commonApps = {
      minecraft: { displayName: 'Minecraft', icon: '⛏️' },
      roblox: { displayName: 'Roblox', icon: '🎮' },
      netflix: { displayName: 'Netflix', icon: '📺' },
      disneyPlus: { displayName: 'Disney+', icon: '🏰' },
      pokemonGo: { displayName: 'Pokémon GO', icon: '🔴' },
      peacock: { displayName: 'Peacock', icon: '🦚' },
      games: { displayName: 'Other Games', icon: '🎯' },
      coloring: { displayName: 'Coloring Apps', icon: '🎨' },
      facetime: { displayName: 'FaceTime', icon: '📞' },
    };

    return commonApps[appId] || { displayName: appId || 'Unknown App', icon: '📱' };
  };

  // Filter sessions based on selected filter
  const filteredSessions = useMemo(() => {
    let filtered = [...sessions];

    switch (filter) {
      case 'regular':
        filtered = sessions.filter(session => !session.bonus && !session.punishment);
        break;
      case 'bonus':
        filtered = sessions.filter(session => session.bonus);
        break;
      case 'punishment':
        filtered = sessions.filter(session => session.punishment);
        break;
      case 'all':
      default:
        // Show all sessions
        break;
    }

    // Sort by most recent first
    return filtered.sort((a, b) => {
      const aTime = new Date(a.timeStarted || a.createdAt).getTime();
      const bTime = new Date(b.timeStarted || b.createdAt).getTime();
      return bTime - aTime;
    });
  }, [sessions, filter]);

  // Get sessions to display (limited by showLimit)
  const displaySessions = filteredSessions.slice(0, showLimit);
  const hasMoreSessions = filteredSessions.length > showLimit;

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    return {
      all: sessions.length,
      regular: sessions.filter(s => !s.bonus && !s.punishment).length,
      bonus: sessions.filter(s => s.bonus).length,
      punishment: sessions.filter(s => s.punishment).length,
    };
  }, [sessions]);

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const handleLoadMore = () => {
    setShowLimit(prev => prev + 10);
  };

  const handleShowLess = () => {
    setShowLimit(5);
  };

  // Dummy handlers for SessionCard (since this is read-only history)
  const handleDeletePress = () => {
    // History sessions can't be deleted from this view
  };

  const handleSessionUpdated = () => {
    // History sessions updates would need to refresh parent
  };

  return (
    <View style={styles.container}>
      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {[
          { key: 'all', label: 'All', count: filterCounts.all },
          { key: 'regular', label: 'Regular', count: filterCounts.regular },
          { key: 'bonus', label: 'Bonus', count: filterCounts.bonus },
          { key: 'punishment', label: 'Punishment', count: filterCounts.punishment },
        ].map(filterOption => (
          <TouchableOpacity
            key={filterOption.key}
            style={[
              styles.filterButton,
              {
                backgroundColor: filter === filterOption.key 
                  ? theme.buttonBackground 
                  : 'transparent',
                borderColor: filter === filterOption.key 
                  ? theme.buttonBackground 
                  : (theme.isDark ? '#444' : '#ddd'),
              }
            ]}
            onPress={() => setFilter(filterOption.key)}
          >
            <Text style={[
              styles.filterButtonText,
              {
                color: filter === filterOption.key 
                  ? theme.buttonText 
                  : theme.text
              }
            ]}>
              {filterOption.label} ({filterOption.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sessions List */}
      <View style={styles.sessionsList}>
        {filteredSessions.length === 0 ? (
          <View style={styles.noSessionsContainer}>
            <Text style={[styles.noSessionsText, { color: theme.text, opacity: 0.6 }]}>
              📭 No {filter === 'all' ? '' : filter} sessions found for this period
            </Text>
          </View>
        ) : (
          <>
            {displaySessions.map((session, index) => (
              <SessionCard
                key={session.id || index}
                session={session}
                index={index}
                theme={theme}
                userType={userType}
                userName={userName}
                kidId={userType === 'parent' ? selectedKid : userName}
                getAppInfo={getAppInfo}
                handleDeletePress={handleDeletePress} // Disabled for history
                onSessionUpdated={handleSessionUpdated} // Disabled for history
                hideDeleteAndEdit={true} // Always hide in history
              />
            ))}

            {/* Load More / Show Less Buttons */}
            <View style={styles.loadMoreContainer}>
              {hasMoreSessions && (
                <TouchableOpacity
                  style={[styles.loadMoreButton, { backgroundColor: theme.buttonBackground }]}
                  onPress={handleLoadMore}
                >
                  <Text style={[styles.loadMoreText, { color: theme.buttonText }]}>
                    Load More ({filteredSessions.length - showLimit} remaining)
                  </Text>
                </TouchableOpacity>
              )}

              {showLimit > 5 && (
                <TouchableOpacity
                  style={[styles.showLessButton, { borderColor: theme.text }]}
                  onPress={handleShowLess}
                >
                  <Text style={[styles.showLessText, { color: theme.text }]}>
                    Show Less
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Summary */}
            {filteredSessions.length > 0 && (
              <View style={styles.summaryContainer}>
                <Text style={[styles.summaryText, { color: theme.text, opacity: 0.7 }]}>
                  📊 Showing {Math.min(showLimit, filteredSessions.length)} of {filteredSessions.length} sessions
                </Text>
                
                {filter === 'all' && (
                  <Text style={[styles.summaryBreakdown, { color: theme.text, opacity: 0.6 }]}>
                    {filterCounts.regular} regular • {filterCounts.bonus} bonus • {filterCounts.punishment} punishment
                  </Text>
                )}
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sessionsList: {
    flex: 1,
  },
  noSessionsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noSessionsText: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadMoreContainer: {
    gap: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  showLessButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  showLessText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryContainer: {
    marginTop: 16,
    alignItems: 'center',
    gap: 4,
  },
  summaryText: {
    fontSize: 12,
  },
  summaryBreakdown: {
    fontSize: 11,
  },
});

export default HistorySessionsList;