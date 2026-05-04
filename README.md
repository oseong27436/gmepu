# 지메뿌 (Gmepu)

> **지도에 메모 뿌리기** — Drop post-it notes anywhere on the map. Discover strangers' thoughts as you walk by.

A location-based memo sharing platform where users pin short post-it notes to real-world GPS coordinates, and others nearby can stumble upon them.

🔗 **[Live Demo](https://gmepu.vercel.app)**

---

## Features

- **Drop memos on the map** — Pin a colorful post-it note at your exact GPS location
- **Interactive Google Maps** — Browse all nearby memos with automatic marker clustering
- **Swipe to explore** — Flip through nearby notes with a swipe-up bottom sheet
- **Location chat rooms** — Each memo spot has its own real-time chat room
- **Friends** — Follow other users and see their memos highlighted on the map
- **Google login** — One-tap sign-in via Supabase Auth

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Map | Google Maps API · `@vis.gl/react-google-maps` · `@googlemaps/markerclusterer` |
| Database & Auth | Supabase |
| Animations | Framer Motion |

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/oseong27436/gmepu.git
cd gmepu
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=your_map_id
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
app/
  page.tsx            # Animated landing page
  map/                # Main map view
components/
  MapContent.tsx      # Core map logic, memo pins & clustering
  MemoSheet.tsx       # Write / read a memo
  MemoSwipeSheet.tsx  # Swipe through nearby memos
  ChatRoomPanel.tsx   # Real-time location chat
  FriendsPanel.tsx    # Friends & following list
  MemoPin.tsx         # Custom map pin marker
  MapHeader.tsx       # Search & filter bar
  LoginModal.tsx      # Google OAuth modal
  NicknameSetupModal.tsx
  LocationPermissionScreen.tsx
lib/                  # Supabase client, DB helpers
```
