"use client";

import useSWR from "swr";

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  envelopeNumber?: number | null;
  [key: string]: unknown;
}

interface MembersResponse {
  members: Member[];
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
    members: data.members ?? [],
    pagination: data.pagination,
  };
}

export function useMembers(options?: { page?: number; pageSize?: number }) {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 10000;
  const key = `/api/members?page=${page}&pageSize=${pageSize}`;
  const { data, error, isLoading, mutate } = useSWR<MembersResponse>(
    key,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    members: data?.members ?? [],
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
