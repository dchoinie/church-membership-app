"use client";

import useSWR from "swr";

export interface AttendanceMember {
  id: string;
  firstName: string;
  lastName: string;
}

interface AttendanceMembersResponse {
  members: AttendanceMember[];
}

export interface ServiceWithStats {
  serviceId: string;
  serviceDate: string;
  serviceType: string;
  serviceTime?: string | null;
  createdAt: string;
  updatedAt: string;
  attendeesCount: number;
  communionCount: number;
}

interface AttendanceServicesResponse {
  services: ServiceWithStats[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

async function membersFetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  const data = await res.json();
  return { members: data.members ?? [] };
}

async function servicesFetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  const data = await res.json();
  return {
    services: data.services ?? [],
    pagination: data.pagination ?? {
      page: 1,
      pageSize: 50,
      total: 0,
      totalPages: 0,
    },
  };
}

const EMPTY_MEMBERS: AttendanceMember[] = [];

export function useAttendanceMembers(options?: { includeInactive?: boolean; enabled?: boolean }) {
  const includeInactive = options?.includeInactive ?? false;
  const enabled = options?.enabled ?? true;
  const key = enabled
    ? includeInactive
      ? "/api/attendance/members?includeInactive=true"
      : "/api/attendance/members"
    : null;
  const { data, error, isLoading, mutate } = useSWR<AttendanceMembersResponse>(
    key,
    membersFetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    members: data?.members ?? EMPTY_MEMBERS,
    isLoading,
    error,
    mutate,
  };
}

export interface ServiceAttendanceRecord {
  id: string;
  memberId: string;
  serviceId: string;
  attended: boolean;
  tookCommunion: boolean;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    membershipCode?: string | null;
  };
  service: {
    id: string;
    serviceDate: string;
    serviceType: string;
  };
}

interface ServiceAttendanceResponse {
  service: { id: string; serviceDate: string; serviceType: string };
  attendance: ServiceAttendanceRecord[];
}

export function useServiceAttendance(serviceId: string | null) {
  const key = serviceId ? `/api/attendance/service/${serviceId}` : null;
  const { data, error, isLoading, mutate } = useSWR<ServiceAttendanceResponse>(
    key,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) throw new Error("NOT_FOUND");
        throw new Error("Failed to fetch");
      }
      const d = await res.json();
      return {
        service: d.service,
        attendance: d.attendance ?? [],
      };
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    service: data?.service ?? null,
    attendance: data?.attendance ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function useAttendanceServices(page = 1, pageSize = 50) {
  const key = `/api/attendance/services?page=${page}&pageSize=${pageSize}`;
  const { data, error, isLoading, mutate } = useSWR<AttendanceServicesResponse>(
    key,
    servicesFetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    services: data?.services ?? [],
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
