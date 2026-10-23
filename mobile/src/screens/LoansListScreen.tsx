import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { getLoans, getSummary, repayLoan, Loan, Summary } from '../api/loans.api';
import { getErrorMessage } from '../api/client';
import { SummaryCard } from '../components/SummaryCard';
import { LoanItem } from '../components/LoanItem';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';

type FilterType = 'all' | 'pending' | 'overdue' | 'repaid';

export const LoansListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { logout } = useAuth();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [repayingId, setRepayingId] = useState<string | null>(null);

  // Full-screen receipt preview modal state
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // Load both loans and financial summary
  const loadData = useCallback(async (filter: FilterType = activeFilter) => {
    setErrorMessage(null);
    try {
      const [loansData, summaryData] = await Promise.all([
        getLoans(filter),
        getSummary(),
      ]);
      setLoans(loansData);
      setSummary(summaryData);
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  // Reload data whenever this screen comes into focus (e.g., after adding a loan)
  useFocusEffect(
    useCallback(() => {
      loadData(activeFilter);
    }, [loadData, activeFilter]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(activeFilter);
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setActiveFilter(newFilter);
    setLoading(true);
    loadData(newFilter);
  };

  const handleRepay = async (loanId: string) => {
    setRepayingId(loanId);
    try {
      await repayLoan(loanId);
      // Immediately refresh list and summary
      await loadData(activeFilter);
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setRepayingId(null);
    }
  };

  const filterOptions: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Overdue', value: 'overdue' },
    { label: 'Repaid', value: 'repaid' },
  ];

  return (
    <View style={styles.container}>
      {/* Top App Header with title and Logout */}
      <View style={styles.appHeader}>
        <Text style={styles.headerTitle}>MiniLedger</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ErrorBanner
        message={errorMessage}
        onRetry={() => loadData(activeFilter)}
        onDismiss={() => setErrorMessage(null)}
      />

      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading loans...</Text>
        </View>
      ) : (
        <FlatList
          data={loans}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2563EB']}
            />
          }
          ListHeaderComponent={
            <View>
              {/* Pinned financial summary card */}
              <SummaryCard summary={summary} />

              {/* Status filter chips */}
              <View style={styles.filterBar}>
                {filterOptions.map((opt) => {
                  const isSelected = activeFilter === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.chip,
                        isSelected && styles.activeChip,
                        opt.value === 'overdue' && styles.overdueChip,
                        opt.value === 'overdue' && isSelected && styles.activeOverdueChip,
                      ]}
                      onPress={() => handleFilterChange(opt.value)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.activeChipText,
                          opt.value === 'overdue' && styles.overdueChipText,
                          opt.value === 'overdue' && isSelected && styles.activeChipText,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <LoanItem
              loan={item}
              onRepay={handleRepay}
              onOpenReceipt={(url) => setPreviewReceiptUrl(url)}
              isRepaying={repayingId === item.id}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title={
                activeFilter === 'all'
                  ? 'No loans yet'
                  : `No ${activeFilter} loans`
              }
              description={
                activeFilter === 'all'
                  ? 'Tap the + button below to log your first loan to a friend.'
                  : `You do not have any loans in the "${activeFilter}" category.`
              }
              actionTitle={activeFilter === 'all' ? '+ Add First Loan' : undefined}
              onAction={() => navigation.navigate('AddLoan')}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Floating Action Button (FAB) to Add Loan */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AddLoan')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Full-screen receipt preview modal */}
      <Modal
        visible={Boolean(previewReceiptUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewReceiptUrl(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setPreviewReceiptUrl(null)}
            >
              <Text style={styles.modalCloseText}>✕ Close</Text>
            </TouchableOpacity>

            {previewReceiptUrl && (
              <Image
                source={{ uri: previewReceiptUrl }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  activeChip: {
    backgroundColor: '#2563EB',
  },
  overdueChip: {
    backgroundColor: '#FEE2E2',
  },
  activeOverdueChip: {
    backgroundColor: '#DC2626',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  activeChipText: {
    color: '#FFFFFF',
  },
  overdueChipText: {
    color: '#B91C1C',
  },
  listContent: {
    paddingBottom: 90,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '400',
    marginTop: -2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    height: height * 0.75,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  modalCloseBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    marginBottom: 8,
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  modalImage: {
    width: '100%',
    height: '90%',
  },
});
