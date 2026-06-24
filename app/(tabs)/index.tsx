import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionCard from '@/components/ActionCard';
import { useTrackerStore, getGmDate } from '@/store/trackerStore';

export default function DashboardScreen() {
  const { 
    myPoints, myDebt, opponentPoints, opponentName, rules, 
    logAction, logGm, updateGm, lastGmDate, resetGm, 
    isLoading, opponentIsOnline 
  } = useTrackerStore();

  const now = new Date();
  const todayStr = getGmDate(now);
  const needsGm = lastGmDate !== todayStr;

  if (isLoading) {
    return (
      <View style={styles.gmContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (needsGm) {
    return (
      <View style={styles.gmContainer}>
        <TouchableOpacity style={styles.gmButton} onPress={() => logGm(new Date())}>
          <Text style={styles.gmText}>GM</Text>
        </TouchableOpacity>
        <Text style={styles.gmSubtext}>Good morning. Tap to start your day.</Text>
      </View>
    );
  }

  const diff = opponentPoints - myPoints;
  const isWinning = diff >= 0; 
  const oppName = opponentName || 'Opponent';
  const diffText = diff === 0 
    ? `Tied with ${oppName}` 
    : `${Math.abs(diff)} point${Math.abs(diff) > 1 ? 's' : ''} ${isWinning ? 'better' : 'worse'} than ${oppName}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <TouchableOpacity style={styles.updateGmButton} onPress={() => updateGm(new Date())}>
           <Text style={styles.updateGmText}>Went back to sleep? Update GM to NOW</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.updateGmButton} onPress={() => resetGm()}>
           <Text style={[styles.updateGmText, { color: '#FF453A' }]}>DEBUG: Reset GM Screen</Text>
        </TouchableOpacity>

        {/* Header / Main Score */}
        <View style={styles.scoreSection}>
          <Text style={styles.headerTitle}>Account</Text>
          <Text style={styles.mainScore}>{myPoints}</Text>
          
          <View style={styles.diffBadge}>
            {opponentIsOnline && <View style={styles.onlineDot} />}
            <Text style={styles.diffText}>{diffText}</Text>
          </View>
          
          {myDebt > 0 && (
            <Text style={styles.debtText}>{myDebt}€ Debt</Text>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
          {rules.map((rule) => (
            <ActionCard
              key={rule.id}
              rule={rule}
              onPress={() => logAction(rule)}
            />
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // True black for OLED
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  scoreSection: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 60,
  },
  headerTitle: {
    color: '#EBEBF5',
    fontSize: 17,
    fontWeight: '600',
    opacity: 0.6,
    marginBottom: 20,
  },
  mainScore: {
    color: '#FFFFFF',
    fontSize: 120,
    fontWeight: '800',
    letterSpacing: -4,
    marginBottom: 20,
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
    marginRight: 8,
  },
  diffText: {
    color: '#EBEBF5',
    opacity: 0.8,
    fontSize: 15,
    fontWeight: '500',
  },
  actionsSection: {
    width: '100%',
  },
  sectionTitle: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  debtText: {
    color: '#FF453A',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  gmContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gmButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 24,
  },
  gmText: {
    fontSize: 64,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -2,
  },
  gmSubtext: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },
  updateGmButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  updateGmText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
  },
});
