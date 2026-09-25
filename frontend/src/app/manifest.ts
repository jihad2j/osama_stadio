import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Osama Studio · استوديو أسامة',
    short_name: 'Osama Studio',
    description: 'استوديو أسامة الذكي لصناعة ونشر الفيديوهات القصيرة بالذكاء الاصطناعي',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f0f0f',
    theme_color: '#0f0f0f',
    icons: [
      {
        src: '/studio-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
