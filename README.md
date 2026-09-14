# VELOOP Rewards — Games Banner

Premium frontend for the VELOOP Games hub: 13 artwork banners in an auto-playing carousel, two fully playable titles, a centralized Game Coin wallet, and a redemption center.

This is a frontend prototype. Token, Game Coin, VE, SVE, Gem, and Spin balances are stored locally and are not connected to a live account backend.

## Features

- 13 reusable game banners generated from `src/data/gamesData.js`
- Coded Play Now bar with 20 Token cost, token icon (~20px), and infinite shimmer
- Horizontal auto-scroll carousel, swipe/drag, pause on hover, dot indicators, no arrows
- Play Now opens a game-specific home page (does not start the match immediately)
- Two playable games: **Blade Master** and **Slice Storm**
- First-time How to Play guide, token validation, revive / No Thanks, Game Coin rewards
- Central Game Coin balance shared across games and Redeem
- Redeem Game Coins into VE, SVE, Gems, Tokens, or Spins with confirmation and history
- Daily reward sessions and a dummy VE withdrawal flow (50 VE minimum)
- Loading, insufficient-token, and error states
- `prefers-reduced-motion` support

## Tech stack

- React 19 + Vite
- React Router
- Bootstrap 5 (layout utilities)
- CSS Modules
- Framer Motion / Lucide React
- Sharp (asset conversion)

## Component structure

```
src/
  components/games/     GameCard, GamesCarousel, PlayNowButton, TokenCost, CarouselDots, GameNavigation
  components/layout/    Navbar, Footer
  context/              WalletContext (tokens + Game Coins + redemptions)
  data/                 gamesData.js
  games/SliceStorm/     playable slicer
  pages/                Home, GameHome, GamePlay, BladeMaster, Redeem, Rewards, Withdraw
  assets/games/         game-01.avif … game-13.avif
  assets/icons/         token, game-coin, ves (transparent SVG/PNG)
```

## Asset preparation

Original banner artwork was created for this task (the Google Drive pack was not available in the workspace). Banners were cropped to a 3:4 card ratio, resized to 780×1040, and encoded as AVIF.

Token and Game Coin icons are vector artwork with transparent backgrounds, displayed at 20px in the Play Now bar.

To regenerate AVIF files after replacing source PNGs:

```bash
npm install
node scripts/prepare-assets.mjs
```

## Carousel behavior

The track duplicates the 13 cards for a seamless loop. It auto-scrolls while idle, pauses on hover/touch, and can be dragged or swiped. Dots jump to a card. Left/right arrow buttons are intentionally omitted.

## Installation

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`).

Dummy start balances: **150 Tokens**, **20 Game Coins**.

## Build

```bash
npm run build
npm run preview
```

## Deployment

Deploy the Vite `dist` folder to Vercel or Netlify.

Suggested Vercel flow:

```bash
npm i -g vercel
vercel
```

## Playable journey to test

1. Home carousel → Blade Master Play Now → Game Home → Play Now (20 Tokens) → guide → play → Game Over → Revive or No Thanks → Game Coins update.
2. Slice Storm uses the same wallet. Balance stays centralized.
3. Redeem → choose VEs → confirm → coins deducted.
4. Lower tokens (or spend them) to see the insufficient-token state.
5. Redeem with a low Game Coin balance to see the blocked conversion message.

## Notes

- Do not treat client-side rewards as production-authoritative. A future backend should validate sessions and grant Game Coins.
- Coming-soon titles still have banners and home pages, but cannot start a match.
