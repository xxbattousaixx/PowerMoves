import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  useColorScheme, Alert, Platform, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventContext';
import { getActivity } from '@/constants/activities';
import { getCurrentPhase, getPhaseInfo } from '@/constants/types';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user, addEarningToUser, requestRefund, processAutoRefund, deductFromCreator } = useAuth();
  const { getEvent, joinEvent, leaveEvent, payForEvent, signForm, updateEventStatus, cancelEvent, markRefunded } = useEvents();

  const [showPayModal, setShowPayModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [paying, setPaying] = useState(false);
  const [signing, setSigning] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [requestingRefund, setRequestingRefund] = useState(false);

  const event = getEvent(id || '');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + webTopInset }]}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
        </View>
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={theme.textTertiary} />
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>Event not found</Text>
        </View>
      </View>
    );
  }

  const activity = getActivity(event.activity);
  const activityColor = activity?.color || theme.primary;
  const phase = getCurrentPhase();
  const phaseInfo = getPhaseInfo(phase);

  const isCreator = user?.id === event.creatorId;
  const isParticipant = user ? event.participants.includes(user.id) : false;
  const hasPaid = user ? event.paidParticipants.includes(user.id) : false;
  const hasSigned = user ? event.signedFormParticipants.includes(user.id) : false;
  const hasBeenRefunded = user ? (event.refundedParticipants || []).includes(user.id) : false;
  const isFull = event.participants.length >= event.maxParticipants;
  const spotsLeft = event.maxParticipants - event.participants.length;
  const isFree = event.cost === 0;
  const minReached = event.participants.length >= event.minParticipants;

  const allPaid = event.participants.every(p => event.paidParticipants.includes(p) || (isFree));
  const allSigned = !event.requiresSafetyForm || event.participants.every(p => event.signedFormParticipants.includes(p));
  const readyToStart = minReached && (isFree || allPaid) && allSigned;

  const userPaidAt = user && (event.paidAt || {})[user.id];
  const canRequestRefundNow = hasPaid && !hasBeenRefunded && !isCreator &&
    (event.status === 'open' || event.status === 'confirming') &&
    !!userPaidAt &&
    (Date.now() - new Date(userPaidAt).getTime() <= 48 * 60 * 60 * 1000);

  const handleJoin = async () => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    await joinEvent(event.id, user.id);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleLeave = () => {
    if (!user) return;
    Alert.alert('Leave Event', 'Are you sure you want to leave this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          await leaveEvent(event.id, user.id);
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const handlePay = async () => {
    if (!user) return;
    setPaying(true);
    await new Promise(r => setTimeout(r, 1500));
    await payForEvent(event.id, user.id);
    if (event.cost > 0 && event.creatorId !== user.id) {
      await addEarningToUser(event.creatorId, event.cost, event.id, event.title);
    }
    setPaying(false);
    setShowPayModal(false);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSign = async () => {
    if (!user) return;
    setSigning(true);
    await new Promise(r => setTimeout(r, 800));
    await signForm(event.id, user.id);
    setSigning(false);
    setShowFormModal(false);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleStartEvent = async () => {
    await updateEventStatus(event.id, 'active');
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleCancelEvent = () => {
    Alert.alert(
      'Cancel Event',
      event.cost > 0 && event.paidParticipants.length > 0
        ? 'All participants who paid will be automatically refunded. This cannot be undone.'
        : 'This will cancel the event for all participants. This cannot be undone.',
      [
        { text: 'Keep Event', style: 'cancel' },
        {
          text: 'Cancel Event', style: 'destructive',
          onPress: async () => {
            const { paidParticipants: paidUsers, cost, title } = await cancelEvent(event.id);
            if (cost > 0 && paidUsers.length > 0) {
              for (const userId of paidUsers) {
                await processAutoRefund(userId, cost, event.id, title);
                await markRefunded(event.id, userId);
              }
              const creatorDeduction = cost * paidUsers.length;
              await deductFromCreator(event.creatorId, creatorDeduction, event.id, title);
            }
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const handleRequestRefund = async () => {
    if (!user || !refundReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for your refund request');
      return;
    }
    setRequestingRefund(true);
    const result = await requestRefund(event.id, event.title, event.creatorId, event.cost, refundReason.trim());
    setRequestingRefund(false);
    if (result.success) {
      setShowRefundModal(false);
      setRefundReason('');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Request Sent', 'Your refund request has been sent to the event organizer for approval.');
    } else {
      Alert.alert('Error', result.error || 'Failed to submit refund request');
    }
  };

  const statusColors: Record<string, string> = {
    open: theme.accent,
    confirming: theme.warning,
    active: theme.primary,
    completed: theme.textTertiary,
    cancelled: theme.danger,
  };

  const statusLabels: Record<string, string> = {
    open: 'Open',
    confirming: 'Confirming',
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + webTopInset }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <View style={[styles.statusPill, { backgroundColor: (statusColors[event.status] || theme.textTertiary) + '18' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColors[event.status] }]} />
          <Text style={[styles.statusLabel, { color: statusColors[event.status] }]}>
            {statusLabels[event.status]}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroSection, { backgroundColor: activityColor + '10' }]}>
          {activity && (
            <MaterialCommunityIcons name={activity.icon as any} size={40} color={activityColor} />
          )}
          <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>
          <View style={[styles.activityTag, { backgroundColor: activityColor + '20' }]}>
            <Text style={[styles.activityLabel, { color: activityColor }]}>{activity?.label}</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={[styles.infoCard, { backgroundColor: theme.card }]}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="map-marker" size={20} color={theme.primary} />
              <View style={styles.infoTextGroup}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Location</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{event.location}</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.surfaceBorder }]} />
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar" size={20} color={theme.primary} />
              <View style={styles.infoTextGroup}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Date</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {new Date(event.date).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.surfaceBorder }]} />
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={theme.primary} />
              <View style={styles.infoTextGroup}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Time</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{event.startTime} - {event.endTime}</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.surfaceBorder }]} />
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="currency-usd" size={20} color={theme.primary} />
              <View style={styles.infoTextGroup}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Cost</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {isFree ? 'Free' : `$${event.cost} per person`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {!!event.description && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
            <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>{event.description}</Text>
          </View>
        )}

        {!!event.instructions && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Instructions</Text>
            <View style={[styles.instructionCard, { backgroundColor: theme.card }]}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={18} color={theme.warning} />
              <Text style={[styles.instructionText, { color: theme.textSecondary }]}>{event.instructions}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Participants</Text>
          <View style={[styles.participantCard, { backgroundColor: theme.card }]}>
            <View style={styles.participantHeader}>
              <View style={styles.participantCount}>
                <Text style={[styles.countNumber, { color: theme.text }]}>{event.participants.length}</Text>
                <Text style={[styles.countMax, { color: theme.textTertiary }]}>/ {event.maxParticipants}</Text>
              </View>
              <View style={styles.participantMeta}>
                <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>
                  Min: {event.minParticipants}
                </Text>
                {!minReached && (
                  <Text style={[styles.metaWarning, { color: theme.warning }]}>
                    Need {event.minParticipants - event.participants.length} more
                  </Text>
                )}
              </View>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: theme.surfaceBorder }]}>
              <View style={[
                styles.progressBar,
                {
                  backgroundColor: isFull ? theme.danger : activityColor,
                  width: `${Math.min((event.participants.length / event.maxParticipants) * 100, 100)}%`,
                },
              ]} />
            </View>
            <View style={styles.spotInfo}>
              <Text style={[styles.spotText, { color: isFull ? theme.danger : theme.textSecondary }]}>
                {isFull ? 'Event is full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} remaining`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Event Details</Text>
          <View style={[styles.detailGrid, { backgroundColor: theme.card }]}>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="account-outline" size={18} color={theme.textSecondary} />
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Organizer</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{event.creatorName}</Text>
            </View>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="clock-alert-outline" size={18} color={theme.textSecondary} />
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Join by</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {event.joinDeadline === 'tenAM' ? '10:00 AM' : '12:00 PM'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name={event.requiresSafetyForm ? 'file-check-outline' : 'file-remove-outline'} size={18} color={theme.textSecondary} />
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Waiver</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {event.requiresSafetyForm ? 'Required' : 'None'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name={event.allowEarlyStart ? 'flash' : 'flash-off'} size={18} color={theme.textSecondary} />
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Early Start</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {event.allowEarlyStart ? 'Allowed' : 'No'}
              </Text>
            </View>
          </View>
        </View>

        {isParticipant && !isCreator && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Status</Text>
            <View style={[styles.statusCard, { backgroundColor: theme.card }]}>
              <View style={styles.statusItem}>
                <MaterialCommunityIcons
                  name={hasPaid || isFree ? 'check-circle' : 'circle-outline'}
                  size={22}
                  color={hasPaid || isFree ? theme.accent : theme.textTertiary}
                />
                <Text style={[styles.statusItemText, { color: theme.text }]}>
                  {isFree ? 'Free Event' : hasPaid ? 'Payment Complete' : 'Payment Pending'}
                </Text>
                {!isFree && !hasPaid && (
                  <Pressable
                    style={[styles.smallBtn, { backgroundColor: theme.primary }]}
                    onPress={() => setShowPayModal(true)}
                  >
                    <Text style={styles.smallBtnText}>Pay ${event.cost}</Text>
                  </Pressable>
                )}
              </View>
              {event.requiresSafetyForm && (
                <View style={styles.statusItem}>
                  <MaterialCommunityIcons
                    name={hasSigned ? 'check-circle' : 'circle-outline'}
                    size={22}
                    color={hasSigned ? theme.accent : theme.textTertiary}
                  />
                  <Text style={[styles.statusItemText, { color: theme.text }]}>
                    {hasSigned ? 'Waiver Signed' : 'Waiver Required'}
                  </Text>
                  {!hasSigned && (
                    <Pressable
                      style={[styles.smallBtn, { backgroundColor: theme.warning }]}
                      onPress={() => setShowFormModal(true)}
                    >
                      <Text style={styles.smallBtnText}>Sign</Text>
                    </Pressable>
                  )}
                </View>
              )}
              {canRequestRefundNow && (
                <View style={[styles.refundRow, { borderTopColor: theme.surfaceBorder }]}>
                  <MaterialCommunityIcons name="cash-refund" size={18} color={theme.warning} />
                  <Text style={[styles.refundHint, { color: theme.textSecondary }]}>
                    Refund available within 48h
                  </Text>
                  <Pressable
                    style={[styles.smallBtn, { backgroundColor: theme.warning + '18', borderColor: theme.warning, borderWidth: 1 }]}
                    onPress={() => setShowRefundModal(true)}
                  >
                    <Text style={[styles.smallBtnText, { color: theme.warning }]}>Request Refund</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderTopColor: theme.surfaceBorder, paddingBottom: Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 20) }]}>
        {isCreator ? (
          <View style={styles.creatorActions}>
            {event.status === 'open' && readyToStart && (
              <Pressable
                style={[styles.actionButton, { backgroundColor: theme.accent }]}
                onPress={handleStartEvent}
              >
                <MaterialCommunityIcons name="play" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Start Event</Text>
              </Pressable>
            )}
            {event.status === 'open' && !readyToStart && (
              <View style={[styles.actionButton, { backgroundColor: theme.surfaceBorder }]}>
                <Text style={[styles.actionButtonText, { color: theme.textSecondary }]}>
                  Waiting for participants
                </Text>
              </View>
            )}
            {event.status === 'active' && (
              <Pressable
                style={[styles.actionButton, { backgroundColor: theme.textTertiary }]}
                onPress={() => updateEventStatus(event.id, 'completed')}
              >
                <MaterialCommunityIcons name="check" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Complete Event</Text>
              </Pressable>
            )}
            {(event.status === 'open' || event.status === 'confirming') && (
              <Pressable
                style={[styles.cancelEventBtn, { borderColor: theme.danger }]}
                onPress={handleCancelEvent}
              >
                <MaterialCommunityIcons name="close-circle-outline" size={18} color={theme.danger} />
                <Text style={[styles.cancelEventText, { color: theme.danger }]}>Cancel Event</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.joinActions}>
            {isParticipant ? (
              <Pressable
                style={[styles.actionButton, { backgroundColor: theme.danger + '18', borderColor: theme.danger, borderWidth: 1 }]}
                onPress={handleLeave}
              >
                <Text style={[styles.actionButtonText, { color: theme.danger }]}>Leave Event</Text>
              </Pressable>
            ) : event.status === 'open' && !isFull ? (
              <Pressable
                style={[styles.actionButton, { backgroundColor: theme.primary }]}
                onPress={handleJoin}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>
                  Join Event {!isFree ? `- $${event.cost}` : ''}
                </Text>
              </Pressable>
            ) : (
              <View style={[styles.actionButton, { backgroundColor: theme.surfaceBorder }]}>
                <Text style={[styles.actionButtonText, { color: theme.textSecondary }]}>
                  {isFull ? 'Event Full' : event.status === 'cancelled' ? 'Event Cancelled' : 'Not Available'}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <Modal visible={showPayModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Payment</Text>
              <Pressable onPress={() => setShowPayModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <View style={[styles.paymentSummary, { backgroundColor: theme.inputBg }]}>
                <Text style={[styles.payLabel, { color: theme.textSecondary }]}>Event</Text>
                <Text style={[styles.payValue, { color: theme.text }]}>{event.title}</Text>
                <View style={[styles.payDivider, { backgroundColor: theme.surfaceBorder }]} />
                <Text style={[styles.payLabel, { color: theme.textSecondary }]}>Amount</Text>
                <Text style={[styles.payAmount, { color: theme.primary }]}>${event.cost}</Text>
              </View>
              <View style={[styles.paypalBadge, { backgroundColor: '#FFC439' }]}>
                <MaterialCommunityIcons name="credit-card-outline" size={20} color="#003087" />
                <Text style={styles.paypalText}>PayPal Checkout</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.payButton,
                  { backgroundColor: '#0070BA', opacity: pressed || paying ? 0.85 : 1 },
                ]}
                onPress={handlePay}
                disabled={paying}
              >
                {paying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.payButtonText}>Pay ${event.cost} with PayPal</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showFormModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Safety Waiver</Text>
              <Pressable onPress={() => setShowFormModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.formScrollView}>
              <Text style={[styles.formText, { color: theme.textSecondary }]}>
                {event.safetyFormText || 'By signing this waiver, you acknowledge and accept any risks associated with this activity. You agree to follow all safety guidelines provided by the event organizer.'}
              </Text>
            </ScrollView>
            <Pressable
              style={({ pressed }) => [
                styles.signButton,
                { backgroundColor: theme.accent, opacity: pressed || signing ? 0.85 : 1 },
              ]}
              onPress={handleSign}
              disabled={signing}
            >
              {signing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.signButtonText}>I Agree & Sign</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showRefundModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Request Refund</Text>
              <Pressable onPress={() => setShowRefundModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <View style={[styles.paymentSummary, { backgroundColor: theme.inputBg }]}>
                <Text style={[styles.payLabel, { color: theme.textSecondary }]}>Event</Text>
                <Text style={[styles.payValue, { color: theme.text }]}>{event.title}</Text>
                <View style={[styles.payDivider, { backgroundColor: theme.surfaceBorder }]} />
                <Text style={[styles.payLabel, { color: theme.textSecondary }]}>Refund Amount</Text>
                <Text style={[styles.payAmount, { color: theme.accent }]}>${event.cost}</Text>
              </View>
              <Text style={[styles.refundInfo, { color: theme.textSecondary }]}>
                The event creator will review your request. If approved, the funds will be returned to your wallet.
              </Text>
              <TextInput
                style={[styles.refundInput, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.surfaceBorder }]}
                placeholder="Why are you requesting a refund?"
                placeholderTextColor={theme.textTertiary}
                value={refundReason}
                onChangeText={setRefundReason}
                multiline
                textAlignVertical="top"
              />
              <Pressable
                style={({ pressed }) => [
                  styles.payButton,
                  { backgroundColor: theme.warning, opacity: pressed || requestingRefund ? 0.85 : 1 },
                ]}
                onPress={handleRequestRefund}
                disabled={requestingRefund}
              >
                {requestingRefund ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.payButtonText}>Submit Refund Request</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  scrollContent: { paddingHorizontal: 16, gap: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  errorText: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  heroSection: { borderRadius: 16, padding: 24, alignItems: 'center', gap: 10 },
  eventTitle: { fontSize: 24, fontFamily: 'Inter_700Bold', textAlign: 'center' as const },
  activityTag: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 16 },
  activityLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  infoSection: {},
  infoCard: { borderRadius: 14, padding: 16, gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoTextGroup: { flex: 1 },
  infoLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontFamily: 'Inter_500Medium', marginTop: 2 },
  divider: { height: 1 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  descriptionText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  instructionCard: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12, alignItems: 'flex-start' },
  instructionText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  participantCard: { borderRadius: 14, padding: 16, gap: 10 },
  participantHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  participantCount: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  countNumber: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  countMax: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  participantMeta: { alignItems: 'flex-end', gap: 2 },
  metaLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  metaWarning: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' as const },
  progressBar: { height: 6, borderRadius: 3 },
  spotInfo: {},
  spotText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  detailGrid: { borderRadius: 14, padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailItem: { width: '45%' as any, gap: 3, flexGrow: 1 },
  detailLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  detailValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  statusCard: { borderRadius: 14, padding: 14, gap: 14 },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusItemText: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium' },
  smallBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  smallBtnText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  refundRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12, borderTopWidth: 1 },
  refundHint: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular' },
  bottomBar: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  creatorActions: { gap: 8 },
  joinActions: { gap: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14 },
  actionButtonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  cancelEventBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, borderRadius: 12, borderWidth: 1 },
  cancelEventText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  modalBody: { gap: 16 },
  paymentSummary: { borderRadius: 12, padding: 16, gap: 6 },
  payLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  payValue: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  payDivider: { height: 1, marginVertical: 6 },
  payAmount: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  paypalBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 8 },
  paypalText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#003087' },
  payButton: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  payButtonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  formScrollView: { maxHeight: 200, marginBottom: 16 },
  formText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  signButton: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  signButtonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  refundInfo: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  refundInput: { minHeight: 80, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Inter_400Regular' },
});
