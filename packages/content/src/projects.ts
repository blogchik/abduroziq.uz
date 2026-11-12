import type { Project } from './types';

/**
 * Projects shown in the "Building" section. Source: the public GitHub profile README
 * ("What I'm building" and "Open source"). Years mark the current build year, not a launch date.
 */
export const projects: Project[] = [
  {
    id: 'payzone',
    name: 'Payzone',
    year: '2026',
    description: {
      en: 'Marketplace for game top-ups and in-game currency in Uzbekistan and the CIS.',
      uz: "O'zbekiston va MDH uchun o'yin valyutalari va hisob to'ldirish platformasi.",
    },
    role: { en: 'Building and running', uz: 'Qurish va yuritish' },
    status: 'live',
    url: 'https://payzone.uz',
    colors: ['#18181B', '#E28413'],
    glyph: 'Pz',
  },
  {
    id: 'karimov-academy',
    name: 'Karimov Academy Ecosystem',
    year: '2026',
    description: {
      en: 'Website, lead API and an in-house cabinet for a trading academy.',
      uz: 'Treyding akademiyasi uchun sayt, lead API va ichki kabinet.',
    },
    role: { en: 'Engineering', uz: 'Muhandislik' },
    status: 'live',
    url: 'https://karimovacademy.uz',
    colors: ['#0B0B0B', '#D5AF6F'],
    glyph: 'KA',
  },
  {
    id: 'tavryn',
    name: 'TAVRYN',
    year: '2026',
    description: {
      en: 'A calm, premium planner for tasks, projects and your schedule. iOS first.',
      uz: 'Vazifa, loyiha va jadval uchun sokin, premium rejalashtirgich. Avval iOS.',
    },
    role: { en: 'Design and iOS', uz: 'Dizayn va iOS' },
    status: 'design',
    colors: ['#ECE8E7', '#DC6008'],
    glyph: 'Tv',
  },
  {
    id: 'ezdonation',
    name: 'EzDonation',
    year: '2026',
    description: {
      en: 'Donations and real-time stream alerts for streamers in Uzbekistan.',
      uz: "O'zbekistondagi striymerlar uchun donatlar va jonli efir bildirishnomalari.",
    },
    role: { en: 'Product planning', uz: 'Mahsulotni rejalash' },
    status: 'planned',
    colors: ['#E28413', '#18181B'],
    glyph: 'Ez',
  },
  {
    id: 'subagent-monitor',
    name: 'subagent-monitor',
    year: '2026',
    description: {
      en: 'A Claude Code mod: a live side panel for running subagents. Open source.',
      uz: 'Claude Code mod: ishlayotgan subagentlar uchun jonli yon panel. Ochiq kod.',
    },
    role: { en: 'Open source', uz: 'Ochiq kod' },
    status: 'live',
    url: 'https://github.com/blogchik/subagent-monitor',
    colors: ['#141417', '#C4B5FD'],
    glyph: 'sm',
  },
];
