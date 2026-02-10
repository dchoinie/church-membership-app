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

export function useHouseholds(page = 1, pageSize = 50) {
  const key = `/api/families?page=${page}&pageSize=${pageSize}`;
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
