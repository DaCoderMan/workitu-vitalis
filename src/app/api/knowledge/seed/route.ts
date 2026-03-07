import { getUser } from "@/lib/auth";
import { connectDB } from "@/lib/db/connect";
import { Knowledge } from "@/lib/db/models/knowledge";

const SEED_DATA = [
  {
    category: "personal",
    title: "Identity",
    content:
      "Yonatan Perlin, Founder & CEO of Workitu Tech. Based in Kiryat Yam, Israel. Has ADHD — needs structured tasks, timers, and external accountability.",
    tags: ["identity", "adhd", "israel"],
  },
  {
    category: "business",
    title: "Revenue target",
    content:
      "Target: ₪7,000/mo revenue. Currently at ₪0. Building toward $1B by 2087. Main business is Workitu Tech — web development and AI services.",
    tags: ["revenue", "goals", "workitu"],
  },
  {
    category: "business",
    title: "Tech stack",
    content:
      "Primary stack: Next.js 16, TypeScript, Tailwind 4, shadcn/ui, MongoDB, Vercel. Also uses: Hetzner VPS (65.109.230.136), DeepSeek API, ClickUp for tasks, GitHub (DaCoderMan org).",
    tags: ["tech", "stack", "infrastructure"],
  },
  {
    category: "projects",
    title: "Deployed projects",
    content:
      "1) Ria AI (bee-ai-app.vercel.app) — admin command center. 2) Voice Translator (workitu-voice-translator.vercel.app) — real-time voice translation. 3) Bee Website (workitu-bee-site.vercel.app / blaze-post.com) — portfolio site.",
    tags: ["vercel", "projects", "deployed"],
  },
  {
    category: "finance",
    title: "Israeli financial context",
    content:
      "Key items: BTL (ביטוח לאומי) — national insurance. Arnona — municipal tax. Ma'on — daycare subsidy. Osek murshe — licensed dealer (VAT). Osek patur — exempt dealer (under threshold). Mas hachnasa — income tax.",
    tags: ["btl", "arnona", "taxes", "israel"],
  },
  {
    category: "health",
    title: "Health context",
    content:
      "Has ADHD — benefits from 15-min work blocks, body doubling, gamification, external structure. Needs regular movement breaks. Kupat holim (health fund) for medical appointments.",
    tags: ["adhd", "health", "wellness"],
  },
  {
    category: "preferences",
    title: "Communication style",
    content:
      "Prefers direct communication — answer first, explain second. No filler. Hebrew terms for Israeli-specific items. Likes gamification: XP for tasks, heat streaks for consistency.",
    tags: ["communication", "style"],
  },
  {
    category: "goals",
    title: "2026 goals",
    content:
      "1) Reach ₪7,000/mo recurring revenue. 2) Sign 3-5 paying clients for Workitu Tech. 3) Build and ship products that generate passive income. 4) Maintain health streak — regular exercise, good sleep.",
    tags: ["goals", "2026", "revenue"],
  },
  {
    category: "business",
    title: "Infrastructure",
    content:
      "VPS: Hetzner CX23 at 65.109.230.136, Ubuntu 24.04. Services running: bee-backend (Node.js:3001), n8n (:5678), nginx. Autonomous agent runs daily at 08:00 IST generating briefings.",
    tags: ["vps", "hetzner", "infrastructure"],
  },
  {
    category: "preferences",
    title: "Work patterns",
    content:
      "Works best in focused sprints. ADHD means starting is the hardest part — once in flow, very productive. Needs TOP 3 daily priorities. Revenue actions should be non-negotiable daily habit.",
    tags: ["productivity", "adhd", "habits"],
  },
];

export async function POST() {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // Only seed if knowledge base is empty
  const count = await Knowledge.countDocuments();
  if (count > 0) {
    return Response.json({
      message: "Knowledge base already has entries",
      count,
    });
  }

  await Knowledge.insertMany(SEED_DATA);

  return Response.json({
    message: "Seeded knowledge base",
    count: SEED_DATA.length,
  });
}
