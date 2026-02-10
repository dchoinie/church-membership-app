"use client";

import useSWR from "swr";

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  suffix?: string | null;
  householdId?: string | null;
  middleName?: string | null;
  maidenName?: string | null;
  title?: string | null;
  sex?: string | null;
  dateOfBirth?: string | null;
  email1?: string | null;
  email2?: string | null;
  phoneHome?: string | null;
  phoneCell1?: string | null;
  phoneCell2?: string | null;
  baptismDate?: string | null;
  confirmationDate?: string | null;
  receivedBy?: string | null;
  dateReceived?: string | null;
  removedBy?: string | null;
  dateRemoved?: string | null;
  deceasedDate?: string | null;
  membershipCode?: string | null;
  envelopeNumber?: number | null;
  participation?: string;
  createdAt?: string;
  updatedAt?: string;
  headOfHousehold?: {
    id: string;
    firstName: string;
    lastName: string;
    isCurrentMember: boolean;
  } | null;
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
