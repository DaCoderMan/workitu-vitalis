import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Vitalis",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: March 6, 2026
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            1. Introduction
          </h2>
          <p>
            Vitalis (&quot;we&quot;, &quot;our&quot;, &quot;the app&quot;) is a
            personal health dashboard operated by Workitu Tech. This policy
            describes how we collect, use, and protect your data when you use
            Vitalis at vitalis.workitu.com or workitu-vitalis.vercel.app.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            2. Data We Collect
          </h2>
          <p className="mb-2">
            When you connect a wearable device or upload health data, we may
            collect:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>WHOOP data:</strong> Recovery scores, heart rate
              variability (HRV), resting heart rate, sleep duration, sleep
              stages, strain scores, SpO2, skin temperature, and workout data
              — accessed via the WHOOP API with your explicit OAuth consent.
            </li>
            <li>
              <strong>Apple Health data:</strong> Health metrics from exported
              XML/ZIP files that you manually upload.
            </li>
            <li>
              <strong>Profile information:</strong> Age, weight, and height if
              you choose to provide them for insight calibration.
            </li>
            <li>
              <strong>Generated data:</strong> Mood scores, daily scores, AI
              insights, and recommendations computed from your health readings.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            3. How We Use Your Data
          </h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>Display your health metrics on your personal dashboard</li>
            <li>
              Generate AI-powered health insights, supplement recommendations,
              and lifestyle tips
            </li>
            <li>Track mood patterns and sleep quality over time</li>
            <li>Improve the accuracy of our analysis algorithms</li>
          </ul>
          <p className="mt-2">
            We do <strong>not</strong> sell, rent, or share your personal health
            data with any third parties for advertising or marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            4. Data Storage & Security
          </h2>
          <p>
            Your data is stored in a secured MongoDB Atlas database with
            encryption at rest and in transit. OAuth tokens for connected
            services (e.g., WHOOP) are stored encrypted and are only used to
            fetch your data on your behalf. We use HTTPS for all data
            transmission.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            5. Third-Party Services
          </h2>
          <p className="mb-2">Vitalis integrates with:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>WHOOP API</strong> — to read your wearable health data
              (only with your explicit OAuth authorization)
            </li>
            <li>
              <strong>DeepSeek AI</strong> — to generate health insights (your
              data is sent to their API for processing; no data is retained by
              DeepSeek beyond the request)
            </li>
            <li>
              <strong>Vercel</strong> — hosting platform
            </li>
            <li>
              <strong>MongoDB Atlas</strong> — database hosting
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            6. Your Rights
          </h2>
          <p>You have the right to:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Access</strong> all data we hold about you (via the Data
              Management page)
            </li>
            <li>
              <strong>Export</strong> your data in CSV format at any time
            </li>
            <li>
              <strong>Delete</strong> all your data permanently (via Settings
              &gt; Delete All Data)
            </li>
            <li>
              <strong>Disconnect</strong> WHOOP or any connected service at any
              time, revoking our access to future data
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            7. Data Retention
          </h2>
          <p>
            We retain your data for as long as your account is active. If you
            delete your data through the app, it is permanently removed from our
            databases within 30 days. Backups older than 30 days are
            automatically purged.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            8. Medical Disclaimer
          </h2>
          <p>
            Vitalis is a wellness tool, not a medical device. It is not intended
            to diagnose, treat, cure, or prevent any disease. Always consult
            your healthcare provider before making changes to your health
            routine, medications, or supplements based on information provided
            by Vitalis.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            9. Changes to This Policy
          </h2>
          <p>
            We may update this policy from time to time. Changes will be posted
            on this page with an updated revision date.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            10. Contact
          </h2>
          <p>
            For questions about this privacy policy or your data, contact us at:{" "}
            <a
              href="mailto:jonathanperlin@gmail.com"
              className="text-emerald-400 underline underline-offset-2"
            >
              jonathanperlin@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
