# PRD: Vitalis — AI Health Insights from Wearable Data

## Overview

**Vitalis** is a web-based health intelligence platform that automatically ingests data from Apple Watch and WHOOP strap, applies scientific health formulas and AI analysis to detect mood states (depression, euthymic/normal, hypomania/mania), validates data quality, and provides personalized supplement/diet/lifestyle recommendations powered by DeepSeek AI.

**Target User**: Health-conscious individuals, biohackers, and people managing mood disorders (bipolar, depression, anxiety) who wear Apple Watch and/or WHOOP.

**Core Value Proposition**: "Your wearables collect the data. Vitalis tells you what it means — and what to do about it."

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Data Sources                            │
│                                                              │
│  ┌──────────────────┐     ┌─────────────────────────────┐   │
│  │  WHOOP Strap     │     │  Apple Watch / iPhone        │   │
│  │  OAuth 2.0 API   │     │  Apple Health Export (XML)   │   │
│  │  + Webhooks      │     │  or Terra/Vital SDK (future) │   │
│  └────────┬─────────┘     └──────────────┬──────────────┘   │
└───────────┼──────────────────────────────┼──────────────────┘
            │                              │
            ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Vitalis Backend (Next.js)                    │
│                  Hosted on Hetzner VPS                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Data Ingest  │  │ Validation & │  │ Mood Analysis    │  │
│  │ & Normalize  │  │ Outlier      │  │ Engine           │  │
│  │              │  │ Detection    │  │ (HRV+Sleep+      │  │
│  │ WHOOP API    │  │              │  │  Circadian)      │  │
│  │ Apple Export  │  │ IQR + Z-score│  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ DeepSeek AI  │  │ Supplement   │  │ Fun Metrics &    │  │
│  │ Insights     │  │ Recommender  │  │ Visualizations   │  │
│  │ Engine       │  │              │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                              │
│  MongoDB: health_readings, daily_scores, recommendations     │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Web Dashboard                             │
│                                                              │
│  Mood Compass  |  Sleep Lab  |  Body Battery  |  AI Coach   │
│  Recovery Ring |  Trend Lines|  Supplement Rx  |  Alerts     │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Sources & Integration

### WHOOP (Direct API — Free)

**Auth**: OAuth 2.0 (Authorization Code + Refresh Token)
- Auth URL: `https://api.prod.whoop.com/oauth/oauth2/auth`
- Token URL: `https://api.prod.whoop.com/oauth/oauth2/token`
- Scope: `offline` for refresh tokens

**Endpoints to use**:
| Endpoint | Data | Frequency |
|----------|------|-----------|
| `GET /v2/recovery` | HRV (RMSSD ms), RHR, SpO2, skin temp, recovery score | Daily (AM) |
| `GET /v2/sleep` | Stages (awake/light/deep/REM), duration, efficiency, performance | Daily |
| `GET /v2/cycle` | Strain score, avg/max HR, calories | Daily |
| `GET /v2/workout` | HR zones, duration, calories, activity type | Per workout |

**Webhooks** (real-time push):
- `recovery.updated` — New recovery score available
- `sleep.updated` — New sleep data available
- `workout.updated` — New workout data available

**Data format**: JSON. HRV reported as `hrv_rmssd_milli` (RMSSD in milliseconds).

### Apple Watch / iPhone (Export-Based MVP, SDK Future)

**MVP Approach**: Manual Apple Health export
1. User exports Health data from iPhone (Settings > Health > Export All Health Data)
2. Uploads the `export.xml` ZIP file to Vitalis
3. Backend parses XML, extracts relevant records, stores in MongoDB
4. Re-upload weekly or when user wants fresh data

**Future Approach**: Mobile SDK bridge via Open Wearables (MIT license, self-hosted) or Terra API
- Requires a companion iOS app (React Native or Swift)
- Reads HealthKit data on-device, pushes to Vitalis API
- Phase 2 feature

**Apple Watch data points to extract**:
| HealthKit Type | Description | Units |
|---------------|-------------|-------|
| `HKQuantityTypeIdentifierHeartRateVariabilitySDNN` | HRV (SDNN) | ms |
| `HKQuantityTypeIdentifierRestingHeartRate` | Resting HR | bpm |
| `HKQuantityTypeIdentifierOxygenSaturation` | Blood oxygen | % |
| `HKQuantityTypeIdentifierRespiratoryRate` | Breathing rate | br/min |
| `HKQuantityTypeIdentifierAppleWalkingSteadiness` | Gait stability | % |
| `HKCategoryTypeIdentifierSleepAnalysis` | Sleep stages | enum |
| `HKQuantityTypeIdentifierStepCount` | Daily steps | count |
| `HKQuantityTypeIdentifierActiveEnergyBurned` | Active calories | kcal |
| `HKQuantityTypeIdentifierAppleSleepingWristTemperature` | Wrist temp deviation | degC |

**IMPORTANT**: Apple reports HRV as SDNN, WHOOP reports RMSSD. These are NOT interchangeable. The app must:
- Store both with their metric type labeled
- Use separate baseline calculations per metric type
- Display normalized z-scores for cross-device comparison

---

## Data Validation & Outlier Detection

Every incoming reading passes through a 3-stage validation pipeline before being used in analysis.

### Stage 1: Hard Bounds (Reject impossible values)

| Metric | Min | Max | Action if violated |
|--------|-----|-----|--------------------|
| Heart Rate | 30 bpm | 220 bpm | Reject, flag as sensor error |
| HRV (RMSSD) | 1 ms | 400 ms | Reject |
| HRV (SDNN) | 1 ms | 500 ms | Reject |
| SpO2 | 70% | 100% | Accept but flag if <85% (medical concern, not error) |
| Respiratory Rate | 4 | 40 br/min | Reject |
| Skin Temperature | 30 C | 40 C | Reject |
| Sleep Duration | 0 | 960 min (16h) | Flag >14h as suspicious |

### Stage 2: Statistical Outlier Detection (IQR Method)

Using a 14-day rolling window per metric per user:
```
Q1 = 25th percentile
Q3 = 75th percentile
IQR = Q3 - Q1
Lower = Q1 - 2.0 * IQR  (wider than standard 1.5x for biological data)
Upper = Q3 + 2.0 * IQR
```
Readings outside bounds are flagged as outliers but NOT deleted. They are:
- Excluded from daily score calculations
- Shown in the UI with a warning icon
- Included in raw data export

### Stage 3: Consistency Check

- If WHOOP `score_state` is `UNSCORABLE` → exclude that recovery data
- If sleep duration < 2 hours → exclude sleep metrics (probably didn't wear device)
- If >4 hours gap in HR data → mark day as "incomplete" with reduced confidence score
- Require 70% data completeness for a valid daily score

### Confidence Score

Every daily analysis gets a confidence score (0-100%):
```
confidence = (data_completeness% * 0.4) +
             (days_of_baseline / 14 * 0.3) +  // capped at 1.0
             (outlier_free% * 0.3)
```
Scores below 50% confidence show a "Low confidence — more data needed" warning.

---

## Mood Analysis Engine

### Scientific Basis

Based on peer-reviewed research (2024-2025):
1. **HRV reduction precedes depressive episodes** (ScienceDirect 2024, Translational Psychiatry 2025)
2. **Circadian phase shifts are the strongest predictor for bipolar episodes** (npj Digital Medicine 2024 — AUC 0.98 for mania, 0.80 for depression)
3. **Sleep duration variability correlates with mood instability** (eBioMedicine/Lancet 2024)
4. **Multimodal HRV + sleep achieves 12.5% improvement in bipolar subtype classification** (MDPI Sensors 2024)

### Biomarkers Used

| Biomarker | Source | What It Indicates |
|-----------|--------|-------------------|
| HRV z-score | WHOOP/Apple Watch | Autonomic nervous system state. Low = stress/depression. High = recovery |
| Resting HR deviation | WHOOP/Apple Watch | Elevated RHR = inflammation, stress, overtraining |
| Sleep efficiency | WHOOP/Apple Watch | % of time in bed actually sleeping. Low = fragmented sleep |
| Circadian phase shift | Calculated from sleep midpoint | Late shift = depression risk. Early shift = mania risk |
| Sleep duration variability | Calculated from 7-14 day window | High variability = mood instability |
| REM % | WHOOP | Increased REM latency = depression indicator |
| Deep sleep % | WHOOP | Reduced deep sleep = poor recovery |
| Activity level z-score | Steps + strain | Low = withdrawal (depression). High = hyperactivity (mania) |

### Mood State Classification

The system maintains a 14-day rolling baseline per user. All scores are personalized z-scores (how far from YOUR normal).

**Composite Mood Score Formula**:
```
MoodScore = (0.25 * HRV_zscore) +
            (0.25 * CircadianPhase_zscore) +
            (0.15 * SleepEfficiency_zscore) +
            (0.15 * SleepDurationVariability_zscore) +
            (0.10 * RHR_deviation_zscore) +
            (0.10 * ActivityLevel_zscore)
```

**Classification thresholds** (after 14+ days of baseline):

| MoodScore Range | State | Visual | Description |
|----------------|-------|--------|-------------|
| < -1.5 | Depression risk | Blue | "Your recovery patterns suggest low energy. Take extra care today." |
| -1.5 to -0.5 | Low mood | Light blue | "Slightly below your baseline. Monitor and prioritize rest." |
| -0.5 to 0.5 | Euthymic (stable) | Green | "You're in your normal range. Keep it up." |
| 0.5 to 1.5 | Elevated | Yellow | "Higher than usual energy. Channel it productively." |
| > 1.5 | Mania risk | Orange/Red | "Significantly elevated patterns detected. Consider slowing down." |

**Safety rules**:
- Never use the words "diagnosed", "you have depression/mania", or "you are bipolar"
- Always frame as "patterns suggest", "your data indicates", "consider consulting"
- Show a persistent "Not medical advice" banner
- If MoodScore > 2.0 or < -2.0 for 3+ consecutive days → show urgent "Contact your healthcare provider" alert

---

## Fun & Engaging Metrics

### The Mood Compass (Hero Widget)
A circular compass visualization showing current mood state:
- Needle points between Depression (South/Blue) ↔ Mania (North/Red)
- East = Anxious, West = Calm
- Center = Balanced/Euthymic (Green)
- Animated needle movement based on daily score
- 7-day trail showing trajectory

### Body Battery (0-100)
Like a phone battery meter combining:
- Recovery score (from WHOOP or calculated)
- Sleep quality
- Stress level (inverse HRV)
- Shows "charging" animation when recovering, "draining" when strained

### Sleep Lab Report Card
A "grade" for each sleep metric:
- Total Sleep: A-F based on 7-9h target
- Sleep Efficiency: A-F based on >90% target
- Deep Sleep: A-F based on 15-25% target
- REM Sleep: A-F based on 20-25% target
- Consistency: A-F based on sleep time variability
- Overall Sleep GPA (weighted average)

### Recovery Ring (circular progress)
Inspired by Apple Watch rings:
- Inner: HRV recovery (vs personal baseline)
- Middle: Sleep score
- Outer: Readiness (composite)
- All animate on page load

### Streak Tracker
- "Consecutive days of good sleep" (efficiency >85%)
- "Days in balanced mood zone"
- "Recovery streak" (days above 60% recovery)
- Fire animation for active streaks

### Weekly "Vital Signs" Report Card
AI-generated summary with grades and trends:
```
This Week's Vitals:
  Sleep Quality: B+ (↑ from B last week)
  Recovery: A- (stable)
  Mood Stability: B (↓ slight dip Thursday-Friday)
  Activity: C+ (low strain days)

  Highlight: Your deep sleep improved 12% this week!
  Watch out: HRV dipped 15% on Thursday — stress event?
```

---

## Supplement & Lifestyle Recommendations

### Biomarker-to-Recommendation Mapping

| Pattern Detected | Duration | Recommendations |
|-----------------|----------|-----------------|
| Low HRV trend (below 10th %ile) | 3+ days | Omega-3 (1-2g EPA/day), Magnesium glycinate (400mg PM), breathing exercises, reduce caffeine |
| Poor sleep efficiency (<85%) | 3+ nights | Magnesium glycinate (200-400mg PM), L-Theanine (200mg PM), reduce blue light, consistent bedtime |
| Elevated RHR (+5bpm above baseline) | 3+ days | Reduce stimulants, Omega-3, check Vitamin D levels, deload exercise |
| Circadian phase delay (late sleep) | 3+ days | Morning sunlight 30min, Vitamin D 2000IU AM, low-dose melatonin 0.3mg PM, no screens after 10pm |
| Circadian phase advance (early sleep) | 3+ days | Evening bright light, AVOID stimulating supplements, monitor for hypomania |
| Low SpO2 trend (<95% overnight) | 3+ nights | Check iron/B12 levels, nasal breathing exercises, evaluate sleep apnea risk |
| Depression-range mood score | 5+ days | Vitamin D 4000IU, Omega-3 2g EPA, NAC 1000mg, morning walks, social connection |
| Mania-range mood score | 2+ days | AVOID caffeine/stimulants/ashwagandha, prioritize sleep hygiene, contact provider |

### AI Coach (DeepSeek-Powered)

When user opens the Insights page, DeepSeek analyzes their data and generates:
1. **Daily Insight** — 2-3 sentences about today's data
2. **Weekly Summary** — Trends, highlights, concerns
3. **Action Items** — 3 specific things to do today
4. **Supplement Suggestions** — Based on patterns, with dosages and timing
5. **Diet Suggestions** — Anti-inflammatory foods, sleep-promoting foods, mood-supporting nutrients

**Prompt template for DeepSeek**:
```
You are a health optimization AI analyzing wearable data. The user has the following 7-day data:
{data_summary}

Current mood score trend: {mood_scores}
Detected patterns: {patterns}
Data confidence: {confidence}%

Provide:
1. A brief, warm daily insight (2 sentences)
2. Top 3 actionable recommendations for today
3. Any supplement suggestions with specific dosages and timing
4. One dietary tip based on the data

Rules:
- Never diagnose. Use "patterns suggest" and "consider"
- Always recommend consulting a healthcare provider for persistent concerning patterns
- Be encouraging and positive, not alarmist
- Reference specific data points to justify recommendations
```

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind 4, shadcn/ui |
| Charts | Recharts (area, line, radar, pie) |
| Backend API | Next.js API routes |
| Database | MongoDB Atlas (same cluster as Ria AI) |
| AI Engine | DeepSeek API (deepseek-chat) |
| WHOOP Integration | Direct OAuth 2.0 + REST API + Webhooks |
| Apple Health | XML export parser (MVP), Mobile SDK bridge (Phase 2) |
| Hosting | Vercel (frontend) + Hetzner VPS (webhook receiver, cron jobs) |
| Auth | NextAuth.js with credentials + WHOOP OAuth |

---

## Database Models

### `health_readings` Collection
```ts
{
  userId: string,
  source: "whoop" | "apple_watch" | "manual",
  date: Date,
  metrics: {
    hrv_rmssd?: number,      // WHOOP: milliseconds
    hrv_sdnn?: number,       // Apple Watch: milliseconds
    resting_hr: number,      // bpm
    spo2?: number,           // percentage
    respiratory_rate?: number, // breaths/min
    skin_temp_deviation?: number, // celsius
    sleep_duration: number,  // minutes
    sleep_efficiency: number, // percentage 0-100
    sleep_stages: {
      awake: number,         // minutes
      light: number,
      deep: number,
      rem: number,
    },
    sleep_midpoint: Date,    // for circadian analysis
    steps: number,
    active_calories: number,
    strain_score?: number,   // WHOOP 0-21
    recovery_score?: number, // WHOOP 0-100
  },
  validation: {
    passed: boolean,
    outliers: string[],      // which metrics were flagged
    confidence: number,      // 0-100
    data_completeness: number, // 0-100
  },
  raw: object,               // original API response
  createdAt: Date,
}
```

### `daily_scores` Collection
```ts
{
  userId: string,
  date: Date,
  mood_score: number,        // composite -3 to +3
  mood_state: "depression_risk" | "low" | "euthymic" | "elevated" | "mania_risk",
  body_battery: number,      // 0-100
  sleep_gpa: number,         // 0-4.0
  confidence: number,        // 0-100
  biomarkers: {
    hrv_zscore: number,
    circadian_phase_shift: number, // hours from baseline
    sleep_efficiency_zscore: number,
    sleep_variability_zscore: number,
    rhr_deviation_zscore: number,
    activity_zscore: number,
  },
  baseline: {
    hrv_mean: number,
    hrv_std: number,
    sleep_midpoint_mean: Date,
    rhr_mean: number,
    days_in_baseline: number,
  },
  patterns_detected: string[], // ["low_hrv", "circadian_delay", etc.]
  createdAt: Date,
}
```

### `recommendations` Collection
```ts
{
  userId: string,
  date: Date,
  type: "daily" | "weekly",
  ai_insight: string,
  action_items: string[],
  supplements: Array<{
    name: string,
    dosage: string,
    timing: string,
    reason: string,
    evidence_level: "strong" | "moderate" | "emerging",
  }>,
  diet_tips: string[],
  warnings: string[],
  mood_state: string,
  generated_by: "deepseek-chat",
  createdAt: Date,
}
```

---

## Pages

### 1. Landing Page `/`
- Hero: "Your wearables collect data. Vitalis tells you what it means."
- How it works: Connect → Analyze → Optimize
- Science section: "Built on peer-reviewed research from Nature, Lancet, and npj Digital Medicine"
- Disclaimer footer

### 2. Dashboard `/dashboard`
- Mood Compass (hero widget, center)
- Body Battery gauge (top-left)
- Recovery Ring (top-right)
- Today's AI Insight card
- Streak trackers (sleep, mood, recovery)
- Quick stats: HRV, RHR, Sleep Score, Steps

### 3. Sleep Lab `/sleep`
- Sleep GPA report card
- Sleep stage breakdown (stacked area chart, 7 days)
- Circadian rhythm chart (sleep midpoint over 30 days)
- Sleep consistency score
- Sleep tips from AI

### 4. Mood Tracker `/mood`
- Mood score timeline (30-day line chart with colored zones)
- Mood Compass history
- Biomarker breakdown (which factors contributed to today's score)
- Pattern alerts (circadian shift detected, HRV trend, etc.)
- Weekly mood distribution (pie chart)

### 5. Insights `/insights`
- AI Coach card (DeepSeek-generated daily insight)
- Weekly Report Card
- Supplement recommendations with evidence badges
- Diet suggestions
- Lifestyle tips
- "Ask Vitalis" — chat with AI about your health data

### 6. Data `/data`
- Raw data table (filterable by date, source, metric)
- Data quality indicators (outlier flags, confidence scores)
- Export to CSV
- WHOOP sync status
- Apple Health upload area

### 7. Settings `/settings`
- Connect WHOOP (OAuth flow)
- Upload Apple Health export
- Personal info (age, weight — for baseline calibration)
- Notification preferences
- Data retention settings
- Medical disclaimer acknowledgment

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | * | NextAuth with credentials + WHOOP OAuth |
| `/api/whoop/callback` | GET | WHOOP OAuth callback |
| `/api/whoop/sync` | POST | Pull latest WHOOP data (recovery, sleep, cycle) |
| `/api/webhooks/whoop` | POST | Receive WHOOP webhook events |
| `/api/apple-health/upload` | POST | Upload and parse Apple Health XML export |
| `/api/readings` | GET/POST | Health readings CRUD |
| `/api/scores` | GET | Daily scores with mood state |
| `/api/scores/calculate` | POST | Trigger score calculation for a date |
| `/api/insights` | GET | AI-generated insights (daily/weekly) |
| `/api/insights/generate` | POST | Generate fresh AI insight via DeepSeek |
| `/api/recommendations` | GET | Supplement/diet recommendations |
| `/api/mood/history` | GET | Mood score timeline |
| `/api/sleep/analysis` | GET | Sleep analysis with grades |
| `/api/data/export` | GET | Export data as CSV |

---

## WHOOP Webhook Receiver (VPS)

The Hetzner VPS (65.109.230.136) hosts the webhook receiver since Vercel serverless functions may timeout on webhook processing.

```
VPS: nginx → Node.js webhook server (port 3004)

POST /webhooks/whoop
  1. Verify webhook signature
  2. Parse event (recovery.updated, sleep.updated, workout.updated)
  3. Fetch full data from WHOOP API using stored OAuth tokens
  4. Run validation pipeline (hard bounds → IQR → consistency)
  5. Store validated reading in MongoDB
  6. Trigger daily score recalculation
  7. If mood score crosses threshold → send notification
```

---

## Safety & Legal

### Medical Disclaimers (Required on Every Page)

**Footer disclaimer**: "Vitalis is a wellness tool, not a medical device. It does not diagnose, treat, cure, or prevent any disease. Always consult your healthcare provider before making changes to your health routine, supplements, or medications."

**Supplement disclaimer**: "These statements have not been evaluated by the FDA. Supplement suggestions are based on general wellness research and are not personalized medical advice."

**Mood analysis disclaimer**: "Mood state indicators are based on wearable data patterns and published research correlations. They are not clinical diagnoses. If you are experiencing mental health concerns, please contact a licensed healthcare professional or call 988 (Suicide & Crisis Lifeline)."

### FDA Compliance

Position as **General Wellness** product to avoid SaMD (Software as Medical Device) classification:
- Use "wellness suggestions" not "treatment recommendations"
- Use "patterns suggest" not "you have"
- Use "mood trends" not "diagnosis"
- Never claim to replace professional medical care
- Include crisis hotline numbers when depression risk is detected

### Data Privacy

- Health data encrypted at rest (MongoDB Atlas encryption)
- HTTPS only
- No data sharing with third parties
- User can delete all data at any time
- HIPAA not required for general wellness apps, but follow best practices

---

## Implementation Phases

### Phase 1: Core Platform (Week 1)
1. Scaffold Next.js project with Tailwind + shadcn
2. WHOOP OAuth integration + data sync
3. Apple Health XML parser
4. MongoDB models (readings, scores, recommendations)
5. Data validation pipeline
6. Basic dashboard with stats

### Phase 2: Analysis Engine (Week 2)
1. Mood score calculation engine
2. Baseline calculation (14-day rolling)
3. Outlier detection
4. Daily score generation
5. Mood Compass visualization
6. Body Battery gauge

### Phase 3: AI & Recommendations (Week 3)
1. DeepSeek integration for insights
2. Supplement recommendation engine
3. Sleep Lab report card
4. Mood tracker timeline
5. Weekly report generation

### Phase 4: Polish & Deploy (Week 4)
1. VPS webhook receiver setup
2. Recovery Ring animation
3. Streak trackers
4. Fun metrics (Sleep GPA, etc.)
5. Landing page
6. Deploy to Vercel + VPS
7. WHOOP app registration for production OAuth

---

## Scientific References

1. HRV in Mental Disorders — Translational Psychiatry 2025 (Nature)
2. HRV Predictive Potential for Depression — ScienceDirect 2024
3. HRV in Bipolar Disorder — Bayesian Analysis, npj Mental Health 2024
4. Predicting Mood Episodes from Wearable Data — npj Digital Medicine 2024 (AUC: 0.98 mania, 0.80 depression)
5. Circadian Rhythm and Mood in Bipolar — eBioMedicine/Lancet 2024
6. Sleep and Circadian Disruption in Bipolar — PMC 2025
7. Multimodal DNN on HRV for Psychiatric Classification — MDPI Sensors 2024
8. Nutraceuticals in Psychiatry — MDPI International Journal of Molecular Sciences 2024

---

## Success Metrics

- User connects WHOOP within 5 minutes of signup
- First mood score generated within 24 hours
- 70%+ users return daily for first 2 weeks
- AI insight accuracy rated "helpful" by >80% of users
- Zero false medical claims (compliance audit)
