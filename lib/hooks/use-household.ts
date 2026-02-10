"use client";

import useSWR from "swr";

export interface HouseholdMember {
  id: string;
  firstName: string;
  lastName: string;
  [key: string]: unknown;
}

export interface Household {
  id: string;
  name: string | null;
  type: string | null;
  [key: string]: unknown;
}

interface HouseholdResponse {
  household: Household;
  members: HouseholdMember[];
}

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  const data = await res.json();
  return {
    household: data.household,
    members: data.members ?? [],
  };
}

export function useHousehold(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<HouseholdResponse>(
    id ? `/api/families/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    household: data?.household ?? null,
    members: data?.members ?? [],
    isLoading,
    error,
    mutate,
  };
}
