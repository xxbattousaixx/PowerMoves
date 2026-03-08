import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PowerEvent, generateId } from '@/constants/types';

interface EventContextValue {
  events: PowerEvent[];
  isLoading: boolean;
  createEvent: (event: Omit<PowerEvent, 'id' | 'participants' | 'paidParticipants' | 'paidAt' | 'signedFormParticipants' | 'refundedParticipants' | 'status' | 'createdAt'>) => Promise<PowerEvent>;
  joinEvent: (eventId: string, userId: string) => Promise<void>;
  leaveEvent: (eventId: string, userId: string) => Promise<void>;
  payForEvent: (eventId: string, userId: string) => Promise<void>;
  signForm: (eventId: string, userId: string) => Promise<void>;
  updateEventStatus: (eventId: string, status: PowerEvent['status']) => Promise<void>;
  cancelEvent: (eventId: string) => Promise<{ paidParticipants: string[]; cost: number; title: string }>;
  markRefunded: (eventId: string, userId: string) => Promise<void>;
  getEvent: (id: string) => PowerEvent | undefined;
  getUserEvents: (userId: string) => PowerEvent[];
  getUserCreatedEvents: (userId: string) => PowerEvent[];
  refreshEvents: () => Promise<void>;
}

const EventContext = createContext<EventContextValue | null>(null);
const EVENTS_KEY = 'powermoves_events';

function migrateEvent(e: any): PowerEvent {
  return {
    refundedParticipants: [],
    paidAt: {},
    ...e,
  };
}

export function EventProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<PowerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(EVENTS_KEY);
      if (stored) {
        const raw = JSON.parse(stored);
        setEvents(raw.map(migrateEvent));
      }
    } catch (e) {
      console.error('Failed to load events', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const saveEvents = async (updated: PowerEvent[]) => {
    setEvents(updated);
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
  };

  const createEvent = async (eventData: Omit<PowerEvent, 'id' | 'participants' | 'paidParticipants' | 'paidAt' | 'signedFormParticipants' | 'refundedParticipants' | 'status' | 'createdAt'>): Promise<PowerEvent> => {
    const newEvent: PowerEvent = {
      ...eventData,
      id: generateId(),
      participants: [eventData.creatorId],
      paidParticipants: [],
      paidAt: {},
      signedFormParticipants: [],
      refundedParticipants: [],
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    const updated = [newEvent, ...events];
    await saveEvents(updated);
    return newEvent;
  };

  const joinEvent = async (eventId: string, userId: string) => {
    const updated = events.map(e => {
      if (e.id === eventId && !e.participants.includes(userId) && e.participants.length < e.maxParticipants) {
        return { ...e, participants: [...e.participants, userId] };
      }
      return e;
    });
    await saveEvents(updated);
  };

  const leaveEvent = async (eventId: string, userId: string) => {
    const updated = events.map(e => {
      if (e.id === eventId && e.creatorId !== userId) {
        return {
          ...e,
          participants: e.participants.filter(p => p !== userId),
          paidParticipants: e.paidParticipants.filter(p => p !== userId),
          signedFormParticipants: e.signedFormParticipants.filter(p => p !== userId),
        };
      }
      return e;
    });
    await saveEvents(updated);
  };

  const payForEvent = async (eventId: string, userId: string) => {
    const updated = events.map(e => {
      if (e.id === eventId && !e.paidParticipants.includes(userId)) {
        return {
          ...e,
          paidParticipants: [...e.paidParticipants, userId],
          paidAt: { ...(e.paidAt || {}), [userId]: new Date().toISOString() },
        };
      }
      return e;
    });
    await saveEvents(updated);
  };

  const signForm = async (eventId: string, userId: string) => {
    const updated = events.map(e => {
      if (e.id === eventId && !e.signedFormParticipants.includes(userId)) {
        return { ...e, signedFormParticipants: [...e.signedFormParticipants, userId] };
      }
      return e;
    });
    await saveEvents(updated);
  };

  const updateEventStatus = async (eventId: string, status: PowerEvent['status']) => {
    const updated = events.map(e => e.id === eventId ? { ...e, status } : e);
    await saveEvents(updated);
  };

  const cancelEvent = async (eventId: string): Promise<{ paidParticipants: string[]; cost: number; title: string }> => {
    const event = events.find(e => e.id === eventId);
    if (!event) return { paidParticipants: [], cost: 0, title: '' };

    const paidUsers = event.paidParticipants.filter(p => p !== event.creatorId);
    const updated = events.map(e => e.id === eventId ? { ...e, status: 'cancelled' as const } : e);
    await saveEvents(updated);

    return { paidParticipants: paidUsers, cost: event.cost, title: event.title };
  };

  const markRefunded = async (eventId: string, userId: string) => {
    const updated = events.map(e => {
      if (e.id === eventId && !e.refundedParticipants.includes(userId)) {
        return { ...e, refundedParticipants: [...e.refundedParticipants, userId] };
      }
      return e;
    });
    await saveEvents(updated);
  };

  const getEvent = useCallback((id: string) => events.find(e => e.id === id), [events]);

  const getUserEvents = useCallback((userId: string) =>
    events.filter(e => e.participants.includes(userId)),
  [events]);

  const getUserCreatedEvents = useCallback((userId: string) =>
    events.filter(e => e.creatorId === userId),
  [events]);

  const refreshEvents = loadEvents;

  const value = useMemo(() => ({
    events, isLoading, createEvent, joinEvent, leaveEvent,
    payForEvent, signForm, updateEventStatus, cancelEvent, markRefunded,
    getEvent, getUserEvents, getUserCreatedEvents, refreshEvents,
  }), [events, isLoading, getEvent, getUserEvents, getUserCreatedEvents, loadEvents]);

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEvents() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvents must be used within EventProvider');
  return ctx;
}
