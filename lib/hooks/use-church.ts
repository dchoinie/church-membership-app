"use client";

import useSWR from "swr";

export interface Church {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  denomination?: string | null;
  taxId?: string | null;
  is501c3?: boolean | null;
  taxStatementDisclaimer?: string | null;
  goodsServicesProvided?: boolean | null;
  goodsServicesStatement?: string | null;
  [key: string]: unknown;
}

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  const data = await res.json();
  return data.church;
}

export function useChurch(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<Church | null>(
    enabled ? "/api/church" : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    church: data ?? null,
    isLoading,
    error,
    mutate,
  };
}
