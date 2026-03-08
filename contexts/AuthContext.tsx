import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, WalletTransaction, RefundRequest, generateId } from '@/constants/types';

const RESET_CODES_KEY = 'powermoves_reset_codes';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; code?: string; error?: string }>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  linkPaypal: (paypalEmail: string) => Promise<void>;
  addEarningToUser: (userId: string, amount: number, eventId: string, eventTitle: string) => Promise<void>;
  withdrawFunds: (amount: number) => Promise<{ success: boolean; error?: string }>;
  refreshWallet: () => Promise<void>;
  requestRefund: (eventId: string, eventTitle: string, creatorId: string, amount: number, reason: string) => Promise<{ success: boolean; error?: string }>;
  approveRefund: (refundId: string, requesterId: string) => Promise<{ eventId: string; requesterId: string } | null>;
  denyRefund: (refundId: string, requesterId: string) => Promise<void>;
  processAutoRefund: (userId: string, amount: number, eventId: string, eventTitle: string) => Promise<void>;
  deductFromCreator: (creatorId: string, totalAmount: number, eventId: string, eventTitle: string) => Promise<void>;
  getPendingRefundsForCreator: () => RefundRequest[];
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USERS_KEY = 'powermoves_users';
const CURRENT_USER_KEY = 'powermoves_current_user';
const PASSWORDS_KEY = 'powermoves_passwords';

function migrateUser(userData: any): User {
  return {
    paypalEmail: '',
    walletBalance: 0,
    pendingBalance: 0,
    walletTransactions: [],
    refundRequests: [],
    ...userData,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    try {
      const stored = await AsyncStorage.getItem(CURRENT_USER_KEY);
      if (stored) {
        const userData = migrateUser(JSON.parse(stored));
        setUser(userData);
      }
    } catch (e) {
      console.error('Failed to load user', e);
    } finally {
      setIsLoading(false);
    }
  }

  async function getAllUsers(): Promise<Record<string, User>> {
    try {
      const stored = await AsyncStorage.getItem(USERS_KEY);
      if (!stored) return {};
      const raw = JSON.parse(stored);
      const migrated: Record<string, User> = {};
      for (const key of Object.keys(raw)) {
        migrated[key] = migrateUser(raw[key]);
      }
      return migrated;
    } catch {
      return {};
    }
  }

  async function getPasswords(): Promise<Record<string, string>> {
    try {
      const stored = await AsyncStorage.getItem(PASSWORDS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  async function persistUser(updatedUser: User) {
    setUser(updatedUser);
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
    const users = await getAllUsers();
    users[updatedUser.id] = updatedUser;
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  async function persistAnyUser(updatedUser: User, isCurrentUser: boolean) {
    const users = await getAllUsers();
    users[updatedUser.id] = updatedUser;
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    if (isCurrentUser) {
      setUser(updatedUser);
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
    }
  }

  async function getCurrentUserFresh(): Promise<User | null> {
    try {
      const stored = await AsyncStorage.getItem(CURRENT_USER_KEY);
      if (stored) return migrateUser(JSON.parse(stored));
      return null;
    } catch {
      return null;
    }
  }

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const users = await getAllUsers();
    const passwords = await getPasswords();
    const foundUser = Object.values(users).find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!foundUser) return { success: false, error: 'User not found' };
    if (passwords[foundUser.id] !== password) return { success: false, error: 'Incorrect password' };
    setUser(foundUser);
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(foundUser));
    return { success: true };
  };

  const register = async (username: string, email: string, password: string, displayName: string): Promise<{ success: boolean; error?: string }> => {
    const users = await getAllUsers();
    const existing = Object.values(users).find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existing) return { success: false, error: 'Username already taken' };
    const emailExists = Object.values(users).find(u => u.email.toLowerCase() === email.toLowerCase());
    if (emailExists) return { success: false, error: 'Email already registered' };

    const newUser: User = {
      id: generateId(),
      username,
      displayName,
      email,
      bio: '',
      avatarUri: null,
      favoriteActivities: [],
      paypalEmail: '',
      walletBalance: 0,
      pendingBalance: 0,
      walletTransactions: [],
      refundRequests: [],
      createdAt: new Date().toISOString(),
    };

    users[newUser.id] = newUser;
    const passwords = await getPasswords();
    passwords[newUser.id] = password;

    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    await AsyncStorage.setItem(PASSWORDS_KEY, JSON.stringify(passwords));
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    setUser(newUser);
    return { success: true };
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
  };

  const requestPasswordReset = async (email: string): Promise<{ success: boolean; code?: string; error?: string }> => {
    const users = await getAllUsers();
    const foundUser = Object.values(users).find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!foundUser) return { success: false, error: 'No account found with that email address' };

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      const stored = await AsyncStorage.getItem(RESET_CODES_KEY);
      const codes: Record<string, { code: string; email: string; expiresAt: string }> = stored ? JSON.parse(stored) : {};
      codes[email.toLowerCase()] = {
        code,
        email: email.toLowerCase(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };
      await AsyncStorage.setItem(RESET_CODES_KEY, JSON.stringify(codes));
    } catch {}
    return { success: true, code };
  };

  const resetPassword = async (email: string, code: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const stored = await AsyncStorage.getItem(RESET_CODES_KEY);
      const codes: Record<string, { code: string; email: string; expiresAt: string }> = stored ? JSON.parse(stored) : {};
      const entry = codes[email.toLowerCase()];
      if (!entry) return { success: false, error: 'No reset code found. Please request a new one.' };
      if (new Date(entry.expiresAt) < new Date()) return { success: false, error: 'Reset code has expired. Please request a new one.' };
      if (entry.code !== code) return { success: false, error: 'Invalid reset code' };

      const users = await getAllUsers();
      const foundUser = Object.values(users).find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!foundUser) return { success: false, error: 'Account not found' };

      const passwords = await getPasswords();
      passwords[foundUser.id] = newPassword;
      await AsyncStorage.setItem(PASSWORDS_KEY, JSON.stringify(passwords));

      delete codes[email.toLowerCase()];
      await AsyncStorage.setItem(RESET_CODES_KEY, JSON.stringify(codes));

      return { success: true };
    } catch {
      return { success: false, error: 'Something went wrong' };
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    await persistUser(updatedUser);
  };

  const linkPaypal = async (paypalEmail: string) => {
    if (!user) return;
    await persistUser({ ...user, paypalEmail });
  };

  const addEarningToUser = async (userId: string, amount: number, eventId: string, eventTitle: string) => {
    const users = await getAllUsers();
    const targetUser = users[userId];
    if (!targetUser) return;

    const transaction: WalletTransaction = {
      id: generateId(),
      type: 'earning',
      amount,
      eventId,
      eventTitle,
      timestamp: new Date().toISOString(),
      status: 'completed',
    };

    const updatedTarget: User = {
      ...targetUser,
      walletBalance: targetUser.walletBalance + amount,
      walletTransactions: [transaction, ...targetUser.walletTransactions],
    };

    const isCurrentUser = user?.id === userId;
    await persistAnyUser(updatedTarget, isCurrentUser);
  };

  const refreshWallet = useCallback(async () => {
    const freshUser = await getCurrentUserFresh();
    if (!freshUser) return;
    setUser(freshUser);
  }, []);

  const withdrawFunds = async (amount: number): Promise<{ success: boolean; error?: string }> => {
    const freshUser = await getCurrentUserFresh();
    if (!freshUser) return { success: false, error: 'Not logged in' };
    if (!freshUser.paypalEmail) return { success: false, error: 'Link your PayPal account first' };

    if (amount <= 0) {
      return { success: false, error: 'Enter a valid amount' };
    }
    if (amount > freshUser.walletBalance) {
      return { success: false, error: 'Insufficient available balance' };
    }

    const transaction: WalletTransaction = {
      id: generateId(),
      type: 'withdrawal',
      amount,
      eventId: '',
      eventTitle: `Withdrawal to ${freshUser.paypalEmail}`,
      timestamp: new Date().toISOString(),
      status: 'withdrawn',
    };

    await persistUser({
      ...freshUser,
      walletBalance: freshUser.walletBalance - amount,
      walletTransactions: [transaction, ...freshUser.walletTransactions],
    });

    return { success: true };
  };

  const requestRefund = async (eventId: string, eventTitle: string, creatorId: string, amount: number, reason: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not logged in' };

    const existingRequest = (user.refundRequests || []).find(
      r => r.eventId === eventId && r.status === 'pending'
    );
    if (existingRequest) return { success: false, error: 'You already have a pending refund request for this event' };

    const refund: RefundRequest = {
      id: generateId(),
      eventId,
      eventTitle,
      requesterId: user.id,
      requesterName: user.displayName,
      creatorId,
      amount,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
      resolvedAt: '',
    };

    await persistUser({
      ...user,
      refundRequests: [refund, ...(user.refundRequests || [])],
    });

    const users = await getAllUsers();
    const creator = users[creatorId];
    if (creator) {
      const updatedCreator: User = {
        ...creator,
        refundRequests: [refund, ...(creator.refundRequests || [])],
      };
      await persistAnyUser(updatedCreator, false);
    }

    return { success: true };
  };

  const approveRefund = async (refundId: string, requesterId: string): Promise<{ eventId: string; requesterId: string } | null> => {
    if (!user) return null;

    const users = await getAllUsers();
    const refundReq = (user.refundRequests || []).find(r => r.id === refundId);
    if (!refundReq || refundReq.status !== 'pending') return null;

    const resolvedAt = new Date().toISOString();
    const updatedCreator: User = {
      ...user,
      walletBalance: user.walletBalance - refundReq.amount,
      refundRequests: (user.refundRequests || []).map(r =>
        r.id === refundId ? { ...r, status: 'approved' as const, resolvedAt } : r
      ),
      walletTransactions: [{
        id: generateId(),
        type: 'refund' as const,
        amount: refundReq.amount,
        eventId: refundReq.eventId,
        eventTitle: `Refund: ${refundReq.eventTitle}`,
        timestamp: resolvedAt,
        status: 'refunded' as const,
      }, ...user.walletTransactions],
    };
    await persistUser(updatedCreator);

    const requester = users[requesterId];
    if (requester) {
      const updatedRequester: User = {
        ...requester,
        walletBalance: requester.walletBalance + refundReq.amount,
        refundRequests: (requester.refundRequests || []).map(r =>
          r.id === refundId ? { ...r, status: 'approved' as const, resolvedAt } : r
        ),
        walletTransactions: [{
          id: generateId(),
          type: 'refund' as const,
          amount: refundReq.amount,
          eventId: refundReq.eventId,
          eventTitle: `Refund: ${refundReq.eventTitle}`,
          timestamp: resolvedAt,
          status: 'completed' as const,
        }, ...requester.walletTransactions],
      };
      await persistAnyUser(updatedRequester, false);
    }

    return { eventId: refundReq.eventId, requesterId };
  };

  const denyRefund = async (refundId: string, requesterId: string) => {
    if (!user) return;
    const resolvedAt = new Date().toISOString();

    await persistUser({
      ...user,
      refundRequests: (user.refundRequests || []).map(r =>
        r.id === refundId ? { ...r, status: 'denied' as const, resolvedAt } : r
      ),
    });

    const users = await getAllUsers();
    const requester = users[requesterId];
    if (requester) {
      const updatedRequester: User = {
        ...requester,
        refundRequests: (requester.refundRequests || []).map(r =>
          r.id === refundId ? { ...r, status: 'denied' as const, resolvedAt } : r
        ),
      };
      await persistAnyUser(updatedRequester, false);
    }
  };

  const processAutoRefund = async (userId: string, amount: number, eventId: string, eventTitle: string) => {
    const users = await getAllUsers();
    const targetUser = users[userId];
    if (!targetUser) return;

    const transaction: WalletTransaction = {
      id: generateId(),
      type: 'refund',
      amount,
      eventId,
      eventTitle: `Auto-refund: ${eventTitle}`,
      timestamp: new Date().toISOString(),
      status: 'completed',
    };

    const updatedTarget: User = {
      ...targetUser,
      walletBalance: targetUser.walletBalance + amount,
      walletTransactions: [transaction, ...targetUser.walletTransactions],
    };

    const isCurrentUser = user?.id === userId;
    await persistAnyUser(updatedTarget, isCurrentUser);
  };

  const deductFromCreator = async (creatorId: string, totalAmount: number, eventId: string, eventTitle: string) => {
    const users = await getAllUsers();
    const creator = users[creatorId];
    if (!creator) return;

    const transaction: WalletTransaction = {
      id: generateId(),
      type: 'refund',
      amount: totalAmount,
      eventId,
      eventTitle: `Refunds issued: ${eventTitle}`,
      timestamp: new Date().toISOString(),
      status: 'refunded',
    };

    const updatedCreator: User = {
      ...creator,
      walletBalance: creator.walletBalance - totalAmount,
      walletTransactions: [transaction, ...creator.walletTransactions],
    };

    const isCurrentUser = user?.id === creatorId;
    await persistAnyUser(updatedCreator, isCurrentUser);
  };

  const getPendingRefundsForCreator = (): RefundRequest[] => {
    if (!user) return [];
    return (user.refundRequests || []).filter(r => r.creatorId === user.id && r.status === 'pending');
  };

  const value = useMemo(() => ({
    user, isLoading, login, register, logout, requestPasswordReset, resetPassword, updateProfile,
    linkPaypal, addEarningToUser, withdrawFunds, refreshWallet,
    requestRefund, approveRefund, denyRefund, processAutoRefund, deductFromCreator,
    getPendingRefundsForCreator,
  }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
