// =============================================================================
// Vitalis — Supplement & Lifestyle Recommendation Engine
// =============================================================================

import type {
  SupplementSuggestion,
  EvidenceLevel,
  MoodState,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Supplement Database
// ---------------------------------------------------------------------------

interface SupplementEntry {
  name: string;
  dosage: string;
  timing: string;
  evidence: EvidenceLevel;
  contraindications?: string[];
  interactions?: string[];
}

/**
 * Pattern-to-supplement mapping.
 * Each pattern maps to an array of supplement suggestions with dosages,
 * timing, and evidence levels from clinical research.
 */
const PATTERN_SUPPLEMENTS: Record<string, SupplementEntry[]> = {
  low_hrv: [
    {
      name: "Magnesium Glycinate",
      dosage: "400mg",
      timing: "Evening, 1-2h before bed",
      evidence: "strong",
      interactions: ["antibiotics", "bisphosphonates"],
    },
    {
      name: "Omega-3 (EPA/DHA)",
      dosage: "2-3g combined EPA+DHA",
      timing: "With meals",
      evidence: "strong",
      interactions: ["blood thinners"],
    },
    {
      name: "CoQ10 (Ubiquinol)",
      dosage: "100-200mg",
      timing: "With breakfast",
      evidence: "moderate",
      interactions: ["statins (beneficial interaction)", "blood thinners"],
    },
  ],
  circadian_delay: [
    {
      name: "Melatonin (Low-dose)",
      dosage: "0.3-0.5mg",
      timing: "2-3h before desired bedtime",
      evidence: "strong",
      contraindications: ["autoimmune conditions", "pregnancy"],
    },
    {
      name: "Magnesium L-Threonate",
      dosage: "144mg elemental Mg",
      timing: "1-2h before bed",
      evidence: "moderate",
    },
    {
      name: "Tart Cherry Extract",
      dosage: "500mg or 8oz juice",
      timing: "Evening",
      evidence: "moderate",
    },
  ],
  poor_sleep: [
    {
      name: "L-Theanine",
      dosage: "200-400mg",
      timing: "30-60min before bed",
      evidence: "moderate",
    },
    {
      name: "Glycine",
      dosage: "3g",
      timing: "Before bed",
      evidence: "moderate",
    },
    {
      name: "Apigenin",
      dosage: "50mg",
      timing: "Before bed",
      evidence: "emerging",
      contraindications: ["pregnancy", "hormone-sensitive conditions"],
    },
    {
      name: "Magnesium Glycinate",
      dosage: "400mg",
      timing: "Evening",
      evidence: "strong",
    },
  ],
  elevated_rhr: [
    {
      name: "Magnesium Glycinate",
      dosage: "400mg",
      timing: "Evening",
      evidence: "strong",
    },
    {
      name: "Potassium",
      dosage: "99mg supplement + dietary sources",
      timing: "With meals",
      evidence: "strong",
      contraindications: ["kidney disease", "ACE inhibitors"],
    },
    {
      name: "Hawthorn Berry Extract",
      dosage: "450-900mg",
      timing: "Divided doses with meals",
      evidence: "moderate",
      interactions: ["heart medications", "beta-blockers"],
    },
  ],
  low_activity: [
    {
      name: "Creatine Monohydrate",
      dosage: "5g",
      timing: "Any time, with water",
      evidence: "strong",
    },
    {
      name: "Vitamin D3",
      dosage: "2000-4000 IU",
      timing: "With breakfast (fat-containing meal)",
      evidence: "strong",
    },
    {
      name: "B-Complex",
      dosage: "1 capsule",
      timing: "Morning with food",
      evidence: "moderate",
    },
  ],
  high_strain: [
    {
      name: "Ashwagandha (KSM-66)",
      dosage: "600mg",
      timing: "Morning or split AM/PM",
      evidence: "strong",
      contraindications: ["thyroid conditions", "pregnancy", "autoimmune"],
      interactions: ["thyroid medications", "sedatives"],
    },
    {
      name: "Rhodiola Rosea",
      dosage: "200-400mg (3% rosavins)",
      timing: "Morning, empty stomach",
      evidence: "moderate",
      interactions: ["SSRIs", "MAOIs"],
    },
    {
      name: "Taurine",
      dosage: "1-3g",
      timing: "Post-workout or evening",
      evidence: "moderate",
    },
  ],
  sleep_debt: [
    {
      name: "Magnesium Glycinate",
      dosage: "400mg",
      timing: "Evening",
      evidence: "strong",
    },
    {
      name: "L-Theanine",
      dosage: "200mg",
      timing: "Before bed",
      evidence: "moderate",
    },
    {
      name: "Phosphatidylserine",
      dosage: "100-300mg",
      timing: "Evening (helps lower cortisol)",
      evidence: "moderate",
      interactions: ["blood thinners", "anti-inflammatory drugs"],
    },
  ],
  declining_mood: [
    {
      name: "Omega-3 (EPA-dominant)",
      dosage: "2g EPA",
      timing: "With meals",
      evidence: "strong",
      interactions: ["blood thinners"],
    },
    {
      name: "Vitamin D3 + K2",
      dosage: "4000 IU D3 + 100mcg K2",
      timing: "Morning with fat-containing meal",
      evidence: "strong",
    },
    {
      name: "SAMe",
      dosage: "200-400mg",
      timing: "Morning, empty stomach",
      evidence: "moderate",
      contraindications: ["bipolar disorder"],
      interactions: ["SSRIs", "MAOIs", "serotonergic drugs"],
    },
    {
      name: "Creatine Monohydrate",
      dosage: "3-5g",
      timing: "Any time",
      evidence: "emerging",
    },
  ],
};

// ---------------------------------------------------------------------------
// Mood-State-Specific Supplements
// ---------------------------------------------------------------------------

const MOOD_STATE_SUPPLEMENTS: Partial<Record<MoodState, SupplementEntry[]>> = {
  depression_risk: [
    {
      name: "Omega-3 (EPA-dominant)",
      dosage: "2-3g EPA",
      timing: "With meals, split doses",
      evidence: "strong",
      interactions: ["blood thinners"],
    },
    {
      name: "Vitamin D3",
      dosage: "4000 IU (test levels first)",
      timing: "Morning with fat",
      evidence: "strong",
    },
    {
      name: "Saffron Extract (affron)",
      dosage: "28mg",
      timing: "Morning",
      evidence: "moderate",
    },
  ],
  mania_risk: [
    {
      name: "Omega-3 (EPA/DHA)",
      dosage: "2g combined",
      timing: "With meals",
      evidence: "moderate",
    },
    {
      name: "NAC (N-Acetyl Cysteine)",
      dosage: "1000-2000mg",
      timing: "Divided doses",
      evidence: "emerging",
    },
  ],
};

// ---------------------------------------------------------------------------
// Diet Tips
// ---------------------------------------------------------------------------

const PATTERN_DIET_TIPS: Record<string, string[]> = {
  low_hrv: [
    "Increase omega-3 rich foods: fatty fish (salmon, sardines) 3x/week",
    "Add polyphenol-rich foods: dark berries, dark chocolate (85%+), green tea",
    "Reduce ultra-processed foods and seed oils",
    "Consider an anti-inflammatory diet pattern (Mediterranean)",
  ],
  circadian_delay: [
    "Avoid caffeine after 2 PM",
    "Eat dinner at least 3 hours before bedtime",
    "Front-load calories earlier in the day",
    "Avoid alcohol within 4 hours of sleep",
  ],
  poor_sleep: [
    "Avoid large meals within 2-3 hours of bedtime",
    "Include tryptophan-rich foods at dinner: turkey, eggs, cheese, nuts",
    "Tart cherry juice (8oz) in the evening contains natural melatonin",
    "Limit fluid intake 2 hours before bed to reduce wake-ups",
  ],
  elevated_rhr: [
    "Increase potassium-rich foods: bananas, sweet potatoes, leafy greens",
    "Reduce sodium intake to under 2300mg/day",
    "Add nitrate-rich foods: beets, arugula, spinach",
    "Hydrate adequately: aim for 35ml per kg body weight",
  ],
  low_activity: [
    "Eat protein with every meal (aim for 1.6g/kg body weight)",
    "Pre-workout: complex carbs + moderate protein 2h before",
    "Post-workout: protein + carbs within 2 hours",
    "Stay hydrated throughout the day",
  ],
  high_strain: [
    "Increase protein intake on high-strain days",
    "Add anti-inflammatory foods: turmeric, ginger, omega-3 fish",
    "Ensure adequate carb intake for recovery",
    "Consider collagen peptides (15-20g) for joint recovery",
  ],
  sleep_debt: [
    "Prioritize consistent meal timing to support circadian rhythm",
    "Avoid heavy, high-fat meals in the evening",
    "Include magnesium-rich foods: pumpkin seeds, almonds, dark leafy greens",
  ],
  declining_mood: [
    "Increase whole food intake, reduce processed foods",
    "Ensure adequate B-vitamin foods: eggs, leafy greens, legumes",
    "Add fermented foods for gut-brain axis: yogurt, kimchi, sauerkraut",
    "Consider reducing sugar and refined carbohydrates",
  ],
};

// ---------------------------------------------------------------------------
// Lifestyle Tips
// ---------------------------------------------------------------------------

const PATTERN_LIFESTYLE_TIPS: Record<string, string[]> = {
  low_hrv: [
    "Practice 5-10 min of slow breathing (4-7-8 or box breathing) daily",
    "Consider cold exposure: 1-3 min cold shower ending",
    "Limit alcohol — even moderate amounts suppress HRV for 24-48h",
    "Prioritize social connection — isolation measurably lowers HRV",
  ],
  circadian_delay: [
    "Get 10+ min of bright/outdoor light within 30 min of waking",
    "Dim lights and enable blue-light filters 2h before bed",
    "Set a consistent wake time (even weekends) — this anchors your rhythm",
    "Avoid screens in bed — reserve bed for sleep only",
  ],
  poor_sleep: [
    "Keep bedroom temperature at 18-20C (65-68F)",
    "Block all light sources — use blackout curtains or a sleep mask",
    "Create a 30-min wind-down routine before bed",
    "If you can't fall asleep in 20 min, get up and do something relaxing",
  ],
  elevated_rhr: [
    "Check for dehydration — low fluid intake raises RHR",
    "Assess stress levels — chronic stress elevates baseline RHR",
    "Reduce or eliminate caffeine temporarily to see if RHR drops",
    "If persistently elevated, consider checking with a physician",
  ],
  low_activity: [
    "Start with a 10-minute daily walk — consistency beats intensity",
    "Set a step goal 10% above your current average",
    "Take movement breaks every 60 minutes during work",
    "Find a form of exercise you enjoy — adherence matters most",
  ],
  high_strain: [
    "Schedule at least 1 full rest day per week",
    "Include active recovery: light walking, yoga, foam rolling",
    "Monitor recovery scores — back off when recovery is low",
    "Ensure 7.5-9h of sleep on high-strain days",
  ],
  sleep_debt: [
    "Gradually move bedtime earlier by 15-min increments",
    "Avoid sleeping in excessively — it disrupts circadian rhythm",
    "Nap strategically: 20-min max before 2 PM if needed",
    "Track your sleep debt — aim to clear it over 5-7 days, not one night",
  ],
  declining_mood: [
    "Maintain regular physical exercise — even 20 min helps mood",
    "Prioritize social interactions, even brief ones",
    "Spend time outdoors in natural light",
    "Consider journaling or mood tracking alongside biometric data",
    "If mood stays low for 2+ weeks, consider speaking with a professional",
  ],
};

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------

const MOOD_STATE_WARNINGS: Partial<Record<MoodState, string[]>> = {
  depression_risk: [
    "Your biometric patterns suggest depression risk. This is NOT a diagnosis.",
    "If you experience persistent low mood, loss of interest, or changes in sleep/appetite for 2+ weeks, please consult a healthcare professional.",
    "Supplements are not a substitute for professional mental health care.",
    "Avoid starting SAMe or St. John's Wort if you are on SSRIs/SNRIs without medical supervision.",
  ],
  mania_risk: [
    "Your biometric patterns show elevated indicators. This is NOT a diagnosis.",
    "If you experience racing thoughts, decreased need for sleep, or impulsive behavior, please consult a healthcare professional.",
    "Avoid stimulating supplements (high-dose B vitamins, SAMe) during elevated periods.",
    "Monitor sleep carefully — reduced sleep need can be an early warning sign.",
  ],
};

const GENERAL_WARNINGS = [
  "These recommendations are educational, not medical advice. Consult a healthcare provider before starting new supplements.",
  "Supplements can interact with medications. Always disclose supplement use to your doctor.",
  "Individual responses vary — start with one supplement at a time and monitor for 2-4 weeks.",
];

// ---------------------------------------------------------------------------
// Main Recommendation Function
// ---------------------------------------------------------------------------

/**
 * Generate personalized supplement, diet, and lifestyle recommendations
 * based on detected biometric patterns and current mood state.
 *
 * @param patterns  - Array of detected pattern IDs from detectPatterns()
 * @param moodState - Current classified mood state
 * @returns         - Complete recommendation set with supplements, tips, and warnings
 */
export function getRecommendations(
  patterns: string[],
  moodState: MoodState
): {
  supplements: SupplementSuggestion[];
  dietTips: string[];
  lifestyleTips: string[];
  warnings: string[];
} {
  const supplementMap = new Map<string, SupplementSuggestion>();
  const dietTipSet = new Set<string>();
  const lifestyleTipSet = new Set<string>();
  const warningSet = new Set<string>(GENERAL_WARNINGS);

  // 1. Collect pattern-based supplements (deduplicated by name)
  for (const pattern of patterns) {
    const supplements = PATTERN_SUPPLEMENTS[pattern];
    if (supplements) {
      for (const supp of supplements) {
        if (!supplementMap.has(supp.name)) {
          supplementMap.set(supp.name, {
            name: supp.name,
            dosage: supp.dosage,
            timing: supp.timing,
            reason: `Detected pattern: ${pattern}`,
            evidence: supp.evidence,
            contraindications: supp.contraindications,
            interactions: supp.interactions,
          });
        }
      }
    }

    // Collect diet tips
    const diet = PATTERN_DIET_TIPS[pattern];
    if (diet) {
      for (const tip of diet) dietTipSet.add(tip);
    }

    // Collect lifestyle tips
    const lifestyle = PATTERN_LIFESTYLE_TIPS[pattern];
    if (lifestyle) {
      for (const tip of lifestyle) lifestyleTipSet.add(tip);
    }
  }

  // 2. Add mood-state-specific supplements
  const moodSupplements = MOOD_STATE_SUPPLEMENTS[moodState];
  if (moodSupplements) {
    for (const supp of moodSupplements) {
      if (!supplementMap.has(supp.name)) {
        supplementMap.set(supp.name, {
          name: supp.name,
          dosage: supp.dosage,
          timing: supp.timing,
          reason: `Mood state: ${moodState}`,
          evidence: supp.evidence,
          contraindications: supp.contraindications,
          interactions: supp.interactions,
        });
      }
    }
  }

  // 3. Add mood-state warnings
  const stateWarnings = MOOD_STATE_WARNINGS[moodState];
  if (stateWarnings) {
    for (const w of stateWarnings) warningSet.add(w);
  }

  // 4. Sort supplements by evidence level (strong first)
  const evidenceOrder: Record<EvidenceLevel, number> = {
    strong: 0,
    moderate: 1,
    emerging: 2,
    traditional: 3,
  };

  const supplements = Array.from(supplementMap.values()).sort(
    (a, b) => evidenceOrder[a.evidence] - evidenceOrder[b.evidence]
  );

  return {
    supplements,
    dietTips: Array.from(dietTipSet),
    lifestyleTips: Array.from(lifestyleTipSet),
    warnings: Array.from(warningSet),
  };
}
