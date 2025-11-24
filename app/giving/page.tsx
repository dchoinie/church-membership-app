"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { PlusIcon, DollarSignIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
}

interface GivingRecord {
  id: string;
  memberId: string;
  amount: string;
  dateGiven: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface GivingFormData {
  envelopeNumber: string;
  amount: string;
  dateGiven: string;
  notes: string;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface MemberWithEnvelope extends Member {
  envelopeNumber: number | null;
}

export default function GivingPage() {
  const router = useRouter();
  const [allMembers, setAllMembers] = useState<MemberWithEnvelope[]>([]);
  const [envelopeNumbers, setEnvelopeNumbers] = useState<number[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [givingRecords, setGivingRecords] = useState<GivingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  });

  const form = useForm<GivingFormData>({
    defaultValues: {
      envelopeNumber: "",
      amount: "",
      dateGiven: new Date().toISOString().split("T")[0],
      notes: "",
    },
    mode: "onChange",
  });

  const selectedEnvelopeNumber = form.watch("envelopeNumber");

  // Fetch all members with envelope numbers
  const fetchMembers = async () => {
    try {
      // Fetch all members (with a large page size to get all)
      const response = await fetch("/api/members?page=1&pageSize=10000");
      if (response.ok) {
        const data = await response.json();
        const membersWithEnvelopes = (data.members || []).filter(
          (m: MemberWithEnvelope) => m.envelopeNumber !== null && m.envelopeNumber !== undefined,
        ) as MemberWithEnvelope[];
        setAllMembers(membersWithEnvelopes);
        
        // Extract unique envelope numbers and sort them
        const uniqueEnvelopeNumbers = Array.from(
          new Set(membersWithEnvelopes.map((m) => m.envelopeNumber).filter((num): num is number => num !== null))
        ).sort((a, b) => a - b);
        setEnvelopeNumbers(uniqueEnvelopeNumbers);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  // Update filtered members when envelope number changes
  useEffect(() => {
    if (selectedEnvelopeNumber) {
      const envelopeNum = parseInt(selectedEnvelopeNumber, 10);
      const membersForEnvelope = allMembers
        .filter((m) => m.envelopeNumber === envelopeNum)
        .map(({ envelopeNumber, ...member }) => member); // Remove envelopeNumber from the member object
      setFilteredMembers(membersForEnvelope);
    } else {
      setFilteredMembers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEnvelopeNumber, allMembers]);

  // Fetch giving records
  const fetchGivingRecords = async (page: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/giving?page=${page}&pageSize=50`);
      if (response.ok) {
        const data = await response.json();
        setGivingRecords(data.giving || []);
        setPagination(
          data.pagination || {
            page: 1,
            pageSize: 50,
            total: 0,
            totalPages: 0,
          },
        );
      }
    } catch (error) {
      console.error("Error fetching giving records:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchGivingRecords(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
      fetchGivingRecords(newPage);
    }
  };

  const onSubmit = async (data: GivingFormData) => {
    if (!data.envelopeNumber || !data.amount || !data.dateGiven) {
      alert("Envelope number, amount, and date are required");
      return;
    }

    const envelopeNum = parseInt(data.envelopeNumber, 10);
    const membersForEnvelope = allMembers.filter((m) => m.envelopeNumber === envelopeNum);

    if (membersForEnvelope.length === 0) {
      alert("No members found for this envelope number");
      return;
    }

    setSubmitting(true);
    try {
      // Create giving records for all members with this envelope number
      const promises = membersForEnvelope.map((member) =>
        fetch("/api/giving", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberId: member.id,
            amount: parseFloat(data.amount),
            dateGiven: data.dateGiven,
            notes: data.notes || null,
          }),
        })
      );

      const responses = await Promise.all(promises);
      const errors = [];

      for (let i = 0; i < responses.length; i++) {
        if (!responses[i].ok) {
          const error = await responses[i].json();
          errors.push(`${membersForEnvelope[i].firstName} ${membersForEnvelope[i].lastName}: ${error.error || "Failed"}`);
        }
      }

      if (errors.length > 0) {
        alert(`Some records failed to create:\n${errors.join("\n")}`);
      } else {
        setDialogOpen(false);
        form.reset({
          envelopeNumber: "",
          amount: "",
          dateGiven: new Date().toISOString().split("T")[0],
          notes: "",
        });
        setFilteredMembers([]);
        // Refresh the giving records list
        await fetchGivingRecords(currentPage);
      }
    } catch (error) {
      console.error("Error creating giving records:", error);
      alert("Failed to create giving records");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      const parts = dateString.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const localDate = new Date(year, month, day);
        return format(localDate, "MMM d, yyyy");
      }
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Giving</h1>
          <p className="text-muted-foreground mt-2">
            Track weekly giving amounts for members
          </p>
        </div>
        <Dialog 
          open={dialogOpen} 
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              // Reset form and filtered members when dialog closes
              form.reset({
                envelopeNumber: "",
                amount: "",
                dateGiven: new Date().toISOString().split("T")[0],
                notes: "",
              });
              setFilteredMembers([]);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="cursor-pointer">
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Giving Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Giving Record</DialogTitle>
              <DialogDescription>
                Enter the giving amount by selecting an envelope number. The amount will be applied to all members associated with that envelope number.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="envelopeNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Envelope Number *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select envelope number" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {envelopeNumbers.map((envelopeNum) => (
                            <SelectItem key={envelopeNum} value={envelopeNum.toString()}>
                              {envelopeNum}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {selectedEnvelopeNumber && filteredMembers.length > 0 && (
                  <div>
                    <FormLabel className="text-sm font-medium">Members Associated with Envelope {selectedEnvelopeNumber}</FormLabel>
                    <div className="mt-2 space-y-2 p-4 bg-muted rounded-md">
                      {filteredMembers.map((member) => (
                        <div key={member.id} className="text-sm">
                          {member.firstName} {member.lastName}
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground mt-2">
                        Giving amount will be applied to all {filteredMembers.length} member{filteredMembers.length !== 1 ? "s" : ""} listed above.
                      </p>
                    </div>
                  </div>
                )}
                {selectedEnvelopeNumber && filteredMembers.length === 0 && (
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">
                      No members found for envelope number {selectedEnvelopeNumber}.
                    </p>
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateGiven"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Given *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} placeholder="Optional notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Creating..." : "Create Record"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Giving Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading giving records...
            </div>
          ) : givingRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No giving records found. Add your first giving record to get started.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date Given</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {givingRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/giving/${record.memberId}`}
                          className="text-primary hover:underline"
                        >
                          {record.member.firstName} {record.member.lastName}
                        </Link>
                      </TableCell>
                      <TableCell>{formatCurrency(record.amount)}</TableCell>
                      <TableCell>{formatDate(record.dateGiven)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {record.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {pagination.totalPages > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="text-sm text-muted-foreground text-center">
                    Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{" "}
                    {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
                    {pagination.total} records
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(currentPage - 1);
                          }}
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>

                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
                        (pageNum) => {
                          const showPage =
                            pageNum === 1 ||
                            pageNum === pagination.totalPages ||
                            (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);

                          if (!showPage) {
                            if (
                              pageNum === currentPage - 2 ||
                              pageNum === currentPage + 2
                            ) {
                              return (
                                <PaginationItem key={pageNum}>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }
                            return null;
                          }

                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handlePageChange(pageNum);
                                }}
                                isActive={pageNum === currentPage}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                      )}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(currentPage + 1);
                          }}
                          className={
                            currentPage === pagination.totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

