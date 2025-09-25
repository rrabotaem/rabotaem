export interface Community {
  name: string;
  icon: string;
  members: number;
  url: string;
}

export const popularCommunities: Community[] = [
  {
    name: 'Пилим стартапы',
    icon: '/communities/programming.webp',
    members: 0,
    url: '/c/startupguide'
  },
  {
    name: 'Маркетинг',
    icon: '/communities/gaming.webp',
    members: 0,
    url: '/c/marketing'
  },
  {
    name: 'Трибуна',
    icon: '/communities/tribuna.webp',
    members: 0,
    url: '/c/tribuna'
  },
  {
    name: 'Кейсы',
    icon: '/communities/science.webp',
    members: 0,
    url: '/c/cases'
  },
  {
    name: 'Сервисы',
    icon: '/communities/music.webp',
    members: 0,
    url: '/c/services'
  }
]; 