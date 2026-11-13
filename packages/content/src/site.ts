import type { Profile } from './types';

/**
 * Public profile data. Only information that is already public may live here
 * (source: the public GitHub profile README and repository descriptions).
 */
export const profile: Profile = {
  name: 'Abduroziq',
  fullName: 'Jabborov Abduroziq',
  email: 'hello@abduroziq.uz',
  role: { en: 'Product Engineer', uz: 'Product Engineer' },
  tagline: 'Think beyond limits.',
  location: {
    city: { en: 'Tashkent', uz: 'Toshkent' },
    country: { en: 'Uzbekistan', uz: "O'zbekiston" },
    lat: 41.2995,
    lon: 69.2401,
    timeZone: 'Asia/Tashkent',
  },
  sentence: {
    en: [
      { kind: 'text', value: "I'm Abduroziq" },
      { kind: 'eyes' },
      // The no-break spaces keep "from Figma to" together: too long to end the second line
      // on a desktop, so the last line starts with "from".
      {
        kind: 'text',
        value:
          ', a product engineer designing and building products, from\u00a0Figma\u00a0to production.',
      },
    ],
    uz: [
      { kind: 'text', value: 'Men Abduroziq' },
      { kind: 'eyes' },
      {
        kind: 'text',
        value:
          ", product engineerman: mahsulotni Figma'dan production'gacha loyihalayman va quraman.",
      },
    ],
  },
  summary: {
    en: 'I design and build products, from Figma to production.',
    uz: "Mahsulotlarni loyihalayman va quraman: Figma'dan production'gacha.",
  },
  about: {
    en: [
      [
        { text: "I'm a " },
        { text: 'product engineer from Tashkent', strong: true },
        { text: '. I take products from ' },
        { text: 'the first sketch in Figma', strong: true },
        { text: ' to ' },
        { text: 'a running system in production', strong: true },
        {
          text: ': interfaces, design systems, web apps, backends, infrastructure and Telegram bots. Right now I am building ',
        },
        { text: 'Payzone', strong: true },
        { text: ' and designing ' },
        { text: 'TAVRYN', strong: true },
        { text: ', a calm planner for iOS. I ' },
        { text: 'work with AI agents every day', strong: true },
        { text: ', and I am open to interesting product collaborations.' },
      ],
    ],
    uz: [
      [
        { text: 'Men toshkentlik ' },
        { text: 'product engineerman', strong: true },
        { text: ". Mahsulotni Figma'dagi " },
        { text: 'birinchi eskizdan', strong: true },
        { text: ' tortib ' },
        { text: "production'da ishlab turgan tizimgacha", strong: true },
        {
          text: ' olib boraman: interfeys, dizayn tizimlari, veb-ilovalar, backend, infratuzilma va Telegram botlar. Hozir ',
        },
        { text: 'Payzone', strong: true },
        { text: "'ni quryapman, iOS uchun sokin rejalashtirgich " },
        { text: 'TAVRYN', strong: true },
        { text: "'ni esa loyihalayapman. " },
        { text: 'AI agentlar bilan har kuni ishlayman', strong: true },
        { text: ', qiziqarli mahsulotlar ustida hamkorlikka ham ochiqman.' },
      ],
    ],
  },
  facts: [
    {
      id: 'role',
      label: { en: 'Role', uz: 'Kasb' },
      value: { en: 'Product Engineer', uz: 'Product Engineer' },
    },
    {
      id: 'based',
      label: { en: 'Based in', uz: 'Joylashuv' },
      value: { en: 'Tashkent, Uzbekistan', uz: "Toshkent, O'zbekiston" },
    },
    {
      id: 'focus',
      label: { en: 'Focus', uz: "Yo'nalish" },
      value: {
        en: 'Design systems, web apps, backends',
        uz: 'Dizayn tizimlari, veb-ilovalar, backend',
      },
    },
    {
      id: 'stack',
      label: { en: 'Stack', uz: 'Texnologiyalar' },
      value: {
        en: 'Next.js, FastAPI, NestJS, Kubernetes, Swift',
        uz: 'Next.js, FastAPI, NestJS, Kubernetes, Swift',
      },
    },
    {
      id: 'now',
      label: { en: 'Now', uz: 'Hozir' },
      value: { en: 'Payzone, TAVRYN', uz: 'Payzone, TAVRYN' },
    },
  ],
  agentTag: 'AI agent',
  desk: {
    stickyNote: 'Think beyond limits.',
    polaroidCaption: 'Tashkent, UZ',
    pialaNote: { en: 'click to refill', uz: 'bosing, choy quyiladi' },
  },
  socials: [
    { id: 'github', label: 'GitHub', handle: 'blogchik', href: 'https://github.com/blogchik' },
    {
      id: 'telegram',
      label: 'Telegram',
      handle: 'JabborovAbduroziq',
      href: 'https://t.me/JabborovAbduroziq',
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      handle: 'jabborovabduroziq',
      href: 'https://linkedin.com/in/jabborovabduroziq',
    },
    {
      id: 'instagram',
      label: 'Instagram',
      handle: 'jabborov.abduroziq',
      href: 'https://instagram.com/jabborov.abduroziq',
    },
  ],
};
