import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { DateTime } from 'luxon';

const UsageChart = ({ sessions, dateRange, theme, userType, selectedKid, familyData }) => {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 40; // Account for padding

  // Get daily limit for the user
  const getDailyLimit = () => {
    const isWeekend = DateTime.now().weekday >= 6;
    let dailyLimit = 120; // Default fallback
    
    if (userType === 'parent' && selectedKid) {
      const kidSettings = familyData?.kidsData?.[selectedKid]?.settings;
      dailyLimit = kidSettings?.limits?.[isWeekend ? 'weekend' : 'weekday']?.dailyTotal || 120;
    } else if (userType === 'kid') {
      const mySettings = familyData?.myData?.settings;
      dailyLimit = mySettings?.limits?.[isWeekend ? 'weekend' : 'weekday']?.dailyTotal || 120;
    }
    
    return dailyLimit;
  };

  // Process sessions into daily usage data
  const chartData = useMemo(() => {
    const dailyLimit = getDailyLimit();
    const data = [];
    const labels = [];
    
    // Generate all days in the range
    let currentDate = dateRange.start;
    while (currentDate <= dateRange.end) {
      const dateString = currentDate.toFormat('yyyy-MM-dd');
      
      // For labels, use different formats based on period length
      const daysDiff = dateRange.end.diff(dateRange.start, 'days').days;
      let dayLabel;
      
      if (daysDiff <= 7) {
        // Week view: Show day names (Mon, Tue)
        dayLabel = currentDate.toFormat('EEE');
      } else if (daysDiff <= 31) {
        // Month view: Show date numbers (1, 5, 10, 15, etc.)
        const dayOfMonth = currentDate.day;
        dayLabel = dayOfMonth % 5 === 1 || dayOfMonth === 1 ? dayOfMonth.toString() : '';
      } else {
        // Longer periods: Show fewer labels
        const dayOfMonth = currentDate.day;
        dayLabel = dayOfMonth === 1 || dayOfMonth === 15 ? currentDate.toFormat('M/d') : '';
      }
      
      // Calculate usage for this day
      const daySessions = sessions.filter(session => session.date === dateString);
      
      let totalUsage = 0;
      
      daySessions.forEach(session => {
        if (session.punishment) {
          totalUsage += (session.duration || 0); // Punishments count toward usage
        } else if (session.countTowardsTotal !== false && !session.bonus) {
          totalUsage += (session.duration || 0);
        }
      });
      
      data.push(totalUsage);
      labels.push(dayLabel);
      
      currentDate = currentDate.plus({ days: 1 });
    }
    
    return { data, labels, dailyLimit };
  }, [sessions, dateRange, userType, selectedKid, familyData]);

  const chartConfig = {
    backgroundGradientFrom: theme.isDark ? '#1e1e1e' : '#ffffff',
    backgroundGradientTo: theme.isDark ? '#2e2e2e' : '#f8f8f8',
    color: (opacity = 1) => theme.isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => theme.isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForBackgroundLines: {
      strokeWidth: 1,
      stroke: theme.isDark ? '#444' : '#e0e0e0',
      strokeDasharray: '0',
    },
    propsForLabels: {
      fontSize: 12,
    },
  };

  // Calculate compliance stats
  const complianceStats = useMemo(() => {
    const daysWithData = chartData.data.filter(usage => usage > 0).length;
    const daysUnderLimit = chartData.data.filter(usage => usage <= chartData.dailyLimit).length;
    const complianceRate = daysWithData > 0 ? Math.round((daysUnderLimit / chartData.data.length) * 100) : 100;
    
    return {
      daysUnderLimit,
      totalDays: chartData.data.length,
      complianceRate
    };
  }, [chartData]);

  return (
    <View style={styles.container}>
      {chartData.data.length === 0 || chartData.data.every(d => d === 0) ? (
        <View style={styles.noDataContainer}>
          <Text style={[styles.noDataText, { color: theme.text }]}>
            📊 No usage data for this period
          </Text>
        </View>
      ) : (
        <View style={styles.chartWrapper}>
          <BarChart
            data={{
              labels: chartData.labels,
              datasets: [{
                data: chartData.data,
                colors: chartData.data.map(usage => 
                  usage > chartData.dailyLimit ? () => '#F44336' : // Red - over limit
                  usage > chartData.dailyLimit * 0.8 ? () => '#FF9800' : // Orange - near limit  
                  () => '#4CAF50' // Green - under limit
                )
              }]
            }}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            fromZero={true}
            showBarTops={false}
            withCustomBarColorFromData={true}
          />
          
          {/* Daily Limit Reference Line Info */}
          <View style={styles.limitInfo}>
            <Text style={[styles.limitText, { color: theme.text }]}>
              📏 Daily Limit: {chartData.dailyLimit} minutes
            </Text>
          </View>
          
          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
              <Text style={[styles.legendText, { color: theme.text }]}>Under Limit</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
              <Text style={[styles.legendText, { color: theme.text }]}>Near Limit</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
              <Text style={[styles.legendText, { color: theme.text }]}>Over Limit</Text>
            </View>
          </View>
          
          {/* Summary */}
          <View style={styles.summary}>
            <Text style={[styles.summaryText, { color: theme.text }]}>
              📊 {complianceStats.daysUnderLimit} of {complianceStats.totalDays} days within limit ({complianceStats.complianceRate}%)
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    opacity: 0.6,
  },
  limitInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  limitText: {
    fontSize: 12,
    opacity: 0.8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
  },
  summary: {
    marginTop: 12,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    opacity: 0.8,
  },
});

export default UsageChart;