// Aluna legal texts (EN) — reasonable pre-launch DRAFT, PENDING PROFESSIONAL
// LEGAL REVIEW before charging real money or real traffic. Mirrors legal-es.ts.
import type { LegalDoc } from "./legal-es";

export const TERMS_EN: LegalDoc = {
  title: "Terms of Use",
  updated: "July 2026",
  intro:
    "Welcome to Aluna. By creating an account or using the app you accept these terms. Take a calm read: they are short and honest.",
  sections: [
    {
      h: "What Aluna is",
      p: [
        "Aluna is a self-knowledge tool that calculates and interprets your birth chart, numerology, horoscope and Four Pillars (Ba Zi/Saju) from your birth data.",
        "Astronomical calculations use professional-grade ephemerides; interpretations are editorial content and, when you enable extended readings, text generated with the help of artificial intelligence.",
      ],
    },
    {
      h: "Your account",
      p: [
        "You need an account with a verified email. You are responsible for keeping your password safe and for activity under your account.",
        "You may close your account at any time; we will then delete your personal data as described in the Privacy Policy.",
      ],
    },
    {
      h: "Acceptable use",
      p: [
        "Do not use Aluna for illegal activities, to violate other people's privacy, or to resell its content without permission.",
        "Profiles you add for other people (family, friends, partner) must be used with their knowledge and respect.",
      ],
    },
    {
      h: "Paid plans",
      p: [
        "Some features require a paid subscription. Prices, billing periods and renewal are shown before you confirm, and are handled by our payment processor.",
        "You can cancel anytime from Settings; cancellation takes effect at the end of the period already paid.",
      ],
    },
    {
      h: "Intellectual property",
      p: [
        "Aluna's design, interpretive texts and software belong to us or are licensed to us. Your birth data and personal notes are yours.",
      ],
    },
    {
      h: "Limitation of liability",
      p: [
        "Aluna is provided “as is”, as a tool for reflection and entertainment. We do not guarantee outcomes and are not liable for decisions made based on the app's content (see Disclaimer).",
      ],
    },
    {
      h: "Changes to these terms",
      p: [
        "We may update these terms; significant changes will be announced inside the app. Continuing to use Aluna after the notice means you accept the current version.",
      ],
    },
  ],
};

export const PRIVACY_EN: LegalDoc = {
  title: "Privacy Policy",
  updated: "July 2026",
  intro:
    "Your sky is yours. This policy explains what data we keep, why, and how you can delete it.",
  sections: [
    {
      h: "Data we collect",
      p: [
        "Account: your email address and login credentials (managed by our authentication provider).",
        "Birth profile: name, date, time and place of birth, and grammatical gender for readings. You may add other people's profiles under your responsibility.",
        "Personal content: your intentions, manifestations and journal notes, if you choose to write them.",
      ],
    },
    {
      h: "How we use it",
      p: [
        "To calculate your chart, numbers and pillars, and personalize your readings. Nothing else.",
        "If you enable AI readings, the content needed to generate your reading is sent to the configured AI provider; it is not used for advertising.",
        "We do not sell your data. There is no third-party advertising in Aluna.",
      ],
    },
    {
      h: "Where your data lives",
      p: [
        "In our managed database (Supabase), protected by row-level security rules: only your account can read your profiles and notes.",
      ],
    },
    {
      h: "Your rights",
      p: [
        "You can view, correct or delete your data from the app, or write to us to exercise access, rectification, deletion or portability.",
        "When you delete your account, your profiles, notes and readings are removed from the active database.",
      ],
    },
    {
      h: "Contact",
      p: ["For any privacy matter, reach us via Settings → Help & support."],
    },
  ],
};

export const DISCLAIMER_EN: LegalDoc = {
  title: "Disclaimer",
  updated: "July 2026",
  intro:
    "Aluna is built with technical rigor and love for the traditions it interprets. Still, this needs saying clearly:",
  sections: [
    {
      h: "Nature of the content",
      p: [
        "Astrology, numerology and the Four Pillars are symbolic systems of self-knowledge. Aluna offers them as tools for reflection, inspiration and entertainment — not as predictive science.",
      ],
    },
    {
      h: "Not professional advice",
      p: [
        "Nothing in Aluna constitutes medical, psychological, legal or financial advice. For decisions about health, money, work or important relationships, consult qualified professionals.",
        "If you are going through an emotional crisis, seek professional support or your country's help lines. Aluna is not a substitute for therapy.",
      ],
    },
    {
      h: "AI-generated readings",
      p: [
        "Extended readings are generated by artificial-intelligence models from your astrological data. They may contain inaccuracies; take them as a poetic mirror, not literal truth.",
      ],
    },
    {
      h: "Your decisions are yours",
      p: [
        "Use what resonates and release what doesn't. The final word on your life is always yours.",
      ],
    },
  ],
};
