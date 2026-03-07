# PRD: Bee Voice Translator

## Overview
Real-time voice translation web app powered by DeepL API. Translates speech between Hebrew and English bidirectionally. Accessible as a standalone site linked from the main Bee AI platform (blaze-post.com).

## Problem
Yonatan and users need instant voice translation between Hebrew and English — for calls, meetings, and daily communication. Existing tools require copy-pasting text. This app lets you speak and get an instant translation.

## Solution
A clean, mobile-first web app that:
1. Captures voice input via browser microphone
2. Converts speech to text (Web Speech API)
3. Translates text via DeepL API (Hebrew ↔ English)
4. Speaks the translation aloud (Text-to-Speech)
5. Shows both original and translated text on screen

## Tech Stack
- **Framework:** Next.js 15 (App Router, TypeScript)
- **Styling:** Tailwind CSS + shadcn/ui
- **Speech-to-Text:** Browser Web Speech API (SpeechRecognition)
- **Translation:** DeepL API (paid plan, key provided)
- **Text-to-Speech:** Browser SpeechSynthesis API
- **Deploy:** Vercel

## Features

### Core (MVP)
1. **Two-panel UI** — Left panel: source language, Right panel: target language
2. **Language toggle** — Switch between HE→EN and EN→HE with one tap
3. **Push-to-talk button** — Hold/tap to record, release to translate
4. **Live transcription** — Show speech-to-text result in real-time as user speaks
5. **Instant translation** — Send transcribed text to DeepL API, show translated text
6. **Auto-speak translation** — Automatically read the translation aloud using TTS
7. **Copy button** — Copy translated text to clipboard
8. **History** — Show last 10 translations in current session (not persisted)

### UI/UX
- Mobile-first responsive design (works great on phone)
- Dark theme matching Bee AI brand
- Large, accessible buttons for the mic
- Visual feedback: pulsing mic animation while recording
- Language flags/labels (🇮🇱 Hebrew ↔ 🇬🇧 English)
- Minimal UI — no login required, no clutter

### API Route
- `POST /api/translate` — Accepts `{ text: string, sourceLang: "HE"|"EN", targetLang: "EN"|"HE" }`
- Calls DeepL API server-side (keeps API key secure)
- Returns `{ translatedText: string }`
- Rate limiting: 50 requests/minute per IP (basic protection)

## Pages
1. **`/`** — Main translator interface (single page app)
2. **API:** `/api/translate` — DeepL proxy endpoint

## Environment Variables
```
DEEPL_API_KEY=7ff2b6e7-3700-4471-ad92-cac6efee70cc
```

## DeepL API Integration
- Endpoint: `https://api-free.deepl.com/v2/translate` (or `https://api.deepl.com/v2/translate` for Pro)
- Auth: `Authorization: DeepL-Auth-Key {DEEPL_API_KEY}`
- Body: `{ text: ["string"], source_lang: "HE", target_lang: "EN" }`
- Hebrew language code in DeepL: `HE` (not `IW`)
- English language code: `EN`

## Design
- Background: dark gradient (#0a0a0a to #1a1a2e)
- Accent color: #f59e0b (amber, matching Bee brand)
- Card backgrounds: semi-transparent dark (#ffffff08)
- Font: Inter or system font stack
- Mic button: large circle (80px), amber glow when active
- Swap button between panels: circular arrows icon
- Clean typography, high contrast for readability

## Non-Goals
- No user accounts or authentication
- No conversation persistence across sessions
- No file/document translation (voice only for MVP)
- No languages beyond Hebrew and English

## Link from Main Site
- Add "Voice Translator" link in Bee AI sidebar navigation
- Add card on Bee AI dashboard linking to translator
- Subdomain: translate.blaze-post.com OR separate Vercel project linked from main site

## Success Metrics
- Page loads in < 2 seconds
- Translation completes in < 1 second after speech ends
- Works on Chrome, Edge, Safari mobile
- Zero server-side speech processing (all in browser)
