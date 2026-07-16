import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionCard from '@/components/ActionCard';
import { useTrackerStore, getGmDate } from '@/store/trackerStore';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';

export default function DashboardScreen() {
  const { 
    myPoints, myDebt, opponentPoints, opponentName, rules, 
    logAction, logGm, updateGm, lastGmDate, resetGm, 
    isLoading, opponentIsOnline 
  } = useTrackerStore();

  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [inputValue, setInputValue] = useState('');

  const scale = useSharedValue(1);
  const prevPoints = useSharedValue(myPoints);

  useEffect(() => {
    if (prevPoints.value !== myPoints) {
      scale.value = withSequence(
        withSpring(1.3, { damping: 2, stiffness: 80 }),
        withSpring(1)
      );
      prevPoints.value = myPoints;
    }
  }, [myPoints]);

  const animatedScoreStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

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

  const diff = myPoints - opponentPoints; // Updated logic to match Differenzregel
  const isWinning = diff <= 0; 
  const oppName = opponentName || 'Opponent';
  const diffText = diff === 0 
    ? `Tied with ${oppName}` 
    : `${Math.abs(diff)} point${Math.abs(diff) > 1 ? 's' : ''} ${isWinning ? 'better' : 'worse'} than ${oppName}`;

  const handlePressAction = (rule: any) => {
    if (rule.requires_input) {
      setSelectedRule(rule);
      setInputValue('');
    } else {
      logAction(rule);
    }
  };

  const submitInput = () => {
    if (selectedRule) {
      const val = parseInt(inputValue, 10);
      if (!isNaN(val) && val > 0) {
        let multiplier = val;
        if (selectedRule.input_step) {
          // If input step is 10, entering 15 gives 2 (round up)
          multiplier = Math.ceil(val / selectedRule.input_step);
        }
        logAction(selectedRule, multiplier);
      }
      setSelectedRule(null);
    }
  };

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
          <Animated.Text style={[styles.mainScore, animatedScoreStyle]}>{myPoints}</Animated.Text>
          
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
              onPress={() => handlePressAction(rule)}
            />
          ))}
        </View>

      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={!!selectedRule}
        onRequestClose={() => setSelectedRule(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Value for {selectedRule?.name}</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={inputValue}
              onChangeText={setInputValue}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setSelectedRule(null)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={submitInput}>
                <Text style={styles.modalButtonTextPrimary}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#2C2C2E',
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
  },
  modalButtonPrimary: {
    backgroundColor: '#0A84FF',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
