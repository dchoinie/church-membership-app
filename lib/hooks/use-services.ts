"use client";

import useSWR from "swr";

export interface Service {
  id: string;
  serviceDate: string;
  serviceType: string;
  serviceTime?: string | null;
}

interface ServicesResponse {
  services: Service[];
}

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  const data = await res.json();
  return data.services ?? [];
}

export function useServices(pageSize = 1000) {
  const key = `/api/services?pageSize=${pageSize}`;
  const { data, error, isLoading, mutate } = useSWR<Service[]>(
    key,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    services: data ?? [],
    isLoading,
    error,
    mutate,
  };
}
