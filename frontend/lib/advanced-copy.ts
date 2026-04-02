import type { AppLanguage } from "@/lib/i18n";

type CopyCard = {
  title: string;
  description: string;
};

type FlowStep = {
  title: string;
  subtitle: string;
};

export interface AdvancedCopy {
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  createBatchCta: string;
  farmerModeCta: string;
  quickActionLabel: string;
  openLabel: string;
  journeyCards: CopyCard[];
  trustTitle: string;
  trustDescription: string;
  trustCards: CopyCard[];
  shortcuts: Array<CopyCard & { href: string }>;
  flow: {
    badge: string;
    title: string;
    journeyLabel: string;
    steps: FlowStep[];
  };
}

const copyTemplate: AdvancedCopy = {
  heroBadge: "advanced.heroBadge",
  heroTitle: "advanced.heroTitle",
  heroDescription: "advanced.heroDescription",
  createBatchCta: "advanced.createBatchCta",
  farmerModeCta: "advanced.farmerModeCta",
  quickActionLabel: "advanced.quickActionLabel",
  openLabel: "advanced.openLabel",
  journeyCards: [
    {
      title: "advanced.journeyCard1Title",
      description: "advanced.journeyCard1Desc"
    },
    {
      title: "advanced.journeyCard2Title",
      description: "advanced.journeyCard2Desc"
    },
    {
      title: "advanced.journeyCard3Title",
      description: "advanced.journeyCard3Desc"
    }
  ],
  trustTitle: "advanced.trustTitle",
  trustDescription: "advanced.trustDescription",
  trustCards: [
    {
      title: "advanced.trustCard1Title",
      description: "advanced.trustCard1Desc"
    },
    {
      title: "advanced.trustCard2Title",
      description: "advanced.trustCard2Desc"
    }
  ],
  shortcuts: [
    {
      title: "advanced.shortcut1Title",
      description: "advanced.shortcut1Desc",
      href: "/create-batch"
    },
    {
      title: "advanced.shortcut2Title",
      description: "advanced.shortcut2Desc",
      href: "/add-event"
    },
    {
      title: "advanced.shortcut3Title",
      description: "advanced.shortcut3Desc",
      href: "/verify"
    }
  ],
  flow: {
    badge: "advanced.flowBadge",
    title: "advanced.flowTitle",
    journeyLabel: "advanced.flowJourneyLabel",
    steps: [
      { title: "advanced.flowStep1Title", subtitle: "advanced.flowStep1Sub" },
      { title: "advanced.flowStep2Title", subtitle: "advanced.flowStep2Sub" },
      { title: "advanced.flowStep3Title", subtitle: "advanced.flowStep3Sub" },
      { title: "advanced.flowStep4Title", subtitle: "advanced.flowStep4Sub" },
      { title: "advanced.flowStep5Title", subtitle: "advanced.flowStep5Sub" }
    ]
  }
};

export function getAdvancedCopy(_language: AppLanguage): AdvancedCopy {
  return copyTemplate;
}
