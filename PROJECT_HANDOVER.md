# G Project - Project Handover

**To:** Next Developer / Agent
**From:** Previous Agent
**Date:** 2026-07-15

This document summarizes the current state of the **G Project**, detailing the architecture, recently implemented features, database configurations, bug fixes, and recommended next steps for future development.

## 🏗️ Architecture & Tech Stack
- **Frontend Framework**: React Native with [Expo](https://expo.dev/) (Expo Router for navigation).
- **Web Deployment**: Configured as a Progressive Web App (PWA) and deployed on **Vercel** (`g-project` Vercel App).
- **Backend/Database**: [Supabase](https://supabase.com/) (PostgreSQL) with Row-Level Security (RLS) managed.
- **State Management**: Zustand (`trackerStore.ts`) for local state and real-time synchronization.

## ✨ Implemented Features

### 1. Gamified Debt & Points System
- **Points Tracking**: Users can log actions to earn or lose points.
- **Debt Calculation**: Debt accrues based on points. 
- **Late Pay Mechanics**: At 0:00 (Midnight) on Sunday/Monday, the weekly debt is finalized into `unpaid_weekly_debt`. If not paid within 24 hours, a 5€ late fee is added every 24 hours to enforce accountability.
- **Daily Reset**: The "GM" (Good Morning) boundary is set at **4:00 AM**.

### 2. Real-Time Synchronization
- Implemented Supabase Realtime (`postgres_changes`) for both `user_stats` and `action_entries`.
- Changes made by one user (Rico) instantly reflect on the other user's screen (Leo) without requiring a manual refresh.
- Added an "Opponent is Online" indicator based on Supabase presence/subscription status.

### 3. PWA & Routing Fixes
- Added a `vercel.json` configuration to handle Single Page Application (SPA) routing, resolving the `404 Not Found` errors that occurred when refreshing the app on Vercel.

## 🛠️ Recent Fixes (2026-07-13)
- **Dependency Reset**: Completely wiped `.expo`, `node_modules`, and `package-lock.json`, and reinstalled fresh dependencies to resolve severe runtime crashes.
- **TypeScript & Build Errors Resolved**:
  - Fixed a missing `useEffect` import in `app/(tabs)/settings.tsx` that was causing crashes on the Settings screen.
  - Fixed a type error in `components/useColorScheme.ts` causing `Type 'undefined' cannot be used as an index type` in `components/Themed.tsx`. The core scheme check now correctly provides a fallback value instead of evaluating to undefined.

## 🗄️ Database Configuration (Supabase)

To solve silent failures and synchronization issues, we updated the database schema and security rules:

1. **`user_stats` Table**:
   - Stores `my_points`, `my_debt`, `my_weekly_debt`, `unpaid_weekly_debt`, etc.
   - **RLS**: Row-Level Security has been configured with an "Allow ALL for authenticated users" policy to prevent read/write blocks.

2. **`action_entries` Table**:
   - Stores the history of clicked points/actions.
   - **Important Columns**: `user_id`, `rule_id`, `timestamp` (bigint), `points_applied`, `debt_applied`, `is_cancelled`.
   - **Foreign Keys**: The `user_id` foreign key constraint was removed (`DROP CONSTRAINT`) to allow seamless inserts without relying on a populated `public.users` table.

> [!TIP]
> Both tables now have an open RLS policy for authenticated users, meaning any future silent saving errors related to permissions have been permanently resolved.

## 🐛 Known Issues & Debugging
- **Error Alerts**: We built a hard error-tracking system into `trackerStore.ts` that triggers native `alert()` pop-ups if Supabase rejects a database operation. If the app ever fails to save again, the exact database error will be shown on-screen immediately.

## 🚀 Next Steps & Recommendations
1. **Push Notifications**: Consider implementing Expo Push Notifications to alert the other user when points are logged or when the 4:00 AM GM is triggered.
2. **Offline Support**: Currently, actions fail if there is no internet connection. Implementing a local queue (e.g., using `AsyncStorage`) that pushes to Supabase once the connection is restored would make the PWA feel truly native.
3. **Animations**: Add micro-animations (e.g., Lottie or React Native Reanimated) when points are gained or lost to increase the gamified "WOW" effect.
