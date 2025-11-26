"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { PlusIcon, UploadIcon, DownloadIcon, FileTextIcon } from "lucide-react";
import Link from "next/link";

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
  const [allMembers, setAllMembers] = useState<MemberWithEnvelope[]>([]);
  const [envelopeNumbers, setEnvelopeNumbers] = useState<number[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [givingRecords, setGivingRecords] = useState<GivingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [csvPreview, setCsvPreview] = useState<Array<Record<string, string>> | null>(null);
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
        .map((m) => ({
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
        }));
      setFilteredMembers(membersForEnvelope);
    } else {
      setFilteredMembers([]);
    }
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

  // CSV parsing function (same as API)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  // Download example CSV
  const downloadExampleCSV = () => {
    const exampleData = [
      ["Envelope Number", "Amount", "Date Given", "Notes"],
      ["1", "50.00", "2024-01-15", "Weekly offering"],
      ["2", "100.00", "2024-01-15", ""],
      ["3", "25.50", "2024-01-22", "Special donation"],
    ];

    const csvContent = exampleData.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "giving-import-example.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Handle file selection and preview
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        alert("Please select a CSV file");
        return;
      }
      setImportFile(file);
      setImportResults(null);
      setCsvPreview(null);

      // Parse and preview CSV
      try {
        const text = await file.text();
        const lines = text.split("\n").filter((line) => line.trim());
        
        if (lines.length < 2) {
          alert("CSV file must have at least a header row and one data row");
          return;
        }

        const headers = parseCSVLine(lines[0]);
        const preview: Array<Record<string, string>> = [];

        // Preview first 5 rows
        for (let i = 1; i < Math.min(6, lines.length); i++) {
          const values = parseCSVLine(lines[i]);
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header.trim()] = values[index]?.trim() || "";
          });
          preview.push(row);
        }

        setCsvPreview(preview);
      } catch (error) {
        console.error("Error parsing CSV:", error);
        alert("Error parsing CSV file. Please check the format.");
      }
    }
  };

  // Handle bulk import
  const handleBulkImport = async () => {
    if (!importFile) {
      alert("Please select a CSV file");
      return;
    }

    setImporting(true);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const response = await fetch("/api/giving/bulk-import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setImportResults({
          success: data.success || 0,
          failed: data.failed || 0,
          errors: data.errors || [],
        });
        // Refresh the giving records list
        await fetchGivingRecords(currentPage);
        // Clear file input
        const fileInput = document.getElementById("csv-file-input") as HTMLInputElement;
        if (fileInput) {
          fileInput.value = "";
        }
      } else {
        alert(data.error || "Failed to import giving records");
      }
    } catch (error) {
      console.error("Error importing giving records:", error);
      alert("Failed to import giving records. Please try again.");
    } finally {
      setImporting(false);
    }
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
        <div className="flex gap-2">
          <Dialog
            open={bulkImportDialogOpen}
            onOpenChange={(open) => {
              setBulkImportDialogOpen(open);
              if (!open) {
                setImportFile(null);
                setImportResults(null);
                setCsvPreview(null);
                const fileInput = document.getElementById("csv-file-input") as HTMLInputElement;
                if (fileInput) {
                  fileInput.value = "";
                }
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="cursor-pointer">
                <UploadIcon className="mr-2 h-4 w-4" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bulk Import Giving Records</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to import multiple giving records at once. The CSV should include envelope numbers (or member IDs), amounts, dates, and optional notes.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-md">
                  <div className="flex items-center gap-2">
                    <FileTextIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">CSV Format Requirements</p>
                      <p className="text-xs text-muted-foreground">
                        Required columns: Envelope Number (or Member ID), Amount, Date Given (YYYY-MM-DD)
                        <br />
                        Optional columns: Notes
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadExampleCSV}
                    className="cursor-pointer"
                  >
                    <DownloadIcon className="mr-2 h-4 w-4" />
                    Download Example
                  </Button>
                </div>

                <div>
                  <label htmlFor="csv-file-input" className="block text-sm font-medium mb-2">
                    Select CSV File
                  </label>
                  <Input
                    id="csv-file-input"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    disabled={importing}
                  />
                </div>

                {csvPreview && csvPreview.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Preview (first 5 rows):</p>
                    <div className="border rounded-md overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {Object.keys(csvPreview[0]).map((header) => (
                              <TableHead key={header}>{header}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvPreview.map((row, idx) => (
                            <TableRow key={idx}>
                              {Object.values(row).map((value, cellIdx) => (
                                <TableCell key={cellIdx}>{value || "-"}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {importResults && (
                  <div className={`p-4 rounded-md ${importResults.failed > 0 ? "bg-destructive/10" : "bg-green-500/10"}`}>
                    <p className={`text-sm font-medium mb-2 ${importResults.failed > 0 ? "text-destructive" : "text-green-600"}`}>
                      Import Results: {importResults.success} successful, {importResults.failed} failed
                    </p>
                    {importResults.errors.length > 0 && (
                      <div className="max-h-40 overflow-y-auto">
                        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                          {importResults.errors.slice(0, 10).map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                          {importResults.errors.length > 10 && (
                            <li>... and {importResults.errors.length - 10} more errors</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBulkImportDialogOpen(false)}
                    disabled={importing}
                    className="cursor-pointer"
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    onClick={handleBulkImport}
                    disabled={!importFile || importing}
                    className="cursor-pointer"
                  >
                    {importing ? "Importing..." : "Import Records"}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
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
                      className="cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting} className="cursor-pointer">
                      {submitting ? "Creating..." : "Create Record"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
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

