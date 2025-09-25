import type { Community } from 'lemmy-js-client';
import { getClient } from '$lib/lemmy';

export async function getTopCommunities(): Promise<{
  name: string;
  icon: string | null;
  url: string;
  subscribers: number;
}[]> {
  const client = getClient();
  
  try {
    // Загружаем только локальные сообщества
    const localResponse = await client.listCommunities({
      sort: "TopAll",
      limit: 50, // Загружаем много локальных, чтобы хватило
      type_: "Local"
    });

    return localResponse.communities.map(community => ({
      name: community.community.title || community.community.name,
      icon: community.community.icon || null,
      url: `/c/${community.community.name}`,
      subscribers: community.counts.subscribers
    }));
  } catch (error) {
    console.error('Error fetching top communities:', error);
    return [];
  }
}

// Новая функция для загрузки федеративных сообществ
export async function getFederatedCommunities(): Promise<{
  name: string;
  icon: string | null;
  url: string;
  subscribers: number;
}[]> {
  const client = getClient();
  
  try {
    // Сначала загружаем локальные сообщества для исключения
    const localResponse = await client.listCommunities({
      sort: "TopAll",
      limit: 50,
      type_: "Local"
    });

    // Затем загружаем все сообщества
    const federatedResponse = await client.listCommunities({
      sort: "TopAll",
      limit: 50,
      type_: "All"
    });

    // Исключаем локальные сообщества из федеративных
    const localNames = new Set(localResponse.communities.map(c => c.community.name));
    const uniqueFederated = federatedResponse.communities.filter(community => 
      !localNames.has(community.community.name)
    );

    return uniqueFederated.map(community => ({
      name: community.community.title || community.community.name,
      icon: community.community.icon || null,
      url: `/c/${community.community.name}`,
      subscribers: community.counts.subscribers
    }));
  } catch (error) {
    console.error('Error fetching federated communities:', error);
    return [];
  }
}