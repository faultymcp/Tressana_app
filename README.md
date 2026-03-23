# Tressana Mobile - React Native (Expo)

## Setup

1. **Install dependencies:**
```bash
cd tressana-mobile
npm install
```

2. **Create your `.env` file:**
```bash
cp .env.example .env
```
Then fill in your Supabase credentials (same ones from the Next.js project).

3. **Start the dev server:**
```bash
npx expo start
```

4. **Run on your device:**
- Install **Expo Go** on your phone (App Store / Play Store)
- Scan the QR code from the terminal
- Or press `i` for iOS simulator / `a` for Android emulator

## Project Structure

```
tressana-mobile/
├── app/                    # Screens (file-based routing)
│   ├── _layout.tsx         # Root layout (navigation stack)
│   ├── index.tsx           # Splash screen
│   ├── onboarding.tsx      # Welcome carousel
│   ├── auth.tsx            # Login / Sign up
│   ├── quiz.tsx            # Hair discovery quiz
│   ├── reveal.tsx          # Profile reveal
│   └── (tabs)/             # Bottom tab navigation
│       ├── _layout.tsx     # Tab bar config
│       ├── home.tsx        # Dashboard + routine tracker
│       ├── discover.tsx    # Hairstyle gallery
│       ├── salons.tsx      # Salon finder
│       └── profile.tsx     # User profile + settings
├── components/             # Reusable components
├── constants/
│   ├── theme.ts            # Colours, fonts, spacing, radii
│   ├── quiz.ts             # Quiz steps and options
│   └── onboarding.ts       # Onboarding slide data
├── lib/
│   └── supabase.ts         # Supabase client (uses AsyncStorage)
├── assets/                 # Images, icons, fonts
├── app.json                # Expo config
├── package.json
└── tsconfig.json
```

## User Flow

```
Splash → Onboarding (3 slides) → Auth → Quiz (7 steps) → Profile Reveal → Home (tabs)
                                                                              ├── Home (dashboard)
                                                                              ├── Discover (gallery)
                                                                              ├── Salons
                                                                              └── Profile
```

## Visual Identity

All colours, fonts, and spacing are in `constants/theme.ts`:
- **Violet:** #7643AC (primary)
- **Pink:** #F484B9 (accent)
- **Lavender:** #C38CD9 (secondary)
- **Lime:** #D9FF00 (spark, ~5%)
- **Porcelain:** #FFFEF7 (backgrounds)
- **Ink:** #332463 (text)

## What's Connected

- **Supabase Auth** — email/password + Google OAuth
- **Supabase Database** — hair profiles, hairstyles
- **Cloudflare R2** — hairstyle images (via image_url in database)

## Next Steps

- [ ] Add custom fonts (Sora + Inter) via expo-font
- [ ] Replace emoji icons with proper SVG icons (lucide-react-native or custom)
- [ ] Add onboarding images to replace placeholder circles
- [ ] Connect gallery to user's actual hair type from profile
- [ ] Build the AI chat advisor screen
- [ ] Build the ingredient scanner screen
- [ ] Add push notifications for routine reminders
- [ ] Configure deep linking for email confirmation callback
- [ ] Set up EAS Build for App Store / Play Store submission
