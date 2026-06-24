import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTrackerStore } from '@/store/trackerStore';
import { Undo2 } from 'lucide-react-native';

export default function StatsScreen() {
  const { actionEntries, opponentActionEntries, opponentName, myWeeklyDebt, myTotalDebt, myUnpaidWeeklyDebt, rules, undoAction } = useTrackerStore();

  const combinedEntries = [
    ...actionEntries.map(e => ({ ...e, isMine: true })),
    ...opponentActionEntries.map(e => ({ ...e, isMine: false }))
  ].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Debt Overview Section */}
        <View style={styles.debtSection}>
          <Text style={styles.sectionTitle}>DEBT OVERVIEW</Text>
          <View style={styles.debtCardsRow}>
            <View style={styles.debtCard}>
              <Text style={styles.debtCardTitle}>Weekly Debt</Text>
              <Text style={styles.debtCardValue}>{myWeeklyDebt}€</Text>
            </View>
            <View style={styles.debtCard}>
              <Text style={styles.debtCardTitle}>Total Debt</Text>
              <Text style={styles.debtCardValue}>{myTotalDebt}€</Text>
            </View>
            {myUnpaidWeeklyDebt > 0 && (
              <View style={[styles.debtCard, { backgroundColor: '#3A0000', borderWidth: 1, borderColor: '#FF453A' }]}>
                <Text style={[styles.debtCardTitle, { color: '#FF453A' }]}>UNPAID + LATE PAY</Text>
                <Text style={styles.debtCardValue}>{myUnpaidWeeklyDebt}€</Text>
              </View>
            )}
          </View>
        </View>

        {/* History Timeline Section */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>PLAYER HISTORY</Text>
          {combinedEntries.length === 0 ? (
            <Text style={styles.emptyText}>No actions logged today.</Text>
          ) : (
            combinedEntries.map((entry) => {
              const rule = rules.find(r => r.id === entry.rule_id);
              let ruleName = 'Unknown Action';
              if (rule) {
                ruleName = rule.name;
              } else if (entry.rule_id === 'sl_1') {
                ruleName = 'Sleep Tax';
              } else if (entry.rule_id === 'adj_weekly') {
                ruleName = 'Manual Adjustment: Weekly Debt';
              } else if (entry.rule_id === 'adj_total') {
                ruleName = 'Manual Adjustment: Total Debt';
              }
              
              // Format time from timestamp
              const date = new Date(entry.timestamp);
              const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <View key={entry.id} style={styles.historyCard}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTime}>{timeString}</Text>
                    <View style={styles.historyDetails}>
                      <Text style={[styles.historyRuleName, entry.is_cancelled && styles.cancelledText]}>{ruleName}</Text>
                      <Text style={[styles.playerBadge, entry.isMine ? styles.badgeMine : styles.badgeOpponent]}>
                        {entry.isMine ? 'You' : (opponentName || 'Opponent')}
                        {entry.is_cancelled && ' • Cancelled'}
                      </Text>
                      {entry.points_applied !== 0 && (
                        <Text style={[styles.pointsApplied, entry.is_cancelled && styles.cancelledText]}>
                          {entry.points_applied > 0 ? '+' : ''}{entry.points_applied} Points
                        </Text>
                      )}
                      {entry.debt_applied !== 0 && (
                        <Text style={[styles.debtApplied, entry.is_cancelled && styles.cancelledText]}>
                          {entry.debt_applied > 0 ? '+' : ''}{entry.debt_applied}€
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  {entry.isMine && !entry.is_cancelled && (
                    <TouchableOpacity 
                      style={styles.undoButton}
                      onPress={() => undoAction(entry.id)}
                    >
                      <Undo2 color="#8E8E93" size={20} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 16,
    marginLeft: 4,
  },
  debtSection: {
    marginBottom: 40,
  },
  debtCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  debtCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  debtCardTitle: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  debtCardValue: {
    color: '#FF453A',
    fontSize: 28,
    fontWeight: '700',
  },
  historySection: {
    flex: 1,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 20,
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyTime: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
    width: 60,
  },
  historyDetails: {
    flex: 1,
  },
  historyRuleName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  playerBadge: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  badgeMine: {
    color: '#0A84FF',
  },
  badgeOpponent: {
    color: '#FF9F0A',
  },
  pointsApplied: {
    color: '#34C759',
    fontSize: 14,
    fontWeight: '500',
  },
  debtApplied: {
    color: '#FF453A',
    fontSize: 14,
    fontWeight: '500',
  },
  cancelledText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  undoButton: {
    padding: 10,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    marginLeft: 10,
  },
});
