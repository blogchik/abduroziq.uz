import type { Project } from './types';

/** Placeholder projects. The Content owner replaces them with real, public work. */
export const projects: Project[] = [
  {
    id: 'abduroziq-uz',
    name: 'abduroziq.uz',
    year: '2026',
    description: {
      en: 'This website: a bilingual personal site and blog, built as a static Astro monorepo.',
      uz: 'Mazkur sayt: ikki tilli shaxsiy sayt va blog, statik Astro monorepo sifatida qurilgan.',
    },
    role: { en: 'Design and engineering', uz: 'Dizayn va muhandislik' },
    status: 'design',
    url: 'https://abduroziq.uz',
    colors: ['#E28413', '#141310'],
    glyph: 'az',
  },
  {
    id: 'next-project',
    name: 'Next project',
    year: '2026',
    description: {
      en: 'Placeholder for the next thing worth building.',
      uz: "Navbatdagi qurishga arziydigan narsa uchun o'rin.",
    },
    role: { en: 'Product engineering', uz: 'Mahsulot muhandisligi' },
    status: 'planned',
    colors: ['#141310', '#ECEAE5'],
    glyph: '+',
  },
];
