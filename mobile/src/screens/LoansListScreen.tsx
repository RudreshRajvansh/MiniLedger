import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Image,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getLoans, getSummary, repayLoan, Loan, Summary } from '../api/loans.api';
import { getErrorMessage } from '../api/client';
import { SummaryCard } from '../components/SummaryCard';
import { LoanItem } from '../components/LoanItem';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { FilterTabs, FilterOption } from '../components/FilterTabs';
import { confirmAction } from '../utils/confirm';
import { colors, radius, shadow, spacing } from '../theme';
import type { RootStackParamList } from '../../App';

type FilterType = 'all' | 'pending' | 'overdue' | 'repaid';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// "+919876543210" -> "+91 98765 43210"
function formatPhone(phone?: string): string {
  if (!phone) return '';
  const match = /^\+91(\d{5})(\d{5})$/.exec(phone);
  return match ? `+91 ${match[1]} ${match[2]}` : phone;
}

export const LoansListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [repayingId, setRepayingId] = useState<string | null>(null);

  // Full-screen receipt preview modal state
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // Load both loans and financial summary
  const loadData = useCallback(
    async (filter: FilterType = activeFilter) => {
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
    },
    [activeFilter],
  );

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
    if (newFilter === activeFilter) return;
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

  const handleLogout = () => {
    confirmAction('Log out', 'You will need a new OTP to sign back in.', 'Log out', logout);
  };

  // Client-side name search on top of the server-side status filter
  const visibleLoans = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return loans;
    return loans.filter((l) => l.friendName.toLowerCase().includes(q));
  }, [loans, search]);

  const filterOptions: FilterOption<FilterType>[] = [
    { label: 'All', value: 'all', count: summary?.counts.total },
    { label: 'Pending', value: 'pending', count: summary?.counts.pending },
    { label: 'Overdue', value: 'overdue', count: summary?.counts.overdue },
    { label: 'Repaid', value: 'repaid', count: summary?.counts.repaid },
  ];

  const emptyCopy = search.trim()
    ? {
        emoji: '🔍',
        title: 'No matches',
        description: `Nobody called "${search.trim()}" in this list.`,
      }
    : activeFilter === 'all'
      ? {
          emoji: '🤝',
          title: 'No loans yet',
          description: 'Log the first time you spot a friend some cash. We’ll keep track of it.',
        }
      : activeFilter === 'overdue'
        ? {
            emoji: '🎉',
            title: 'Nothing overdue',
            description: 'Everyone is on schedule. Nice.',
          }
        : {
            emoji: '📭',
            title: `No ${activeFilter} loans`,
            description: `Loans marked ${activeFilter} will show up here.`,
          };

  return (
    <View style={styles.container}>
      {/* Top App Header: greeting + logout */}
      <View style={[styles.appHeader, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>₹</Text>
          </View>
          <View>
            <Text style={styles.greeting}>{greeting()} 👋</Text>
            <Text style={styles.phone}>{formatPhone(user?.phone)}</Text>
          </View>
        </View>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]}
          accessibilityLabel="Log out"
        >
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

      {errorMessage && (
        <View style={styles.errorWrap}>
          <ErrorBanner
            message={errorMessage}
            onRetry={() => loadData(activeFilter)}
            onDismiss={() => setErrorMessage(null)}
          />
        </View>
      )}

      <FlatList
        data={loading && !refreshing ? [] : visibleLoans}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <SummaryCard summary={summary} />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your loans</Text>
              {summary && summary.counts.total > 0 && (
                <Text style={styles.sectionMeta}>
                  {visibleLoans.length} of {summary.counts.total}
                </Text>
              )}
            </View>

            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by friend's name"
                placeholderTextColor={colors.textFaint}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                  <Text style={styles.clearSearch}>✕</Text>
                </Pressable>
              )}
            </View>

            <FilterTabs options={filterOptions} value={activeFilter} onChange={handleFilterChange} />
            <View style={{ height: spacing.md }} />
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
          loading && !refreshing ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading your ledger…</Text>
            </View>
          ) : (
            <EmptyState
              emoji={emptyCopy.emoji}
              title={emptyCopy.title}
              description={emptyCopy.description}
              actionTitle={activeFilter === 'all' && !search.trim() ? '+ Add first loan' : undefined}
              onAction={() => navigation.navigate('AddLoan')}
            />
          )
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 110 }]}
        keyboardShouldPersistTaps="handled"
      />

      {/* Floating Action Button to Add Loan */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + 24 },
          pressed && { transform: [{ scale: 0.96 }] },
        ]}
        onPress={() => navigation.navigate('AddLoan')}
        accessibilityRole="button"
        accessibilityLabel="Add new loan"
      >
        <Text style={styles.fabPlus}>+</Text>
        <Text style={styles.fabText}>New loan</Text>
      </Pressable>

      {/* Full-screen receipt preview modal */}
      <Modal
        visible={Boolean(previewReceiptUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewReceiptUrl(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPreviewReceiptUrl(null)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Receipt</Text>
              <Pressable style={styles.modalCloseBtn} onPress={() => setPreviewReceiptUrl(null)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>
            {previewReceiptUrl && (
              <Image
                source={{ uri: previewReceiptUrl }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.bg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  logoMarkText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  greeting: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  phone: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 1,
  },
  logoutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  errorWrap: {
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  sectionMeta: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  searchIcon: {
    fontSize: 18,
    color: colors.textFaint,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    color: colors.text,
    height: '100%',
  },
  clearSearch: {
    fontSize: 13,
    color: colors.textFaint,
    fontWeight: '700',
    paddingLeft: spacing.sm,
  },
  listContent: {
    flexGrow: 1,
  },
  loaderContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    height: 56,
    paddingHorizontal: 22,
    borderRadius: 28,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow(3),
  },
  fabPlus: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '500',
    marginRight: 8,
    marginTop: -2,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    height: '75%',
    backgroundColor: colors.inkSoft,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  modalImage: {
    flex: 1,
    width: '100%',
    borderRadius: radius.md,
  },
});
