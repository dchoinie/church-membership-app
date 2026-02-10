"use client";

import useSWR from "swr";

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  [key: string]: unknown;
}

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  const data = await res.json();
  return data.member;
}

export function useMember(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Member | null>(
    id ? `/api/members/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    member: data ?? null,
    isLoading,
    error,
    mutate,
  };
}
