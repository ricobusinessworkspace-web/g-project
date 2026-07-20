# Project Handover: G-Project Tracker

## Overview
The G-Project Tracker is a React-based Progressive Web App (PWA) built with Vite and TypeScript. It is a dual-player habit, penalty, and debt tracking application designed to be extremely fast, offline-capable (via state persistence), and aggressively synchronized via Supabase Realtime. 

## Tech Stack
- **Frontend**: React, TypeScript, Vite
- **State Management**: Zustand (with `persist` middleware for local storage caching)
- **Database / Backend**: Supabase (PostgreSQL, Realtime, REST API)
- **Styling**: Vanilla CSS (`index.css`) utilizing modern glassmorphism, CSS variables for theming, and an Apple-like minimalist aesthetic.
- **Deployment**: Vercel (Auto-deploys from the `main` branch)

## Architecture & Data Flow
The app relies on a heavy-client architecture where complex logic (like catching up on missed days) is calculated client-side upon app load, before state is pushed back to Supabase.

### Supabase Schema
The database consists of three main tables:
1. `tracker_user_profiles`: Stores static user information (name, id).
2. `tracker_user_stats`: Stores current state balances (e.g., `my_points`, `my_debt`, `my_weekly_debt`, `my_total_debt`, `unpaid_weekly_debt`, and last-action timestamps).
3. `tracker_action_entries`: An append-only ledger for every action logged (points added, debt added). Acts as the single source of truth for the "History Feed".

### Zustand Store (`trackerStore.ts`)
This is the core engine of the app. It handles:
- **`fetchState`**: Grabs the initial state and all actions from the current month.
- **`logAction`**: Logs an action locally, updates the debt/point balances, and pushes to Supabase.
  - *Debt Spillover Logic*: Negative `myWeeklyDebt` automatically spills over to `myTotalDebt` at the end of the week (handled by Catch-Up Engine). Manual debt payoffs (`ab_3`) exclusively target `myTotalDebt`.
- **`setupRealtimeSync`**: Listens to Supabase `postgres_changes` to instantly reflect the opponent's actions or status changes.

### Catch-Up Engine (`utils/catchUpEngine.ts`)
Because users might not open the app every day, the Catch-Up Engine runs on boot (via `checkAndRunSettlement`). It simulates the passage of time since the user's `lastSettlementDate`.
- It dynamically retroactively applies the 5-point daily decay (`daily_tax`).
- It applies the Sleep Tax (if a user didn't log their "Good Morning" in time).
- It executes the **Weekly Reset** on Mondays (moving positive `myWeeklyDebt` to `unpaid_weekly_debt`, or applying negative `myWeeklyDebt` against the `myTotalDebt`).
- It processes Late Fees for unpaid debt.

## UI / UX Design
The UI follows a strict, minimalist "Apple-like" premium design.
- We recently removed all clunky borders and heavy card backgrounds in favor of transparent dividers and flat glassmorphism (`.glass`).
- `react-hot-toast` is used for non-intrusive bottom-center notifications.
- `navigator.vibrate` is heavily utilized to provide haptic feedback upon logging actions.

## Deployment Workflow
- The app is deployed on Vercel. 
- **Rule of Thumb**: Do not test locally with `npm run dev` unless necessary. Commit and push directly to `main` via `git add . && git commit -m "..." && git push origin main` so Vercel can auto-deploy the changes for both users immediately.

## Known Gotchas
- **In-App Browsers**: The app struggles with session persistence inside Instagram/WhatsApp in-app browsers. Users must use "Add to Homescreen" (PWA mode) for SSO-like persistence.
- **Client-Side Engine**: The `catchUpEngine` assumes at least one user opens the app to trigger settlements. If neither user opens the app for a month, the engine will loop through all missed days upon the next open. Ensure the while-loop in `catchUpEngine.ts` remains highly optimized to prevent browser lock-ups.
