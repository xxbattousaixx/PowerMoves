import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput,
  useColorScheme, Alert, Platform, Modal, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventContext';
import ActivityPicker from '@/components/ActivityPicker';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile, linkPaypal, withdrawFunds, refreshWallet, getPendingRefundsForCreator, approveRefund, denyRefund } = useAuth();
  const { events, markRefunded } = useEvents();

  const [editing, setEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editFavorites, setEditFavorites] = useState<string[]>([]);

  const [showPaypalModal, setShowPaypalModal] = useState(false);
  const [paypalInput, setPaypalInput] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  useEffect(() => {
    if (user?.id) {
      refreshWallet();
    }
  }, [user?.id]);

  const userEvents = user ? events.filter(e => e.participants.includes(user.id)) : [];
  const createdEvents = user ? events.filter(e => e.creatorId === user.id) : [];
  const initials = user ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '';
  const pendingRefunds = getPendingRefundsForCreator();

  const startEdit = () => {
    if (!user) return;
    setEditDisplayName(user.displayName);
    setEditBio(user.bio);
    setEditFavorites([...user.favoriteActivities]);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!user) return;
    await updateProfile({
      displayName: editDisplayName.trim() || user.displayName,
      bio: editBio.trim(),
      favoriteActivities: editFavorites,
    });
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditing(false);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleLinkPaypal = async () => {
    if (!paypalInput.trim() || !paypalInput.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid PayPal email address');
      return;
    }
    await linkPaypal(paypalInput.trim());
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowPaypalModal(false);
    setPaypalInput('');
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    setWithdrawing(true);
    const result = await withdrawFunds(amount);
    setWithdrawing(false);
    if (result.success) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      Alert.alert('Withdrawal Initiated', `$${amount.toFixed(2)} will be sent to your PayPal account.`);
    } else {
      Alert.alert('Withdrawal Failed', result.error || 'Something went wrong');
    }
  };

  const handleApproveRefund = (refundId: string, requesterId: string, requesterName: string, amount: number) => {
    Alert.alert(
      'Approve Refund',
      `Refund $${amount.toFixed(2)} to ${requesterName}? This will be deducted from your wallet balance.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve', onPress: async () => {
            const result = await approveRefund(refundId, requesterId);
            if (result) {
              await markRefunded(result.eventId, result.requesterId);
            }
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleDenyRefund = (refundId: string, requesterId: string) => {
    Alert.alert('Deny Refund', 'Are you sure you want to deny this refund request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deny', style: 'destructive', onPress: async () => {
          await denyRefund(refundId, requesterId);
        },
      },
    ]);
  };

  const stats = user ? [
    { label: 'Joined', value: userEvents.length, icon: 'calendar-check-outline' },
    { label: 'Created', value: createdEvents.length, icon: 'plus-circle-outline' },
    { label: 'Member Since', value: new Date(user.createdAt).toLocaleDateString([], { month: 'short', year: 'numeric' }), icon: 'clock-outline' },
  ] : [];

  const recentTransactions = user ? (user.walletTransactions || []).slice(0, showTransactions ? 20 : 3) : [];

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.emptyState, { paddingTop: insets.top + webTopInset + 60 }]}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.surface }]}>
            <MaterialCommunityIcons name="account-outline" size={48} color={theme.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Join PowerMoves</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Create your profile and start scheduling activities
          </Text>
          <View style={styles.authButtons}>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.primaryBtnText}>Sign In</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryBtn, { borderColor: theme.surfaceBorder }]}
              onPress={() => router.push('/(auth)/register')}
            >
              <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Create Account</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + webTopInset + 16, paddingBottom: Platform.OS === 'web' ? 34 + 100 : Math.max(insets.bottom, 20) + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.pageTitle, { color: theme.text }]}>Profile</Text>
        <View style={styles.headerActions}>
          {!editing && (
            <Pressable onPress={startEdit}>
              <Ionicons name="create-outline" size={22} color={theme.primary} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={[styles.profileCard, { backgroundColor: theme.card }]}>
        <View style={[styles.avatar, { backgroundColor: theme.primary + '22' }]}>
          <Text style={[styles.avatarText, { color: theme.primary }]}>{initials}</Text>
        </View>

        {editing ? (
          <View style={styles.editSection}>
            <TextInput
              style={[styles.editInput, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.surfaceBorder }]}
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              placeholder="Display Name"
              placeholderTextColor={theme.textTertiary}
            />
            <TextInput
              style={[styles.editInput, styles.bioInput, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.surfaceBorder }]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Write a short bio..."
              placeholderTextColor={theme.textTertiary}
              multiline
              textAlignVertical="top"
            />
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <Text style={[styles.displayName, { color: theme.text }]}>{user.displayName}</Text>
            <Text style={[styles.username, { color: theme.textSecondary }]}>@{user.username}</Text>
            {!!user.bio && <Text style={[styles.bio, { color: theme.textSecondary }]}>{user.bio}</Text>}
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        {stats.map(stat => (
          <View key={stat.label} style={[styles.statItem, { backgroundColor: theme.card }]}>
            <MaterialCommunityIcons name={stat.icon as any} size={20} color={theme.primary} />
            <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.walletSection, { backgroundColor: theme.card }]}>
        <View style={styles.walletHeader}>
          <View style={styles.walletTitleRow}>
            <MaterialCommunityIcons name="wallet-outline" size={22} color={theme.primary} />
            <Text style={[styles.walletTitle, { color: theme.text }]}>Wallet</Text>
          </View>
          {user.paypalEmail ? (
            <View style={styles.paypalLinked}>
              <MaterialCommunityIcons name="check-circle" size={14} color={theme.accent} />
              <Text style={[styles.paypalLinkedText, { color: theme.accent }]}>PayPal Linked</Text>
            </View>
          ) : (
            <Pressable
              style={[styles.linkPaypalBtn, { backgroundColor: '#FFC439' }]}
              onPress={() => {
                setPaypalInput('');
                setShowPaypalModal(true);
              }}
            >
              <MaterialCommunityIcons name="link-variant" size={14} color="#003087" />
              <Text style={styles.linkPaypalText}>Link PayPal</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.balanceCenter}>
          <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Available Balance</Text>
          <Text style={[styles.balanceAmount, { color: theme.accent }]}>
            ${(user.walletBalance || 0).toFixed(2)}
          </Text>
        </View>

        <View style={styles.walletActions}>
          {user.paypalEmail ? (
            <>
              <Pressable
                style={[styles.walletBtn, { backgroundColor: theme.accent + '18' }]}
                onPress={() => setShowWithdrawModal(true)}
              >
                <MaterialCommunityIcons name="bank-transfer-out" size={18} color={theme.accent} />
                <Text style={[styles.walletBtnText, { color: theme.accent }]}>Withdraw</Text>
              </Pressable>
              <Pressable
                style={[styles.walletBtn, { backgroundColor: theme.surfaceLight }]}
                onPress={() => {
                  setPaypalInput(user.paypalEmail);
                  setShowPaypalModal(true);
                }}
              >
                <MaterialCommunityIcons name="pencil-outline" size={16} color={theme.textSecondary} />
                <Text style={[styles.walletBtnText, { color: theme.textSecondary }]}>Edit PayPal</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={[styles.walletBtn, { backgroundColor: '#FFC439', flex: 1 }]}
              onPress={() => setShowPaypalModal(true)}
            >
              <MaterialCommunityIcons name="link-variant" size={18} color="#003087" />
              <Text style={[styles.walletBtnText, { color: '#003087' }]}>Link PayPal to Withdraw</Text>
            </Pressable>
          )}
        </View>

        {recentTransactions.length > 0 && (
          <View style={styles.transactionsSection}>
            <Text style={[styles.transactionsTitle, { color: theme.textSecondary }]}>Recent Activity</Text>
            {recentTransactions.map(tx => (
              <View key={tx.id} style={[styles.transactionRow, { borderTopColor: theme.surfaceBorder }]}>
                <MaterialCommunityIcons
                  name={tx.type === 'earning' ? 'arrow-down-circle-outline' : tx.type === 'refund' ? 'cash-refund' : 'arrow-up-circle-outline'}
                  size={20}
                  color={tx.type === 'earning' ? theme.accent : tx.type === 'refund' ? theme.warning : theme.primary}
                />
                <View style={styles.transactionInfo}>
                  <Text style={[styles.transactionTitle, { color: theme.text }]} numberOfLines={1}>
                    {tx.eventTitle}
                  </Text>
                  <Text style={[styles.transactionMeta, { color: theme.textTertiary }]}>
                    {new Date(tx.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  { color: tx.type === 'earning' ? theme.accent : tx.type === 'refund' ? theme.warning : theme.primary },
                ]}>
                  {tx.type === 'earning' || (tx.type === 'refund' && tx.status === 'completed') ? '+' : '-'}${tx.amount.toFixed(2)}
                </Text>
              </View>
            ))}
            {(user.walletTransactions || []).length > 3 && (
              <Pressable onPress={() => setShowTransactions(!showTransactions)}>
                <Text style={[styles.showMoreText, { color: theme.primary }]}>
                  {showTransactions ? 'Show Less' : `Show All (${user.walletTransactions.length})`}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {pendingRefunds.length > 0 && (
        <View style={[styles.refundRequestsSection, { backgroundColor: theme.card }]}>
          <View style={styles.walletTitleRow}>
            <MaterialCommunityIcons name="cash-refund" size={20} color={theme.warning} />
            <Text style={[styles.walletTitle, { color: theme.text }]}>Refund Requests</Text>
            <View style={[styles.refundBadge, { backgroundColor: theme.warning }]}>
              <Text style={styles.refundBadgeText}>{pendingRefunds.length}</Text>
            </View>
          </View>
          {pendingRefunds.map(req => (
            <View key={req.id} style={[styles.refundCard, { backgroundColor: theme.inputBg }]}>
              <View style={styles.refundCardHeader}>
                <Text style={[styles.refundRequester, { color: theme.text }]}>{req.requesterName}</Text>
                <Text style={[styles.refundAmount, { color: theme.warning }]}>${req.amount.toFixed(2)}</Text>
              </View>
              <Text style={[styles.refundEvent, { color: theme.textSecondary }]}>{req.eventTitle}</Text>
              <Text style={[styles.refundReason, { color: theme.textTertiary }]}>{req.reason}</Text>
              <View style={styles.refundActions}>
                <Pressable
                  style={[styles.refundActionBtn, { backgroundColor: theme.accent }]}
                  onPress={() => handleApproveRefund(req.id, req.requesterId, req.requesterName, req.amount)}
                >
                  <MaterialCommunityIcons name="check" size={16} color="#fff" />
                  <Text style={styles.refundActionText}>Approve</Text>
                </Pressable>
                <Pressable
                  style={[styles.refundActionBtn, { backgroundColor: theme.danger + '18', borderColor: theme.danger, borderWidth: 1 }]}
                  onPress={() => handleDenyRefund(req.id, req.requesterId)}
                >
                  <MaterialCommunityIcons name="close" size={16} color={theme.danger} />
                  <Text style={[styles.refundActionText, { color: theme.danger }]}>Deny</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {editing && (
        <View style={styles.favSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Favorite Activities</Text>
          <ActivityPicker
            selected={null}
            onSelect={() => {}}
            multiSelect
            selectedKeys={editFavorites}
            onMultiSelect={setEditFavorites}
          />
        </View>
      )}

      {editing ? (
        <View style={styles.editActions}>
          <Pressable
            style={[styles.cancelBtn, { borderColor: theme.surfaceBorder }]}
            onPress={() => setEditing(false)}
          >
            <Text style={[styles.cancelBtnText, { color: theme.text }]}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.saveBtn, { backgroundColor: theme.primary }]}
            onPress={saveEdit}
          >
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {user.favoriteActivities.length > 0 && (
            <View style={styles.favSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Favorite Activities</Text>
              <ActivityPicker
                selected={null}
                onSelect={() => {}}
                multiSelect
                selectedKeys={user.favoriteActivities}
                onMultiSelect={() => {}}
                horizontal
              />
            </View>
          )}

          <View style={styles.menuSection}>
            <Pressable
              style={[styles.menuItem, { backgroundColor: theme.card }]}
              onPress={handleLogout}
            >
              <MaterialCommunityIcons name="logout" size={20} color={theme.danger} />
              <Text style={[styles.menuItemText, { color: theme.danger }]}>Sign Out</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </Pressable>
          </View>
        </>
      )}

      <Modal visible={showPaypalModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Link PayPal Account</Text>
              <Pressable onPress={() => setShowPaypalModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
                Enter your PayPal email to receive payments from events you organize. Event payments go directly to your wallet balance.
              </Text>
              <View style={[styles.paypalInputRow, { backgroundColor: theme.inputBg, borderColor: theme.surfaceBorder }]}>
                <MaterialCommunityIcons name="email-outline" size={20} color={theme.textTertiary} />
                <TextInput
                  style={[styles.paypalInputField, { color: theme.text }]}
                  placeholder="your@paypal.email"
                  placeholderTextColor={theme.textTertiary}
                  value={paypalInput}
                  onChangeText={setPaypalInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.paypalSaveBtn,
                  { backgroundColor: '#0070BA', opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={handleLinkPaypal}
              >
                <MaterialCommunityIcons name="check" size={18} color="#fff" />
                <Text style={styles.paypalSaveBtnText}>Save PayPal Account</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showWithdrawModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Withdraw Funds</Text>
              <Pressable onPress={() => setShowWithdrawModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <View style={[styles.withdrawInfo, { backgroundColor: theme.inputBg }]}>
                <Text style={[styles.withdrawLabel, { color: theme.textSecondary }]}>Available Balance</Text>
                <Text style={[styles.withdrawBalance, { color: theme.accent }]}>
                  ${(user.walletBalance || 0).toFixed(2)}
                </Text>
                <Text style={[styles.withdrawPaypal, { color: theme.textTertiary }]}>
                  Sending to: {user.paypalEmail}
                </Text>
              </View>
              <View style={[styles.paypalInputRow, { backgroundColor: theme.inputBg, borderColor: theme.surfaceBorder }]}>
                <MaterialCommunityIcons name="currency-usd" size={20} color={theme.textTertiary} />
                <TextInput
                  style={[styles.paypalInputField, { color: theme.text }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.textTertiary}
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                  keyboardType="numeric"
                />
                <Pressable onPress={() => setWithdrawAmount(String(user.walletBalance || 0))}>
                  <Text style={[styles.maxBtn, { color: theme.primary }]}>MAX</Text>
                </Pressable>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.paypalSaveBtn,
                  { backgroundColor: theme.accent, opacity: pressed || withdrawing ? 0.85 : 1 },
                ]}
                onPress={handleWithdraw}
                disabled={withdrawing}
              >
                {withdrawing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="bank-transfer-out" size={18} color="#fff" />
                    <Text style={styles.paypalSaveBtnText}>Withdraw to PayPal</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, gap: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 16 },
  pageTitle: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  profileCard: { borderRadius: 16, padding: 20, alignItems: 'center', gap: 12 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 26, fontFamily: 'Inter_700Bold' },
  profileInfo: { alignItems: 'center', gap: 4 },
  displayName: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  username: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  bio: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' as const, marginTop: 4 },
  editSection: { width: '100%', gap: 10 },
  editInput: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  bioInput: { minHeight: 80 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statItem: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  walletSection: { borderRadius: 16, padding: 16, gap: 14 },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  walletTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  paypalLinked: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  paypalLinkedText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  linkPaypalBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  linkPaypalText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#003087' },
  balanceCenter: { alignItems: 'center', gap: 2, paddingVertical: 4 },
  balanceLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  balanceAmount: { fontSize: 32, fontFamily: 'Inter_700Bold' },
  walletActions: { flexDirection: 'row', gap: 8 },
  walletBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  walletBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  transactionsSection: { gap: 8 },
  transactionsTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  transactionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1 },
  transactionInfo: { flex: 1, gap: 2 },
  transactionTitle: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  transactionMeta: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  transactionAmount: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  showMoreText: { fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'center' as const, paddingTop: 4 },
  refundRequestsSection: { borderRadius: 16, padding: 16, gap: 12 },
  refundBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  refundBadgeText: { color: '#fff', fontSize: 11, fontFamily: 'Inter_700Bold' },
  refundCard: { borderRadius: 12, padding: 12, gap: 6 },
  refundCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refundRequester: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  refundAmount: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  refundEvent: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  refundReason: { fontSize: 12, fontFamily: 'Inter_400Regular', fontStyle: 'italic' as const },
  refundActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  refundActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8 },
  refundActionText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  favSection: { gap: 10 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  editActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  menuSection: { gap: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12 },
  menuItemText: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  emptySubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' as const },
  authButtons: { gap: 10, width: '100%', marginTop: 8 },
  primaryBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  secondaryBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  secondaryBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  modalBody: { gap: 14 },
  modalDescription: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  paypalInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, height: 52 },
  paypalInputField: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  paypalSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 12 },
  paypalSaveBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  withdrawInfo: { borderRadius: 12, padding: 16, alignItems: 'center', gap: 4 },
  withdrawLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  withdrawBalance: { fontSize: 32, fontFamily: 'Inter_700Bold' },
  withdrawPaypal: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  maxBtn: { fontSize: 13, fontFamily: 'Inter_700Bold' },
});
