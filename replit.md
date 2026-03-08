# PowerMoves - Active Lifestyle Scheduler

## Overview
PowerMoves is a mobile app (Expo React Native) for scheduling and joining active lifestyle events. Users can create and join events across 25+ activity categories (hiking, soccer, chess, swimming, etc.) with a time-based scheduling system.

## Architecture
- **Frontend**: Expo Router (file-based routing) with React Native
- **Backend**: Express server on port 5000 (currently minimal, mainly serves landing page)
- **Storage**: AsyncStorage for local persistence (users, events, passwords)
- **State Management**: React Context (AuthContext, EventContext) + AsyncStorage

## Key Features
- User authentication (register/login with AsyncStorage)
- Event creation with multi-step form (activity, details, schedule, cost/safety)
- Event discovery feed with search and activity filters
- Time phase system (Creation 12am-10am, Confirmation 10am-1pm, Active 1pm+)
- Event detail with join/leave, payment flow (PayPal UI), safety waiver signing
- Personal schedule with upcoming/created/past tabs
- Profile editing with favorite activities
- PayPal wallet: link PayPal email, view balance, withdraw funds
  - Earnings credited directly to event creator wallet when participants pay (no escrow/hold)
  - Withdrawal sends to linked PayPal email (simulated UI)
  - Transaction history with earning/withdrawal/refund records
- Refund system:
  - Participants can request refund within 48h (creator approves/denies from Profile)
  - Auto-refund when creator cancels a paid event (deducts from creator, credits participants)
- Password recovery: forgot password flow (email -> reset code -> new password), codes stored in AsyncStorage with 15min expiry
- Registration confirmation: shows "confirmation email sent" screen after signup before entering app
- Address verification: "Verify Address" button in event creation geocodes location and shows resolved address
- Debounced search (400ms) with location-first, activity type, and time-of-day filters (Morning/Afternoon/Evening)
- Events Near Me: GPS-based filtering with radius options (5/10/25/50 mi), uses expo-location + Haversine distance
  - Events are geocoded on creation (lat/lng stored on PowerEvent)
  - Events without coordinates are excluded when Near Me is active
- Thunderbolt badge on event cards when participants >= minParticipants && < maxParticipants (almost full)
- Motivational banner: "Create or join events today to stay busy tomorrow!"

## File Structure
```
app/
  _layout.tsx          - Root layout with providers (Auth, Event, QueryClient)
  (tabs)/
    _layout.tsx        - 4-tab layout (Discover, Create, Schedule, Profile)
    index.tsx          - Discover screen (event feed)
    create.tsx         - Multi-step event creation
    schedule.tsx       - Personal schedule
    profile.tsx        - User profile
  (auth)/
    _layout.tsx        - Auth modal stack
    login.tsx          - Login screen
    register.tsx       - Registration screen
  event/
    [id].tsx           - Event detail screen
components/
  EventCard.tsx        - Event list card component
  ActivityPicker.tsx   - Activity category selector
  TimePhaseIndicator.tsx - Time phase display
  ErrorBoundary.tsx    - Error boundary
  ErrorFallback.tsx    - Error fallback UI
constants/
  colors.ts            - Theme colors (dark/light)
  activities.ts        - 25 activity types with icons
  types.ts             - TypeScript types + helper functions
contexts/
  AuthContext.tsx       - Authentication state
  EventContext.tsx      - Event CRUD state
```

## Theme
- Primary: #FF4D00 (bold orange)
- Accent: #00E599 (vivid green)
- Dark bg: #0B0B0F
- Uses Inter font family

## Important Patterns
- All React hooks (useState, useEffect, useMemo, etc.) MUST be declared before any conditional early returns in components. This prevents "rendered more hooks than during previous render" errors when state changes cause re-renders (e.g., user going from null to logged-in).
- Tab screens are all mounted simultaneously, so when auth state changes, all tabs re-render. Guard computed values with ternaries (e.g., `user ? user.name : ''`) rather than early returning before hooks.

## Dependencies
- expo-router, @tanstack/react-query, @react-native-async-storage/async-storage
- expo-haptics, expo-blur, expo-glass-effect, expo-location
- @expo/vector-icons (MaterialCommunityIcons, Ionicons)
- react-native-reanimated, react-native-gesture-handler
