"use client";

import useSWR from "swr";

export interface IndividualMember {
  id: string;
  householdId: string | null;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  suffix?: string | null;
  dateOfBirth?: string | null;
  email1?: string | null;
  phoneHome?: string | null;
  phoneCell1?: string | null;
  participation: string;
  household?: { id: string; name: string | null } | null;
}

export interface IndividualMemberFilters {
  q?: string;
  participation?: string[];
  sex?: string[];
  sequence?: string[];
  householdId?: string;
  householdName?: string;
}

interface IndividualMembersResponse {
  members: IndividualMember[];
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

function buildIndividualMembersKey(
  page: number,
  pageSize: number,
  filters?: IndividualMemberFilters
): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (filters) {
    if (filters.q) params.set("q", filters.q);
    if (filters.participation?.length) params.set("participation", filters.participation.join(","));
    if (filters.sex?.length) params.set("sex", filters.sex.join(","));
    if (filters.sequence?.length) params.set("sequence", filters.sequence.join(","));
    if (filters.householdId) params.set("householdId", filters.householdId);
    if (filters.householdName) params.set("householdName", filters.householdName);
  }
  return `/api/membership/members?${params.toString()}`;
}

export function useIndividualMembers(
  page = 1,
  pageSize = 50,
  filters?: IndividualMemberFilters
) {
  const key = buildIndividualMembersKey(page, pageSize, filters);
  const { data, error, isLoading, mutate } =
    useSWR<IndividualMembersResponse>(key, fetcher, {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    });

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
