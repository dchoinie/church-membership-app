"use client";

import useSWR from "swr";

export interface GivingCategory {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CategoriesResponse {
  categories: GivingCategory[];
}

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  const data = await res.json();
  return data.categories ?? [];
}

export function useGivingCategories(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<GivingCategory[]>(
    enabled ? "/api/giving-categories" : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    categories: data ?? [],
    isLoading,
    error,
    mutate,
  };
}
