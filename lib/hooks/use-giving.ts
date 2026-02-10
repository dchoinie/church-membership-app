"use client";

import useSWR from "swr";

export interface GivingItem {
  categoryId: string;
  categoryName: string;
  amount: string;
}

export interface GivingRecord {
  id: string;
  memberId: string;
  serviceId: string | null;
  dateGiven: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: GivingItem[];
  member: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface GivingResponse {
  giving: GivingRecord[];
  pagination: {
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
    giving: data.giving ?? [],
    pagination: data.pagination ?? {
      page: 1,
      pageSize: 50,
      total: 0,
      totalPages: 0,
    },
  };
}

export function useGiving(page = 1, pageSize = 50) {
  const key = `/api/giving?page=${page}&pageSize=${pageSize}`;
  const { data, error, isLoading, mutate } = useSWR<GivingResponse>(
    key,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    giving: data?.giving ?? [],
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

export function useMemberGiving(memberId: string | null) {
  const key = memberId ? `/api/giving/member/${memberId}` : null;
  const { data, error, isLoading, mutate } = useSWR<{ giving: GivingRecord[] }>(
    key,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const d = await res.json();
      return { giving: d.giving ?? [] };
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    giving: data?.giving ?? [],
    isLoading,
    error,
    mutate,
  };
}
