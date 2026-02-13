"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Loader2, ArrowLeft } from "lucide-react";

interface Church {
  id: string;
  name: string;
  subdomain: string;
  subscriptionStatus: string;
  subscriptionPlan: string;
  trialEndsAt: string | null;
  createdAt: string;
  memberCount: number;
  canceledAt: string | null;
  admins: string[];
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function AdminChurchesPage() {
  const router = useRouter();
  const [churches, setChurches] = useState<Church[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchChurches(page);
  }, [page]);

  const fetchChurches = async (pageNum: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/admin/churches?page=${pageNum}&pageSize=50`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch churches");
      }
      const data = await response.json();
      setChurches(data.churches);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load churches");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      active: "default",
      canceled: "destructive",
      past_due: "destructive",
      unpaid: "destructive",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading && churches.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Churches</h1>
          <p className="text-muted-foreground mt-2">
            Manage all churches in the system. Click a row to view details.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Church Name</TableHead>
                <TableHead>Subdomain</TableHead>
                <TableHead>Admin(s)</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Date Cancelled</TableHead>
                <TableHead className="text-right">Members</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {churches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No churches found
                  </TableCell>
                </TableRow>
              ) : (
                churches.map((church) => (
                  <TableRow
                    key={church.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/admin/churches/${church.id}`)}
                  >
                    <TableCell className="font-medium">{church.name}</TableCell>
                    <TableCell>{church.subdomain}</TableCell>
                    <TableCell>
                      <span className="max-w-[200px] truncate block">
                        {church.admins.length > 0
                          ? church.admins.join(", ")
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(church.createdAt)}</TableCell>
                    <TableCell>{getStatusBadge(church.subscriptionStatus)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{church.subscriptionPlan}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(church.canceledAt)}</TableCell>
                    <TableCell className="text-right">
                      {church.memberCount}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) setPage(page - 1);
                }}
                className={
                  page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                }
              />
            </PaginationItem>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter((p) => {
                return (
                  p === 1 ||
                  p === pagination.totalPages ||
                  Math.abs(p - page) <= 1
                );
              })
              .reduce<React.ReactNode[]>((acc, p, idx, arr) => {
                if (idx > 0 && arr[idx - 1] !== p - 1) {
                  acc.push(
                    <PaginationItem key={`ellipsis-${p}`}>
                      <span className="px-2">…</span>
                    </PaginationItem>
                  );
                }
                acc.push(
                  <PaginationItem key={p}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(p);
                      }}
                      isActive={p === page}
                      className="cursor-pointer"
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                );
                return acc;
              }, [])}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page < pagination.totalPages) setPage(page + 1);
                }}
                className={
                  page >= pagination.totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
