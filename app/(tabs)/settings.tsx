import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTrackerStore } from '@/store/trackerStore';
import { Pencil } from 'lucide-react-native';

export default function SettingsScreen() {
  const { isOnline, userId, myTotalDebt, myWeeklyDebt, myUnpaidWeeklyDebt, opponentName, opponentUserId, opponentTotalDebt, opponentWeeklyDebt, opponentActionEntries, adjustDebt, settleWeeklyDebt } = useTrackerStore();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editType, setEditType] = useState<'WEEKLY' | 'TOTAL'>('TOTAL');
  const [editValue, setEditValue] = useState('');

  const openEditModal = (type: 'WEEKLY' | 'TOTAL', currentValue: number) => {
    setEditType(type);
    setEditValue(currentValue.toString());
    setEditModalVisible(true);
  };

  const handleSaveDebt = () => {
    const val = parseInt(editValue, 10);
    if (!isNaN(val)) {
      adjustDebt(editType, val);
    }
    setEditModalVisible(false);
  };

  const lastAction = opponentActionEntries.length > 0 
    ? [...opponentActionEntries].sort((a, b) => b.timestamp - a.timestamp)[0] 
    : null;
    
  let lastSeenText = 'Unknown';
  if (lastAction) {
    const d = new Date(lastAction.timestamp);
    lastSeenText = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PROFILE & STATUS</Text>
          
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Connection Status</Text>
              <View style={styles.statusContainer}>
                <View style={[styles.statusDot, { backgroundColor: isOnline ? '#34C759' : '#FF453A' }]} />
                <Text style={styles.value}>{isOnline ? 'Online' : 'Offline'}</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.row}>
              <Text style={styles.label}>User ID</Text>
              <Text style={styles.valueId} numberOfLines={1} ellipsizeMode="middle">{userId || 'Not Logged In'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HIDDEN STATS (YOU)</Text>
          
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Total Accumulated Debt</Text>
              <TouchableOpacity style={styles.editableValue} onPress={() => openEditModal('TOTAL', myTotalDebt)}>
                <Text style={styles.debtValue}>{myTotalDebt}€</Text>
                <Pencil size={16} color="#8E8E93" style={styles.editIcon} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.row}>
              <Text style={styles.label}>Weekly Debt</Text>
              <TouchableOpacity style={styles.editableValue} onPress={() => openEditModal('WEEKLY', myWeeklyDebt)}>
                <Text style={styles.debtValue}>{myWeeklyDebt}€</Text>
                <Pencil size={16} color="#8E8E93" style={styles.editIcon} />
              </TouchableOpacity>
            </View>

            {myUnpaidWeeklyDebt > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.unpaidContainer}>
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: '#FF453A' }]}>Unpaid + Late Pay</Text>
                    <Text style={[styles.debtValue, { color: '#FF453A', fontSize: 22 }]}>{myUnpaidWeeklyDebt}€</Text>
                  </View>
                  <TouchableOpacity style={styles.settleButton} onPress={() => settleWeeklyDebt()}>
                    <Text style={styles.settleButtonText}>I Have Paid This In Real Life</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OPPONENT PROFILE</Text>
          
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{opponentName || 'Opponent'}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.row}>
              <Text style={styles.label}>User ID</Text>
              <Text style={styles.valueId} numberOfLines={1} ellipsizeMode="middle">{opponentUserId || 'Unknown'}</Text>
            </View>

            <View style={styles.divider} />
            
            <View style={styles.row}>
              <Text style={styles.label}>Total Debt</Text>
              <Text style={styles.debtValue}>{opponentTotalDebt}€</Text>
            </View>

            <View style={styles.divider} />
            
            <View style={styles.row}>
              <Text style={styles.label}>Weekly Debt</Text>
              <Text style={styles.debtValue}>{opponentWeeklyDebt}€</Text>
            </View>

            <View style={styles.divider} />
            
            <View style={styles.row}>
              <Text style={styles.label}>Last Seen (Action)</Text>
              <Text style={styles.value}>{lastSeenText}</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adjust {editType === 'WEEKLY' ? 'Weekly' : 'Total'} Debt</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={handleSaveDebt}>
                <Text style={styles.modalButtonTextPrimary}>Save</Text>
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
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#2C2C2E',
    marginVertical: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  value: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '400',
  },
  valueId: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '400',
    maxWidth: 150,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  debtValue: {
    color: '#FF453A',
    fontSize: 18,
    fontWeight: '600',
  },
  editableValue: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
  },
  editIcon: {
    marginLeft: 8,
  },
  unpaidContainer: {
    backgroundColor: '#3A0000',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FF453A',
  },
  settleButton: {
    backgroundColor: '#FF453A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  settleButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
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
