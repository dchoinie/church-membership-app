"use client";

import useSWR from "swr";

export interface HouseholdMember {
  firstName: string;
  lastName: string;
}

export interface Household {
  id: string;
  name: string | null;
  type: string | null;
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  memberCount: number;
  members: HouseholdMember[];
}

export interface HouseholdFilters {
  q?: string;
  type?: string;
  city?: string;
  state?: string;
  minMembers?: number;
  maxMembers?: number;
}

interface HouseholdsResponse {
  households: Household[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  const data = await res.json();
  return {
    households: data.households ?? [],
    pagination: data.pagination,
  };
}

function buildHouseholdsKey(page: number, pageSize: number, filters?: HouseholdFilters): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (filters) {
    if (filters.q) params.set("q", filters.q);
    if (filters.type) params.set("type", filters.type);
    if (filters.city) params.set("city", filters.city);
    if (filters.state) params.set("state", filters.state);
    if (filters.minMembers != null) params.set("minMembers", String(filters.minMembers));
    if (filters.maxMembers != null) params.set("maxMembers", String(filters.maxMembers));
  }
  return `/api/families?${params.toString()}`;
}

export function useHouseholds(page = 1, pageSize = 50, filters?: HouseholdFilters) {
  const key = buildHouseholdsKey(page, pageSize, filters);
  const { data, error, isLoading, mutate } = useSWR<HouseholdsResponse>(
    key,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    households: data?.households ?? [],
    pagination: data?.pagination ?? {
      page: 1,
      pageSize,
      total: 0,
      totalPages: 0,
    },
    isLoading,
    error,
    mutate,
  };
}
