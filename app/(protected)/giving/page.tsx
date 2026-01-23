"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { PlusIcon, UploadIcon, DownloadIcon, FileTextIcon, TableIcon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { usePermissions } from "@/lib/hooks/use-permissions";

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
  currentAmount: string | null;
  missionAmount: string | null;
  memorialsAmount: string | null;
  debtAmount: string | null;
  schoolAmount: string | null;
  miscellaneousAmount: string | null;
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
  currentAmount: string;
  missionAmount: string;
  memorialsAmount: string;
  debtAmount: string;
  schoolAmount: string;
  miscellaneousAmount: string;
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
  const { canEditGiving } = usePermissions();
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
  const [bulkInputDialogOpen, setBulkInputDialogOpen] = useState(false);
  const [bulkInputRows, setBulkInputRows] = useState<Array<{
    envelopeNumber: string;
    dateGiven: string;
    currentAmount: string;
    missionAmount: string;
    memorialsAmount: string;
    debtAmount: string;
    schoolAmount: string;
    miscellaneousAmount: string;
  }>>(Array.from({ length: 3 }, () => ({
    envelopeNumber: "",
    dateGiven: new Date().toISOString().split("T")[0],
    currentAmount: "",
    missionAmount: "",
    memorialsAmount: "",
    debtAmount: "",
    schoolAmount: "",
    miscellaneousAmount: "",
  })));
  const [bulkInputSubmitting, setBulkInputSubmitting] = useState(false);
  const [bulkInputResults, setBulkInputResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
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
      currentAmount: "",
      missionAmount: "",
      memorialsAmount: "",
      debtAmount: "",
      schoolAmount: "",
      miscellaneousAmount: "",
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

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await fetch("/api/csrf-token");
        if (response.ok) {
          const data = await response.json();
          setCsrfToken(data.token);
        }
      } catch (err) {
        console.error("Failed to fetch CSRF token:", err);
      }
    };
    fetchCsrfToken();
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
      fetchGivingRecords(newPage);
    }
  };

  const onSubmit = async (data: GivingFormData) => {
    if (!data.envelopeNumber || !data.dateGiven) {
      alert("Envelope number and date are required");
      return;
    }

    // Validate at least one amount is provided
    const current = data.currentAmount ? parseFloat(data.currentAmount) : null;
    const mission = data.missionAmount ? parseFloat(data.missionAmount) : null;
    const memorials = data.memorialsAmount ? parseFloat(data.memorialsAmount) : null;
    const debt = data.debtAmount ? parseFloat(data.debtAmount) : null;
    const school = data.schoolAmount ? parseFloat(data.schoolAmount) : null;
    const miscellaneous = data.miscellaneousAmount ? parseFloat(data.miscellaneousAmount) : null;

    if (!current && !mission && !memorials && !debt && !school && !miscellaneous) {
      alert("At least one amount is required");
      return;
    }

    const envelopeNum = parseInt(data.envelopeNumber, 10);
    const membersForEnvelope = allMembers.filter((m) => m.envelopeNumber === envelopeNum);

    if (membersForEnvelope.length === 0) {
      alert("No members found for this envelope number");
      return;
    }

    if (!csrfToken) {
      alert("CSRF token not loaded. Please refresh the page and try again.");
      return;
    }

    setSubmitting(true);
    try {
      // Create a single giving record for the envelope number (household level)
      // The API will automatically find the head of household
      const response = await fetch("/api/giving", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          envelopeNumber: envelopeNum,
          currentAmount: current,
          missionAmount: mission,
          memorialsAmount: memorials,
          debtAmount: debt,
          schoolAmount: school,
          miscellaneousAmount: miscellaneous,
          dateGiven: data.dateGiven,
          notes: data.notes || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to create giving record: ${error.error || "Unknown error"}`);
        return;
      }

      setDialogOpen(false);
      form.reset({
        envelopeNumber: "",
        currentAmount: "",
        missionAmount: "",
        memorialsAmount: "",
        debtAmount: "",
        schoolAmount: "",
        miscellaneousAmount: "",
        dateGiven: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setFilteredMembers([]);
      // Refresh the giving records list
      await fetchGivingRecords(currentPage);
    } catch (error) {
      console.error("Error creating giving record:", error);
      alert("Failed to create giving record");
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

  const formatCurrency = (amount: string | null | undefined) => {
    const num = parseFloat(amount || "0");
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const calculateTotal = (
    current: string | null,
    mission: string | null,
    memorials: string | null,
    debt: string | null,
    school: string | null,
    miscellaneous: string | null
  ): number => {
    const curr = parseFloat(current || "0") || 0;
    const miss = parseFloat(mission || "0") || 0;
    const mem = parseFloat(memorials || "0") || 0;
    const deb = parseFloat(debt || "0") || 0;
    const sch = parseFloat(school || "0") || 0;
    const misc = parseFloat(miscellaneous || "0") || 0;
    return curr + miss + mem + deb + sch + misc;
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

  // Handle bulk input
  const handleBulkInput = async () => {
    // Validate all rows
    const errors: string[] = [];
    const validRecords: Array<{
      envelopeNumber: number;
      dateGiven: string;
      currentAmount: number | null;
      missionAmount: number | null;
      memorialsAmount: number | null;
      debtAmount: number | null;
      schoolAmount: number | null;
      miscellaneousAmount: number | null;
      notes?: string | null;
    }> = [];

    bulkInputRows.forEach((row, index) => {
      // Skip empty rows (rows with no envelope number and no amounts filled in)
      // Note: dateGiven is always set by default, so we check if envelopeNumber and all amounts are empty
      const hasEnvelope = row.envelopeNumber && row.envelopeNumber.trim() !== "";
      const hasAnyAmount = row.currentAmount || row.missionAmount || row.memorialsAmount || 
                          row.debtAmount || row.schoolAmount || row.miscellaneousAmount;
      
      if (!hasEnvelope && !hasAnyAmount) {
        return; // Skip completely empty rows
      }

      // Validate required fields
      if (!row.envelopeNumber) {
        errors.push(`Row ${index + 1}: Envelope number is required`);
        return;
      }

      if (!row.dateGiven) {
        errors.push(`Row ${index + 1}: Date is required`);
        return;
      }

      const envelopeNum = parseInt(row.envelopeNumber, 10);
      if (isNaN(envelopeNum)) {
        errors.push(`Row ${index + 1}: Invalid envelope number`);
        return;
      }

      // Check if envelope exists
      const envelopeExists = envelopeNumbers.includes(envelopeNum);
      if (!envelopeExists) {
        errors.push(`Row ${index + 1}: No members found for envelope number ${envelopeNum}`);
        return;
      }

      // Parse amounts
      const current = row.currentAmount ? parseFloat(row.currentAmount) : null;
      const mission = row.missionAmount ? parseFloat(row.missionAmount) : null;
      const memorials = row.memorialsAmount ? parseFloat(row.memorialsAmount) : null;
      const debt = row.debtAmount ? parseFloat(row.debtAmount) : null;
      const school = row.schoolAmount ? parseFloat(row.schoolAmount) : null;
      const miscellaneous = row.miscellaneousAmount ? parseFloat(row.miscellaneousAmount) : null;

      // Validate at least one amount
      if (!current && !mission && !memorials && !debt && !school && !miscellaneous) {
        errors.push(`Row ${index + 1}: At least one amount is required`);
        return;
      }

      // Validate amounts are non-negative
      if (current !== null && (isNaN(current) || current < 0)) {
        errors.push(`Row ${index + 1}: Invalid current amount`);
        return;
      }
      if (mission !== null && (isNaN(mission) || mission < 0)) {
        errors.push(`Row ${index + 1}: Invalid mission amount`);
        return;
      }
      if (memorials !== null && (isNaN(memorials) || memorials < 0)) {
        errors.push(`Row ${index + 1}: Invalid memorials amount`);
        return;
      }
      if (debt !== null && (isNaN(debt) || debt < 0)) {
        errors.push(`Row ${index + 1}: Invalid debt amount`);
        return;
      }
      if (school !== null && (isNaN(school) || school < 0)) {
        errors.push(`Row ${index + 1}: Invalid school amount`);
        return;
      }
      if (miscellaneous !== null && (isNaN(miscellaneous) || miscellaneous < 0)) {
        errors.push(`Row ${index + 1}: Invalid miscellaneous amount`);
        return;
      }

      // Validate date
      try {
        const date = new Date(row.dateGiven);
        if (isNaN(date.getTime())) {
          errors.push(`Row ${index + 1}: Invalid date format`);
          return;
        }
      } catch {
        errors.push(`Row ${index + 1}: Invalid date format`);
        return;
      }

      validRecords.push({
        envelopeNumber: envelopeNum,
        dateGiven: row.dateGiven,
        currentAmount: current,
        missionAmount: mission,
        memorialsAmount: memorials,
        debtAmount: debt,
        schoolAmount: school,
        miscellaneousAmount: miscellaneous,
      });
    });

    if (errors.length > 0) {
      setBulkInputResults({
        success: 0,
        failed: errors.length,
        errors,
      });
      return;
    }

    if (validRecords.length === 0) {
      alert("Please fill in at least one row");
      return;
    }

    if (!csrfToken) {
      alert("CSRF token not loaded. Please refresh the page and try again.");
      return;
    }

    setBulkInputSubmitting(true);
    setBulkInputResults(null);

    try {
      const response = await fetch("/api/giving/bulk-input", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          records: validRecords,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setBulkInputResults({
          success: data.success || 0,
          failed: data.failed || 0,
          errors: data.errors || [],
        });
        // Refresh the giving records list
        await fetchGivingRecords(currentPage);
        // Reset rows after successful submission
        if (data.failed === 0) {
        setBulkInputRows(Array.from({ length: 3 }, () => ({
          envelopeNumber: "",
          dateGiven: new Date().toISOString().split("T")[0],
          currentAmount: "",
          missionAmount: "",
          memorialsAmount: "",
          debtAmount: "",
          schoolAmount: "",
          miscellaneousAmount: "",
        })));
        }
        // Close the dialog after successful submission
        setBulkInputDialogOpen(false);
      } else {
        alert(data.error || "Failed to bulk input giving records");
      }
    } catch (error) {
      console.error("Error bulk inputting giving records:", error);
      alert("Failed to bulk input giving records. Please try again.");
    } finally {
      setBulkInputSubmitting(false);
    }
  };

  const addBulkInputRow = () => {
    setBulkInputRows([...bulkInputRows, {
      envelopeNumber: "",
      dateGiven: new Date().toISOString().split("T")[0],
      currentAmount: "",
      missionAmount: "",
      memorialsAmount: "",
      debtAmount: "",
      schoolAmount: "",
      miscellaneousAmount: "",
    }]);
  };

  const removeBulkInputRow = (index: number) => {
    setBulkInputRows(bulkInputRows.filter((_, i) => i !== index));
  };

  const updateBulkInputRow = (index: number, field: string, value: string) => {
    const newRows = [...bulkInputRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setBulkInputRows(newRows);
  };

  // Handle bulk import
  const handleBulkImport = async () => {
    if (!importFile) {
      alert("Please select a CSV file");
      return;
    }

    if (!csrfToken) {
      alert("CSRF token not loaded. Please refresh the page and try again.");
      return;
    }

    setImporting(true);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const response = await fetch("/api/giving/bulk-import", {
        method: "POST",
        headers: {
          "x-csrf-token": csrfToken,
        },
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
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Giving</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Track weekly giving amounts for members
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {canEditGiving && (
            <>
              <Dialog
                open={bulkInputDialogOpen}
            onOpenChange={(open) => {
              setBulkInputDialogOpen(open);
              // Clear results whenever dialog opens or closes
              setBulkInputResults(null);
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="cursor-pointer">
                <TableIcon className="mr-2 h-4 w-4" />
                Bulk Input
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] max-w-[95vw] md:max-w-6xl overflow-auto">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">Bulk Input Giving Records</DialogTitle>
                <DialogDescription className="text-sm md:text-base">
                  Enter multiple giving records in a spreadsheet-like format. Fill in envelope number, date, and at least one amount type per row.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Envelope Number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>Mission</TableHead>
                        <TableHead>Memorials</TableHead>
                        <TableHead>Debt</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Miscellaneous</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkInputRows.map((row, index) => {
                        const total = calculateTotal(
                          row.currentAmount || null,
                          row.missionAmount || null,
                          row.memorialsAmount || null,
                          row.debtAmount || null,
                          row.schoolAmount || null,
                          row.miscellaneousAmount || null
                        );
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeBulkInputRow(index)}
                                className="h-8 w-8"
                                disabled={bulkInputRows.length <= 1}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={row.envelopeNumber}
                                onValueChange={(value) => updateBulkInputRow(index, "envelopeNumber", value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  {envelopeNumbers.map((num) => (
                                    <SelectItem key={num} value={num.toString()}>
                                      {num}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="date"
                                value={row.dateGiven}
                                onChange={(e) => updateBulkInputRow(index, "dateGiven", e.target.value)}
                                className="w-40"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={row.currentAmount}
                                onChange={(e) => updateBulkInputRow(index, "currentAmount", e.target.value)}
                                className="w-32"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={row.missionAmount}
                                onChange={(e) => updateBulkInputRow(index, "missionAmount", e.target.value)}
                                className="w-32"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={row.memorialsAmount}
                                onChange={(e) => updateBulkInputRow(index, "memorialsAmount", e.target.value)}
                                className="w-32"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={row.debtAmount}
                                onChange={(e) => updateBulkInputRow(index, "debtAmount", e.target.value)}
                                className="w-32"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={row.schoolAmount}
                                onChange={(e) => updateBulkInputRow(index, "schoolAmount", e.target.value)}
                                className="w-32"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={row.miscellaneousAmount}
                                onChange={(e) => updateBulkInputRow(index, "miscellaneousAmount", e.target.value)}
                                className="w-32"
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(total.toString())}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addBulkInputRow}
                  className="cursor-pointer"
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Row
                </Button>

                {bulkInputResults && (
                  <div className={`p-4 rounded-md ${bulkInputResults.failed > 0 ? "bg-destructive/10" : "bg-green-500/10"}`}>
                    <p className={`text-sm font-medium mb-2 ${bulkInputResults.failed > 0 ? "text-destructive" : "text-green-600"}`}>
                      Results: {bulkInputResults.success} successful, {bulkInputResults.failed} failed
                    </p>
                    {bulkInputResults.errors.length > 0 && (
                      <div className="max-h-40 overflow-y-auto">
                        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                          {bulkInputResults.errors.slice(0, 10).map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                          {bulkInputResults.errors.length > 10 && (
                            <li>... and {bulkInputResults.errors.length - 10} more errors</li>
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
                    onClick={() => setBulkInputDialogOpen(false)}
                    disabled={bulkInputSubmitting}
                    className="cursor-pointer"
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    onClick={handleBulkInput}
                    disabled={bulkInputSubmitting}
                    className="cursor-pointer"
                  >
                    {bulkInputSubmitting ? "Submitting..." : "Submit Records"}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
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
            <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">Bulk Import Giving Records</DialogTitle>
                <DialogDescription className="text-sm md:text-base">
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
            </>
          )}
          {canEditGiving && (
            <Dialog
              open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                // Reset form and filtered members when dialog closes
                form.reset({
                  envelopeNumber: "",
                  currentAmount: "",
                  missionAmount: "",
                  memorialsAmount: "",
                  debtAmount: "",
                  schoolAmount: "",
                  miscellaneousAmount: "",
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
            <DialogContent className="max-w-[95vw] md:max-w-[50vw] max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">Add Giving Record</DialogTitle>
                <DialogDescription className="text-sm md:text-base">
                  Enter the giving amount by selecting an envelope number. One giving record will be created at the household level, associated with the head of household member.
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
                          One giving record will be created for this envelope number, associated with the head of household member ({filteredMembers.length} member{filteredMembers.length !== 1 ? "s" : ""} share this envelope).
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
                    name="currentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
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
                    name="missionAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mission Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
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
                    name="memorialsAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Memorials Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
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
                    name="debtAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Debt Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
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
                    name="schoolAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
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
                    name="miscellaneousAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Miscellaneous Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    * At least one amount is required
                  </p>
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
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">Recent Giving Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm md:text-base">
              Loading giving records...
            </div>
          ) : givingRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm md:text-base">
              No giving records found. Add your first giving record to get started.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs md:text-sm">Member Name</TableHead>
                      <TableHead className="text-xs md:text-sm">Current</TableHead>
                      <TableHead className="text-xs md:text-sm">Mission</TableHead>
                      <TableHead className="text-xs md:text-sm">Memorials</TableHead>
                      <TableHead className="text-xs md:text-sm">Debt</TableHead>
                      <TableHead className="text-xs md:text-sm">School</TableHead>
                      <TableHead className="text-xs md:text-sm">Miscellaneous</TableHead>
                      <TableHead className="text-xs md:text-sm">Total</TableHead>
                      <TableHead className="text-xs md:text-sm">Date Given</TableHead>
                      <TableHead className="text-xs md:text-sm">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {givingRecords.map((record) => {
                    const total = calculateTotal(
                      record.currentAmount,
                      record.missionAmount,
                      record.memorialsAmount,
                      record.debtAmount,
                      record.schoolAmount,
                      record.miscellaneousAmount
                    );
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium text-xs md:text-sm">
                          <Link
                            href={`/giving/${record.memberId}`}
                            className="text-primary hover:underline"
                          >
                            {record.member.firstName} {record.member.lastName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs md:text-sm">{formatCurrency(record.currentAmount)}</TableCell>
                        <TableCell className="text-xs md:text-sm">{formatCurrency(record.missionAmount)}</TableCell>
                        <TableCell className="text-xs md:text-sm">{formatCurrency(record.memorialsAmount)}</TableCell>
                        <TableCell className="text-xs md:text-sm">{formatCurrency(record.debtAmount)}</TableCell>
                        <TableCell className="text-xs md:text-sm">{formatCurrency(record.schoolAmount)}</TableCell>
                        <TableCell className="text-xs md:text-sm">{formatCurrency(record.miscellaneousAmount)}</TableCell>
                        <TableCell className="font-medium text-xs md:text-sm">{formatCurrency(total.toString())}</TableCell>
                        <TableCell className="text-xs md:text-sm">{formatDate(record.dateGiven)}</TableCell>
                        <TableCell className="text-muted-foreground text-xs md:text-sm">
                          {record.notes || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>

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

