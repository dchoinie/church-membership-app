"use client";

import useSWR from "swr";

export interface HouseholdMember {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  suffix?: string | null;
  preferredName?: string | null;
  email1?: string | null;
  phoneHome?: string | null;
  phoneCell1?: string | null;
  participation?: string;
  envelopeNumber?: number | null;
  dateOfBirth?: string | null;
  sex?: string | null;
}

export interface Household {
  id: string;
  name: string | null;
  type: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  isNonHousehold?: boolean;
  personAssigned?: string | null;
  ministryGroup?: string | null;
  alternateAddressBegin?: string | null;
  alternateAddressEnd?: string | null;
  weddingAnniversaryDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
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
