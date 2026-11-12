import type { Profile } from './types';

/**
 * Public profile data. Placeholder copy: the Content owner refines the wording.
 * Only information that is already public may live here.
 */
export const profile: Profile = {
  name: 'Abduroziq',
  fullName: 'Jabborov Abduroziq',
  email: 'hello@abduroziq.uz',
  role: { en: 'Product Engineer', uz: 'Mahsulot muhandisi' },
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
      { kind: 'text', value: "I'm " },
      { kind: 'em', value: 'Abduroziq' },
      { kind: 'capsule', id: 'portrait' },
      { kind: 'text', value: ', a Product ' },
      { kind: 'capsule', id: 'craft' },
      { kind: 'em', value: ' Engineer' },
      { kind: 'text', value: ' based in Tashkent ' },
      { kind: 'capsule', id: 'tashkent' },
    ],
    uz: [
      { kind: 'text', value: 'Ismim ' },
      { kind: 'em', value: 'Abduroziq' },
      { kind: 'capsule', id: 'portrait' },
      { kind: 'text', value: ', Toshkentda ' },
      { kind: 'capsule', id: 'tashkent' },
      { kind: 'text', value: ' yashovchi mahsulot ' },
      { kind: 'capsule', id: 'craft' },
      { kind: 'em', value: ' muhandisiman' },
    ],
  },
  support: {
    en: 'I design and build digital products end to end, from the first sketch to the last detail.',
    uz: 'Raqamli mahsulotlarni boshidan oxirigacha loyihalayman va yarataman: birinchi eskizdan oxirgi tafsilotgacha.',
  },
  about: {
    en: [
      [
        { text: 'I work where design and engineering meet. ' },
        { text: 'I like small, sharp tools', strong: true },
        { text: ' and products that feel considered.' },
      ],
      [{ text: 'This text is a placeholder and will be replaced with the real story.' }],
    ],
    uz: [
      [
        { text: 'Men dizayn va muhandislik uchrashgan joyda ishlayman. ' },
        { text: 'Kichik va aniq vositalarni', strong: true },
        { text: " hamda o'ylab yaratilgan mahsulotlarni yoqtiraman." },
      ],
      [{ text: 'Bu matn vaqtinchalik, keyinroq haqiqiy hikoya bilan almashtiriladi.' }],
    ],
  },
  facts: [
    {
      id: 'based',
      label: { en: 'Based in', uz: 'Joylashuv' },
      value: { en: 'Tashkent, Uzbekistan', uz: "Toshkent, O'zbekiston" },
    },
    {
      id: 'role',
      label: { en: 'Role', uz: 'Kasb' },
      value: { en: 'Product Engineer', uz: 'Mahsulot muhandisi' },
    },
    {
      id: 'languages',
      label: { en: 'Languages', uz: 'Tillar' },
      value: { en: 'Uzbek, English', uz: "O'zbekcha, inglizcha" },
    },
  ],
  labelStrip: {
    instructions: 'Handle with curiosity',
    role: 'Product Engineer',
    madeIn: 'Made in Uzbekistan',
  },
  desk: {
    stickyNote: 'Think beyond limits.',
    polaroidCaption: 'Tashkent, 2026',
    ticket: 'Admit one',
    keycap: 'Enter',
    pialaNote: { en: 'Tea first.', uz: 'Avval choy.' },
    cursorFlag: 'UZ',
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
