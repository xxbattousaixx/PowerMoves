export interface WalletTransaction {
  id: string;
  type: 'earning' | 'withdrawal' | 'refund';
  amount: number;
  eventId: string;
  eventTitle: string;
  timestamp: string;
  status: 'completed' | 'withdrawn' | 'refunded';
}

export interface RefundRequest {
  id: string;
  eventId: string;
  eventTitle: string;
  requesterId: string;
  requesterName: string;
  creatorId: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
  resolvedAt: string;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  bio: string;
  avatarUri: string | null;
  favoriteActivities: string[];
  paypalEmail: string;
  walletBalance: number;
  pendingBalance: number;
  walletTransactions: WalletTransaction[];
  refundRequests: RefundRequest[];
  createdAt: string;
}

export interface PowerEvent {
  id: string;
  title: string;
  description: string;
  activity: string;
  creatorId: string;
  creatorName: string;
  location: string;
  latitude?: number;
  longitude?: number;
  date: string;
  startTime: string;
  endTime: string;
  minParticipants: number;
  maxParticipants: number;
  cost: number;
  requiresSafetyForm: boolean;
  safetyFormText: string;
  instructions: string;
  joinDeadline: 'tenAM' | 'noon';
  allowEarlyStart: boolean;
  participants: string[];
  paidParticipants: string[];
  paidAt: Record<string, string>;
  signedFormParticipants: string[];
  refundedParticipants: string[];
  status: 'open' | 'confirming' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

export type TimePhase = 'creation' | 'confirmation' | 'active';

export function getCurrentPhase(): TimePhase {
  const now = new Date();
  const hour = now.getHours();
  if (hour < 10) return 'creation';
  if (hour < 13) return 'confirmation';
  return 'active';
}

export function getPhaseInfo(phase: TimePhase) {
  switch (phase) {
    case 'creation':
      return {
        label: 'Creation Phase',
        sublabel: '12:00 AM - 10:00 AM',
        description: 'Create & discover events',
        color: '#00E599',
      };
    case 'confirmation':
      return {
        label: 'Confirmation Phase',
        sublabel: '10:00 AM - 1:00 PM',
        description: 'Commit, pay & sign up',
        color: '#FFB300',
      };
    case 'active':
      return {
        label: 'Active Phase',
        sublabel: '1:00 PM onwards',
        description: 'Events in progress',
        color: '#FF4D00',
      };
  }
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function canRequestRefund(paidAt: string): boolean {
  const paid = new Date(paidAt).getTime();
  const now = Date.now();
  return now - paid <= 48 * 60 * 60 * 1000;
}
