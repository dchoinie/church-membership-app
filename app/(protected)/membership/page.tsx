"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlusIcon, TrashIcon, PencilIcon, ArrowUpDown, ArrowUp, ArrowDown, DownloadIcon, EyeIcon, File, UsersIcon, UserIcon, ChevronDownIcon, ChevronUpIcon, SearchIcon, Loader2 } from "lucide-react";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useHouseholds, type HouseholdFilters } from "@/lib/hooks/use-households";
import { useIndividualMembers, type IndividualMemberFilters } from "@/lib/hooks/use-individual-members";
import { apiFetch } from "@/lib/api-client";
import { parseCSV, buildCSV } from "@/lib/csv";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface HouseholdMember {
  firstName: string;
  lastName: string;
}

interface Household {
  id: string;
  name: string | null;
  type: string | null;
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  memberCount: number;
  members: HouseholdMember[];
}

interface HouseholdFormData {
  name: string;
  type: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function MembershipPage() {
  const router = useRouter();
  const { canEditMembers } = usePermissions();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
    headers: string[];
    failedRows: Array<{
      rowIndex: number;
      rowData: Record<string, string>;
      error: string;
      skipped?: boolean;
      edited?: Record<string, string>;
      editing?: boolean;
    }>;
  } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [createHouseholdLoading, setCreateHouseholdLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [individualMembersPage, setIndividualMembersPage] = useState(1);

  // Search/filter state
  const [householdFilters, setHouseholdFilters] = useState<HouseholdFilters>({});
  const [memberFilters, setMemberFilters] = useState<IndividualMemberFilters>({});
  const [householdSearchInput, setHouseholdSearchInput] = useState("");
  const [memberSearchInput, setMemberSearchInput] = useState("");
  const [householdFiltersOpen, setHouseholdFiltersOpen] = useState(false);
  const [memberFiltersOpen, setMemberFiltersOpen] = useState(false);

  // Draft state for advanced filters (only applied on Apply button click)
  const [householdFiltersDraft, setHouseholdFiltersDraft] = useState<Pick<HouseholdFilters, "type" | "city" | "state" | "minMembers" | "maxMembers">>({});
  const [memberFiltersDraft, setMemberFiltersDraft] = useState<Pick<IndividualMemberFilters, "participation" | "sex" | "sequence" | "householdName">>({});

  const applyHouseholdSearch = useCallback(() => {
    setHouseholdFilters((prev) => ({ ...prev, q: householdSearchInput.trim() || undefined }));
    setCurrentPage(1);
  }, [householdSearchInput]);

  const applyMemberSearch = useCallback(() => {
    setMemberFilters((prev) => ({ ...prev, q: memberSearchInput.trim() || undefined }));
    setIndividualMembersPage(1);
  }, [memberSearchInput]);

  const clearHouseholdFilters = useCallback(() => {
    setHouseholdFilters({});
    setHouseholdSearchInput("");
    setHouseholdFiltersDraft({});
    setCurrentPage(1);
  }, []);

  const clearMemberFilters = useCallback(() => {
    setMemberFilters({});
    setMemberSearchInput("");
    setMemberFiltersDraft({});
    setIndividualMembersPage(1);
  }, []);

  const applyHouseholdAdvancedFilters = useCallback(() => {
    setHouseholdFilters((prev) => ({
      ...prev,
      type: householdFiltersDraft.type || undefined,
      city: householdFiltersDraft.city || undefined,
      state: householdFiltersDraft.state || undefined,
      minMembers: householdFiltersDraft.minMembers,
      maxMembers: householdFiltersDraft.maxMembers,
    }));
    setCurrentPage(1);
  }, [householdFiltersDraft]);

  const clearHouseholdAdvancedFilters = useCallback(() => {
    setHouseholdFiltersDraft({});
    setHouseholdFilters((prev) => {
      const next = { ...prev };
      delete next.type;
      delete next.city;
      delete next.state;
      delete next.minMembers;
      delete next.maxMembers;
      return next;
    });
    setCurrentPage(1);
  }, []);

  const applyMemberAdvancedFilters = useCallback(() => {
    setMemberFilters((prev) => ({
      ...prev,
      participation: memberFiltersDraft.participation?.length ? memberFiltersDraft.participation : undefined,
      sex: memberFiltersDraft.sex?.length ? memberFiltersDraft.sex : undefined,
      sequence: memberFiltersDraft.sequence?.length ? memberFiltersDraft.sequence : undefined,
      householdName: memberFiltersDraft.householdName || undefined,
    }));
    setIndividualMembersPage(1);
  }, [memberFiltersDraft]);

  const clearMemberAdvancedFilters = useCallback(() => {
    setMemberFiltersDraft({});
    setMemberFilters((prev) => {
      const next = { ...prev };
      delete next.participation;
      delete next.sex;
      delete next.sequence;
      delete next.householdName;
      return next;
    });
    setIndividualMembersPage(1);
  }, []);

  // Sync draft from applied filters when advanced panel opens or when applied filters change (e.g. after Apply or Clear)
  useEffect(() => {
    if (householdFiltersOpen) {
      setHouseholdFiltersDraft({
        type: householdFilters.type,
        city: householdFilters.city,
        state: householdFilters.state,
        minMembers: householdFilters.minMembers,
        maxMembers: householdFilters.maxMembers,
      });
    }
  }, [householdFiltersOpen, householdFilters.type, householdFilters.city, householdFilters.state, householdFilters.minMembers, householdFilters.maxMembers]);

  useEffect(() => {
    if (memberFiltersOpen) {
      setMemberFiltersDraft({
        participation: memberFilters.participation,
        sex: memberFilters.sex,
        sequence: memberFilters.sequence,
        householdName: memberFilters.householdName,
      });
    }
  }, [memberFiltersOpen, memberFilters.participation, memberFilters.sex, memberFilters.sequence, memberFilters.householdName]);

  const {
    households,
    pagination,
    isLoading: loading,
    mutate: mutateHouseholds,
  } = useHouseholds(currentPage, 50, householdFilters);

  const {
    members: individualMembers,
    pagination: individualMembersPagination,
    isLoading: individualMembersLoading,
    mutate: mutateIndividualMembers,
  } = useIndividualMembers(individualMembersPage, 50, memberFilters);

  // Sorting state
  const [sortBy, setSortBy] = useState<"name" | "type" | "members">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const createForm = useForm<HouseholdFormData>({
    defaultValues: {
      name: "",
      type: "single",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zip: "",
    },
  });

  const editForm = useForm<HouseholdFormData>({
    defaultValues: {
      name: "",
      type: "single",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zip: "",
    },
  });

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleIndividualMembersPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= individualMembersPagination.totalPages) {
      setIndividualMembersPage(newPage);
    }
  };

  const getParticipationBadgeClass = (participation: string | undefined) => {
    const p = participation?.toLowerCase();
    if (p === "active") return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (p === "inactive") return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    if (p === "deceased") return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    if (p === "homebound" || p === "military" || p === "school")
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  };

  const getHouseholdDisplayName = (household: Household): string => {
    if (household.name) {
      return household.name;
    }
    if (household.memberCount === 0) {
      return `Household ${household.id.slice(0, 8)}`;
    }
    if (household.members.length === 0) {
      return `Household (${household.memberCount} member${household.memberCount !== 1 ? "s" : ""})`;
    }
    if (household.members.length === 1) {
      return `${household.members[0].firstName} ${household.members[0].lastName}`;
    }
    if (household.members.length === 2) {
      return `${household.members[0].firstName} & ${household.members[1].firstName} ${household.members[1].lastName}`;
    }
    return `${household.members[0].firstName} ${household.members[0].lastName} (+${household.memberCount - 1})`;
  };

  const getAddressDisplay = (household: Household): string => {
    const parts = [];
    if (household.address1) parts.push(household.address1);
    if (household.city) parts.push(household.city);
    if (household.state) parts.push(household.state);
    return parts.length > 0 ? parts.join(", ") : "N/A";
  };

  const handleSort = (column: "name" | "type" | "members") => {
    if (sortBy === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to ascending
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  const sortedHouseholds = [...households].sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === "name") {
      const nameA = getHouseholdDisplayName(a).toLowerCase();
      const nameB = getHouseholdDisplayName(b).toLowerCase();
      comparison = nameA.localeCompare(nameB);
    } else if (sortBy === "type") {
      const typeA = (a.type || "").toLowerCase();
      const typeB = (b.type || "").toLowerCase();
      comparison = typeA.localeCompare(typeB);
    } else if (sortBy === "members") {
      comparison = a.memberCount - b.memberCount;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const onCreateSubmit = async (data: HouseholdFormData) => {
    setCreateHouseholdLoading(true);
    try {
      const response = await apiFetch("/api/families", {
        method: "POST",
        body: JSON.stringify({
          name: data.name || null,
          type: data.type || null,
          address1: data.address1 || null,
          address2: data.address2 || null,
          city: data.city || null,
          state: data.state || null,
          zip: data.zip || null,
        }),
      });

      if (response.ok) {
        setCreateDialogOpen(false);
        createForm.reset();
        mutateHouseholds();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create household");
      }
    } catch (error) {
      console.error("Error creating household:", error);
      alert("Failed to create household");
    } finally {
      setCreateHouseholdLoading(false);
    }
  };

  const onEditSubmit = async (data: HouseholdFormData) => {
    if (!selectedHousehold) return;

    try {
      const response = await apiFetch(`/api/families/${selectedHousehold.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: data.name || null,
          type: data.type || null,
          address1: data.address1 || null,
          address2: data.address2 || null,
          city: data.city || null,
          state: data.state || null,
          zip: data.zip || null,
        }),
      });

      if (response.ok) {
        setEditDialogOpen(false);
        setSelectedHousehold(null);
        editForm.reset();
        mutateHouseholds();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update household");
      }
    } catch (error) {
      console.error("Error updating household:", error);
      alert("Failed to update household");
    }
  };

  const handleDeleteClick = (household: Household) => {
    setSelectedHousehold(household);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedHousehold) return;

    try {
      const response = await apiFetch(`/api/families/${selectedHousehold.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDeleteDialogOpen(false);
        setSelectedHousehold(null);
        mutateHouseholds();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete household");
      }
    } catch (error) {
      console.error("Error deleting household:", error);
      alert("Failed to delete household");
    }
  };

  const handleEditClick = (household: Household) => {
    setSelectedHousehold(household);
    editForm.reset({
      name: household.name || "",
      type: household.type || "single",
      address1: household.address1 || "",
      address2: "",
      city: household.city || "",
      state: household.state || "",
      zip: "",
    });
    setEditDialogOpen(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        alert("Please select a CSV file");
        return;
      }
      setImportFile(file);
      setImportResults(null);
    }
  };

  const handleBulkImport = async () => {
    if (!importFile) {
      alert("Please select a CSV file");
      return;
    }

    setImporting(true);
    setImportResults(null);

    try {
      const text = await importFile.text();
      const { headers, rows } = parseCSV(text);

      const formData = new FormData();
      formData.append("file", importFile);

      const response = await apiFetch("/api/members/bulk-import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        mutateHouseholds();
        mutateIndividualMembers();

        const successCount = data.success || 0;
        const failedCount = data.failed || 0;
        const errors: string[] = data.errors || [];

        if (failedCount > 0 && errors.length > 0 && headers.length > 0 && rows.length > 0) {
          const failedRows: NonNullable<typeof importResults>["failedRows"] = [];
          const rowRegex = /^Row (\d+):\s*(.+)$/;
          for (const err of errors) {
            const match = err.match(rowRegex);
            if (match) {
              const rowNum = parseInt(match[1], 10);
              const rowIndex = rowNum - 1;
              const errorMsg = match[2];
              if (rowIndex >= 0 && rowIndex < rows.length) {
                const rowValues = rows[rowIndex];
                const rowData: Record<string, string> = {};
                headers.forEach((h, i) => {
                  rowData[h] = rowValues[i]?.trim() ?? "";
                });
                failedRows.push({ rowIndex, rowData, error: errorMsg });
              }
            }
          }
          setImportResults({
            success: successCount,
            failed: failedCount,
            errors,
            headers,
            failedRows,
          });
          setImportFile(null);
          const fileInput = document.getElementById("csv-file-input") as HTMLInputElement;
          if (fileInput) fileInput.value = "";
        } else {
          alert(`Successfully imported ${successCount} member(s).`);
          setImportFile(null);
          const fileInput = document.getElementById("csv-file-input") as HTMLInputElement;
          if (fileInput) fileInput.value = "";
          setImportDialogOpen(false);
          setImportResults(null);
        }
      } else {
        alert(data.error || "Failed to import members");
      }
    } catch (error) {
      console.error("Error importing members:", error);
      alert("Failed to import members. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const setFailedRowSkipped = (rowIndex: number, skipped: boolean) => {
    setImportResults((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        failedRows: prev.failedRows.map((r) =>
          r.rowIndex === rowIndex ? { ...r, skipped } : r
        ),
      };
    });
  };

  const setFailedRowEditing = (rowIndex: number, editing: boolean) => {
    setImportResults((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        failedRows: prev.failedRows.map((r) =>
          r.rowIndex === rowIndex ? { ...r, editing } : r
        ),
      };
    });
  };

  const setFailedRowEdited = (rowIndex: number, field: string, value: string) => {
    setImportResults((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        failedRows: prev.failedRows.map((r) =>
          r.rowIndex === rowIndex
            ? { ...r, edited: { ...(r.edited || {}), [field]: value } }
            : r
        ),
      };
    });
  };

  const handleRetryFailedRows = async () => {
    if (!importResults || importResults.failedRows.length === 0) return;
    const toRetry = importResults.failedRows.filter((r) => !r.skipped);
    if (toRetry.length === 0) {
      setImportDialogOpen(false);
      setImportResults(null);
      return;
    }

    setImporting(true);
    try {
      const rowsToSend = toRetry.map((r) => {
        const merged = { ...r.rowData, ...r.edited };
        return importResults.headers.reduce(
          (acc, h) => ({ ...acc, [h]: merged[h] ?? "" }),
          {} as Record<string, string>
        );
      });
      const csvContent = buildCSV(importResults.headers, rowsToSend);
      const blob = new Blob([csvContent], { type: "text/csv" });
      const formData = new FormData();
      formData.append("file", blob, "retry-import.csv");

      const response = await apiFetch("/api/members/bulk-import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        mutateHouseholds();
        mutateIndividualMembers();
        const successCount = data.success || 0;
        const failedCount = data.failed || 0;
        const errors: string[] = data.errors || [];
        const headers = importResults.headers;

        if (failedCount > 0 && errors.length > 0) {
          const failedRows: typeof importResults.failedRows = [];
          const rowRegex = /^Row (\d+):\s*(.+)$/;
          for (const err of errors) {
            const match = err.match(rowRegex);
            if (match) {
              const rowNum = parseInt(match[1], 10);
              const rowIndexInRetry = rowNum - 1;
              const errorMsg = match[2];
              if (rowIndexInRetry >= 0 && rowIndexInRetry < toRetry.length) {
                const originalRow = toRetry[rowIndexInRetry];
                const merged = { ...originalRow.rowData, ...originalRow.edited };
                failedRows.push({
                  rowIndex: originalRow.rowIndex,
                  rowData: merged,
                  error: errorMsg,
                });
              }
            }
          }
          setImportResults({
            success: importResults.success + successCount,
            failed: failedCount,
            errors,
            headers,
            failedRows,
          });
        } else {
          alert(`Successfully imported ${importResults.success + successCount} member(s).`);
          setImportDialogOpen(false);
          setImportResults(null);
        }
      } else {
        alert(data.error || "Failed to retry import");
      }
    } catch (error) {
      console.error("Error retrying import:", error);
      alert("Failed to retry import. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const handleExportMembers = async () => {
    setExporting(true);
    try {
      const response = await apiFetch("/api/members/export");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to export members");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `members_export_${new Date().toISOString().split("T")[0]}.csv`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error exporting members:", error);
      alert(error instanceof Error ? error.message : "Failed to export members. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Membership</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Manage households and their members. To create members, click into the household they are a part of. (Members must be part of a household)
          </p>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            If you use external spreadsheets for initial data entry, you can upload CSV data using the File Import button in the Households tab.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleExportMembers}
            disabled={exporting}
            className="cursor-pointer"
          >
            <DownloadIcon className="mr-2 h-4 w-4" />
            {exporting ? "Exporting..." : "Export Members"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="households" className="w-full">
        <TabsList className="w-full md:w-auto overflow-x-auto">
          <TabsTrigger className="cursor-pointer text-xs md:text-sm" value="households">
            <UsersIcon className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            Households
          </TabsTrigger>
          <TabsTrigger className="cursor-pointer text-xs md:text-sm" value="individuals">
            <UserIcon className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            Individual Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="households" className="space-y-4 mt-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, address, city, state, zip"
                  value={householdSearchInput}
                  onChange={(e) => setHouseholdSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyHouseholdSearch())}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="default" onClick={applyHouseholdSearch} className="cursor-pointer">
                  Search
                </Button>
                <Button variant="outline" onClick={clearHouseholdFilters} className="cursor-pointer">
                  Clear
                </Button>
              </div>
            </div>
            <Collapsible open={householdFiltersOpen} onOpenChange={setHouseholdFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="cursor-pointer -ml-2">
                  {householdFiltersOpen ? <ChevronUpIcon className="h-4 w-4 mr-1" /> : <ChevronDownIcon className="h-4 w-4 mr-1" />}
                  Advanced filters
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="rounded-lg border bg-muted/30 p-4 mt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Type</label>
                      <Select
                        value={householdFiltersDraft.type ?? "all"}
                        onValueChange={(v) => setHouseholdFiltersDraft((prev) => ({ ...prev, type: v === "all" ? undefined : v }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="family">Family</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">City</label>
                      <Input
                        placeholder="City"
                        value={householdFiltersDraft.city ?? ""}
                        onChange={(e) => setHouseholdFiltersDraft((prev) => ({ ...prev, city: e.target.value || undefined }))}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">State</label>
                      <Select
                        value={householdFiltersDraft.state ?? "all"}
                        onValueChange={(v) => setHouseholdFiltersDraft((prev) => ({ ...prev, state: v === "all" ? undefined : v }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="AL">AL</SelectItem>
                        <SelectItem value="AK">AK</SelectItem>
                        <SelectItem value="AZ">AZ</SelectItem>
                        <SelectItem value="AR">AR</SelectItem>
                        <SelectItem value="CA">CA</SelectItem>
                        <SelectItem value="CO">CO</SelectItem>
                        <SelectItem value="CT">CT</SelectItem>
                        <SelectItem value="DE">DE</SelectItem>
                        <SelectItem value="FL">FL</SelectItem>
                        <SelectItem value="GA">GA</SelectItem>
                        <SelectItem value="HI">HI</SelectItem>
                        <SelectItem value="ID">ID</SelectItem>
                        <SelectItem value="IL">IL</SelectItem>
                        <SelectItem value="IN">IN</SelectItem>
                        <SelectItem value="IA">IA</SelectItem>
                        <SelectItem value="KS">KS</SelectItem>
                        <SelectItem value="KY">KY</SelectItem>
                        <SelectItem value="LA">LA</SelectItem>
                        <SelectItem value="ME">ME</SelectItem>
                        <SelectItem value="MD">MD</SelectItem>
                        <SelectItem value="MA">MA</SelectItem>
                        <SelectItem value="MI">MI</SelectItem>
                        <SelectItem value="MN">MN</SelectItem>
                        <SelectItem value="MS">MS</SelectItem>
                        <SelectItem value="MO">MO</SelectItem>
                        <SelectItem value="MT">MT</SelectItem>
                        <SelectItem value="NE">NE</SelectItem>
                        <SelectItem value="NV">NV</SelectItem>
                        <SelectItem value="NH">NH</SelectItem>
                        <SelectItem value="NJ">NJ</SelectItem>
                        <SelectItem value="NM">NM</SelectItem>
                        <SelectItem value="NY">NY</SelectItem>
                        <SelectItem value="NC">NC</SelectItem>
                        <SelectItem value="ND">ND</SelectItem>
                        <SelectItem value="OH">OH</SelectItem>
                        <SelectItem value="OK">OK</SelectItem>
                        <SelectItem value="OR">OR</SelectItem>
                        <SelectItem value="PA">PA</SelectItem>
                        <SelectItem value="RI">RI</SelectItem>
                        <SelectItem value="SC">SC</SelectItem>
                        <SelectItem value="SD">SD</SelectItem>
                        <SelectItem value="TN">TN</SelectItem>
                        <SelectItem value="TX">TX</SelectItem>
                        <SelectItem value="UT">UT</SelectItem>
                        <SelectItem value="VT">VT</SelectItem>
                        <SelectItem value="VA">VA</SelectItem>
                        <SelectItem value="WA">WA</SelectItem>
                        <SelectItem value="WV">WV</SelectItem>
                        <SelectItem value="WI">WI</SelectItem>
                        <SelectItem value="WY">WY</SelectItem>
                        <SelectItem value="DC">DC</SelectItem>
                      </SelectContent>
                    </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Min members</label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Min"
                        value={householdFiltersDraft.minMembers ?? ""}
                        onChange={(e) => {
                          const v = e.target.value === "" ? undefined : parseInt(e.target.value, 10);
                          setHouseholdFiltersDraft((prev) => ({ ...prev, minMembers: v != null && !isNaN(v) ? v : undefined }));
                        }}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Max members</label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Max"
                        value={householdFiltersDraft.maxMembers ?? ""}
                        onChange={(e) => {
                          const v = e.target.value === "" ? undefined : parseInt(e.target.value, 10);
                          setHouseholdFiltersDraft((prev) => ({ ...prev, maxMembers: v != null && !isNaN(v) ? v : undefined }));
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button type="button" variant="default" onClick={applyHouseholdAdvancedFilters} className="cursor-pointer">
                      Apply
                    </Button>
                    <Button type="button" variant="outline" onClick={clearHouseholdAdvancedFilters} className="cursor-pointer">
                      Clear
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {canEditMembers && (
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="cursor-pointer">
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Create Household
                  </Button>
                </DialogTrigger>
            <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Household</DialogTitle>
                <DialogDescription>
                  Create a new household. You can add members to it later.
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Household Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Smith Family" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Household Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="family">Family</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="address1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Street address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="address2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address 2</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Apartment, suite, etc." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={createForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="AL">AL - Alabama</SelectItem>
                              <SelectItem value="AK">AK - Alaska</SelectItem>
                              <SelectItem value="AZ">AZ - Arizona</SelectItem>
                              <SelectItem value="AR">AR - Arkansas</SelectItem>
                              <SelectItem value="CA">CA - California</SelectItem>
                              <SelectItem value="CO">CO - Colorado</SelectItem>
                              <SelectItem value="CT">CT - Connecticut</SelectItem>
                              <SelectItem value="DE">DE - Delaware</SelectItem>
                              <SelectItem value="FL">FL - Florida</SelectItem>
                              <SelectItem value="GA">GA - Georgia</SelectItem>
                              <SelectItem value="HI">HI - Hawaii</SelectItem>
                              <SelectItem value="ID">ID - Idaho</SelectItem>
                              <SelectItem value="IL">IL - Illinois</SelectItem>
                              <SelectItem value="IN">IN - Indiana</SelectItem>
                              <SelectItem value="IA">IA - Iowa</SelectItem>
                              <SelectItem value="KS">KS - Kansas</SelectItem>
                              <SelectItem value="KY">KY - Kentucky</SelectItem>
                              <SelectItem value="LA">LA - Louisiana</SelectItem>
                              <SelectItem value="ME">ME - Maine</SelectItem>
                              <SelectItem value="MD">MD - Maryland</SelectItem>
                              <SelectItem value="MA">MA - Massachusetts</SelectItem>
                              <SelectItem value="MI">MI - Michigan</SelectItem>
                              <SelectItem value="MN">MN - Minnesota</SelectItem>
                              <SelectItem value="MS">MS - Mississippi</SelectItem>
                              <SelectItem value="MO">MO - Missouri</SelectItem>
                              <SelectItem value="MT">MT - Montana</SelectItem>
                              <SelectItem value="NE">NE - Nebraska</SelectItem>
                              <SelectItem value="NV">NV - Nevada</SelectItem>
                              <SelectItem value="NH">NH - New Hampshire</SelectItem>
                              <SelectItem value="NJ">NJ - New Jersey</SelectItem>
                              <SelectItem value="NM">NM - New Mexico</SelectItem>
                              <SelectItem value="NY">NY - New York</SelectItem>
                              <SelectItem value="NC">NC - North Carolina</SelectItem>
                              <SelectItem value="ND">ND - North Dakota</SelectItem>
                              <SelectItem value="OH">OH - Ohio</SelectItem>
                              <SelectItem value="OK">OK - Oklahoma</SelectItem>
                              <SelectItem value="OR">OR - Oregon</SelectItem>
                              <SelectItem value="PA">PA - Pennsylvania</SelectItem>
                              <SelectItem value="RI">RI - Rhode Island</SelectItem>
                              <SelectItem value="SC">SC - South Carolina</SelectItem>
                              <SelectItem value="SD">SD - South Dakota</SelectItem>
                              <SelectItem value="TN">TN - Tennessee</SelectItem>
                              <SelectItem value="TX">TX - Texas</SelectItem>
                              <SelectItem value="UT">UT - Utah</SelectItem>
                              <SelectItem value="VT">VT - Vermont</SelectItem>
                              <SelectItem value="VA">VA - Virginia</SelectItem>
                              <SelectItem value="WA">WA - Washington</SelectItem>
                              <SelectItem value="WV">WV - West Virginia</SelectItem>
                              <SelectItem value="WI">WI - Wisconsin</SelectItem>
                              <SelectItem value="WY">WY - Wyoming</SelectItem>
                              <SelectItem value="DC">DC - District of Columbia</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="zip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                      className="cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="cursor-pointer" disabled={createHouseholdLoading}>
                      {createHouseholdLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Household
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
            )}
            {canEditMembers && (
              <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="cursor-pointer">
                  <File className="mr-2 h-4 w-4" />
                  File Import
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-[95vw] md:max-w-2xl">
              <DialogHeader>
                <DialogTitle>File Import Members</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to import multiple members at once. Each member must be assigned to a household.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label
                    htmlFor="csv-file-input"
                    className="block text-sm font-medium mb-2"
                  >
                    Select CSV File
                  </label>
                  <Input
                    id="csv-file-input"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    disabled={importing}
                  />
                  {importFile && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selected: {importFile.name}
                    </p>
                  )}
                </div>
                <div className="border-t pt-4">
                  <a
                    href="/example-members-import.csv"
                    download
                    className="text-sm text-primary hover:underline"
                  >
                    Download Example CSV Template
                  </a>
                  <p className="text-xs text-muted-foreground mt-2">
                    Required columns: First Name, Last Name, Household ID (or create new household)
                    <br />
                    Optional columns: Middle Name, Suffix, Preferred Name, Maiden Name, Title, Sex, Date of Birth, Email1, Email2, Phone Home, Phone Cell1, Phone Cell2, Baptism Date, Confirmation Date, Received By (adult_confirmation, affirmation_of_faith, baptism, junior_confirmation, transfer, with_parents, other_denomination, unknown), Date Received, Removed By (death, excommunication, inactivity, moved_no_transfer, released, removed_by_request, transfer, other), Date Removed, Deceased Date, Membership Code, Participation (active, deceased, homebound, military, inactive, school), Sequence (head_of_house, spouse, child)
                  </p>
                </div>
                {importResults && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Import Results</h4>
                    <p className="text-sm">
                      <span className="text-green-600">
                        Successfully imported: {importResults.success}
                      </span>
                      <span className="mx-2">|</span>
                      <span className="text-red-600">
                        Failed: {importResults.failed}
                      </span>
                    </p>
                    {importResults.failedRows && importResults.failedRows.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-sm font-medium mb-2">
                          Failed rows — fix the data below or skip to ignore:
                        </p>
                        <div className="max-h-48 overflow-y-auto border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">Row</TableHead>
                                <TableHead>First Name</TableHead>
                                <TableHead>Last Name</TableHead>
                                <TableHead>Household ID</TableHead>
                                <TableHead className="min-w-[140px]">Error</TableHead>
                                <TableHead className="w-24">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importResults.failedRows.map((fr) => {
                                const merged = { ...fr.rowData, ...fr.edited };
                                const getVal = (key: string) =>
                                  merged[
                                    importResults.headers.find(
                                      (h) =>
                                        h.toLowerCase().replace(/[\s_]+/g, " ") ===
                                        key.toLowerCase().replace(/\s+/g, " ")
                                    ) ?? key
                                  ] ?? "";
                                const findHeader = (normalized: string) =>
                                  importResults.headers.find(
                                    (h) =>
                                      h.toLowerCase().replace(/[\s_]+/g, " ") ===
                                      normalized.toLowerCase()
                                  );
                                const firstName = getVal("first name") || getVal("firstname");
                                const lastName = getVal("last name") || getVal("lastname");
                                const createNew = getVal("create new household")?.toLowerCase() === "true";
                                const householdIdVal = getVal("household id");
                                const householdIdDisplay = createNew ? "(new)" : (householdIdVal || "—");

                                if (fr.skipped) {
                                  return (
                                    <TableRow key={fr.rowIndex} className="opacity-50 bg-muted/30">
                                      <TableCell>{fr.rowIndex + 1}</TableCell>
                                      <TableCell>{firstName || "—"}</TableCell>
                                      <TableCell>{lastName || "—"}</TableCell>
                                      <TableCell>{householdIdDisplay}</TableCell>
                                      <TableCell className="text-red-600 text-xs">
                                        {fr.error}
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs"
                                          onClick={() => setFailedRowSkipped(fr.rowIndex, false)}
                                        >
                                          Undo
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                }

                                if (fr.editing) {
                                  const fnKey = findHeader("first name") ?? "First Name";
                                  const lnKey = findHeader("last name") ?? "Last Name";
                                  const hidKey =
                                    importResults.headers.find((h) =>
                                      /household\s*id/i.test(h)
                                    ) ?? "Household ID";
                                  const createKey = importResults.headers.find((h) =>
                                    /create\s*new\s*household/i.test(h)
                                  );
                                  const householdEditValue =
                                    createKey && merged[createKey]?.toLowerCase() === "true"
                                      ? "true"
                                      : householdIdVal;
                                  return (
                                    <TableRow key={fr.rowIndex}>
                                      <TableCell>{fr.rowIndex + 1}</TableCell>
                                      <TableCell>
                                        <Input
                                          placeholder="First Name"
                                          value={firstName}
                                          onChange={(e) =>
                                            setFailedRowEdited(fr.rowIndex, fnKey, e.target.value)
                                          }
                                          className="h-8 text-sm"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          placeholder="Last Name"
                                          value={lastName}
                                          onChange={(e) =>
                                            setFailedRowEdited(fr.rowIndex, lnKey, e.target.value)
                                          }
                                          className="h-8 text-sm"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          placeholder="Household ID or true for new"
                                          value={householdEditValue}
                                          onChange={(e) => {
                                            const v = e.target.value.trim();
                                            const isNew =
                                              ["true", "yes", "new"].includes(
                                                v.toLowerCase()
                                              );
                                            if (createKey) {
                                              setFailedRowEdited(
                                                fr.rowIndex,
                                                createKey,
                                                isNew ? "true" : "false"
                                              );
                                            }
                                            if (hidKey) {
                                              setFailedRowEdited(
                                                fr.rowIndex,
                                                hidKey,
                                                isNew ? "" : v
                                              );
                                            }
                                          }}
                                          className="h-8 text-sm"
                                        />
                                      </TableCell>
                                      <TableCell className="text-red-600 text-xs">
                                        {fr.error}
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs"
                                          onClick={() => setFailedRowEditing(fr.rowIndex, false)}
                                        >
                                          Done
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                }

                                return (
                                  <TableRow key={fr.rowIndex}>
                                    <TableCell>{fr.rowIndex + 1}</TableCell>
                                    <TableCell>{firstName || "—"}</TableCell>
                                    <TableCell>{lastName || "—"}</TableCell>
                                    <TableCell>{householdIdDisplay}</TableCell>
                                    <TableCell className="text-red-600 text-xs">
                                      {fr.error}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs"
                                          onClick={() => setFailedRowSkipped(fr.rowIndex, true)}
                                        >
                                          Skip
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs"
                                          onClick={() => setFailedRowEditing(fr.rowIndex, true)}
                                        >
                                          Edit
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button
                            type="button"
                            onClick={handleRetryFailedRows}
                            disabled={
                              importing ||
                              importResults.failedRows.every((r) => r.skipped)
                            }
                          >
                            {importing ? "Retrying..." : "Retry Failed Rows"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setImportDialogOpen(false);
                              setImportResults(null);
                            }}
                          >
                            Done (skip remaining)
                          </Button>
                        </div>
                      </div>
                    ) : importResults.errors.length > 0 ? (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-red-600">Errors:</p>
                        <ul className="text-xs text-muted-foreground list-disc list-inside mt-1 max-h-32 overflow-y-auto">
                          {importResults.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setImportDialogOpen(false);
                    setImportFile(null);
                    setImportResults(null);
                  }}
                  disabled={importing}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={!importFile || importing}
                  className="cursor-pointer"
                >
                  {importing ? "Importing..." : "Import Members"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
            )}
          </div>

          <Card>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">Households</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm md:text-base">
              Loading households...
            </div>
          ) : households.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm md:text-base">
              No households found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none text-xs md:text-sm"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-2">
                        Household Name
                        {sortBy === "name" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none text-xs md:text-sm"
                      onClick={() => handleSort("type")}
                    >
                      <div className="flex items-center gap-2">
                        Type
                        {sortBy === "type" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-xs md:text-sm">Address</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none text-xs md:text-sm"
                      onClick={() => handleSort("members")}
                    >
                      <div className="flex items-center gap-2">
                        Members
                        {sortBy === "members" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-right text-xs md:text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHouseholds.map((household) => (
                    <TableRow
                      key={household.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/membership/household/${household.id}`)}
                    >
                      <TableCell className="font-medium text-xs md:text-sm">
                        {getHouseholdDisplayName(household)}
                      </TableCell>
                      <TableCell className="text-xs md:text-sm">
                        {household.type ? (
                          <span className="capitalize">{household.type}</span>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell className="text-xs md:text-sm">{getAddressDisplay(household)}</TableCell>
                      <TableCell className="text-xs md:text-sm">{household.memberCount}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            title="View Household"
                            className="cursor-pointer"
                          >
                            <Link href={`/membership/household/${household.id}`}>
                              <EyeIcon className="h-4 w-4" />
                            </Link>
                          </Button>
                          {canEditMembers && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Edit"
                                onClick={() => handleEditClick(household)}
                                className="cursor-pointer"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Delete"
                                onClick={() => handleDeleteClick(household)}
                                className="cursor-pointer"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>

              {/* Pagination Controls */}
              {!loading && pagination.totalPages > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="text-sm text-muted-foreground text-center">
                    Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{" "}
                    {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
                    {pagination.total} households
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
        </TabsContent>

        <TabsContent value="individuals" className="mt-4 space-y-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone"
                  value={memberSearchInput}
                  onChange={(e) => setMemberSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyMemberSearch())}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="default" onClick={applyMemberSearch} className="cursor-pointer">
                  Search
                </Button>
                <Button variant="outline" onClick={clearMemberFilters} className="cursor-pointer">
                  Clear
                </Button>
              </div>
            </div>
            <Collapsible open={memberFiltersOpen} onOpenChange={setMemberFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="cursor-pointer -ml-2">
                  {memberFiltersOpen ? <ChevronUpIcon className="h-4 w-4 mr-1" /> : <ChevronDownIcon className="h-4 w-4 mr-1" />}
                  Advanced filters
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="rounded-lg border bg-muted/30 p-4 mt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium block">Participation</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["active", "inactive", "deceased", "homebound", "military", "school"] as const).map((p) => (
                          <label key={p} className="flex items-center gap-2 cursor-pointer text-sm">
                            <Checkbox
                              checked={memberFiltersDraft.participation?.includes(p) ?? false}
                              onCheckedChange={(checked) => {
                                const current = memberFiltersDraft.participation ?? [];
                                const next = checked ? [...current, p] : current.filter((x) => x !== p);
                                setMemberFiltersDraft((prev) => ({ ...prev, participation: next.length ? next : undefined }));
                              }}
                            />
                            <span className="capitalize">{p}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium block">Sex</label>
                      <div className="flex flex-col gap-2">
                        {(["male", "female", "other"] as const).map((s) => (
                          <label key={s} className="flex items-center gap-2 cursor-pointer text-sm">
                            <Checkbox
                              checked={memberFiltersDraft.sex?.includes(s) ?? false}
                              onCheckedChange={(checked) => {
                                const current = memberFiltersDraft.sex ?? [];
                                const next = checked ? [...current, s] : current.filter((x) => x !== s);
                                setMemberFiltersDraft((prev) => ({ ...prev, sex: next.length ? next : undefined }));
                              }}
                            />
                            <span className="capitalize">{s}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium block">Sequence</label>
                      <div className="flex flex-col gap-2">
                        {(["head_of_house", "spouse", "child"] as const).map((s) => (
                          <label key={s} className="flex items-center gap-2 cursor-pointer text-sm">
                            <Checkbox
                              checked={memberFiltersDraft.sequence?.includes(s) ?? false}
                              onCheckedChange={(checked) => {
                                const current = memberFiltersDraft.sequence ?? [];
                                const next = checked ? [...current, s] : current.filter((x) => x !== s);
                                setMemberFiltersDraft((prev) => ({ ...prev, sequence: next.length ? next : undefined }));
                              }}
                            />
                            <span>
                              {s === "head_of_house" ? "Head of house" : s === "spouse" ? "Spouse" : "Child"}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium block">Household name</label>
                      <Input
                        placeholder="Filter by household name"
                        value={memberFiltersDraft.householdName ?? ""}
                        onChange={(e) => setMemberFiltersDraft((prev) => ({ ...prev, householdName: e.target.value || undefined }))}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button type="button" variant="default" onClick={applyMemberAdvancedFilters} className="cursor-pointer">
                      Apply
                    </Button>
                    <Button type="button" variant="outline" onClick={clearMemberAdvancedFilters} className="cursor-pointer">
                      Clear
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl">Individual Members</CardTitle>
            </CardHeader>
            <CardContent>
              {individualMembersLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm md:text-base">
                  Loading members...
                </div>
              ) : individualMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm md:text-base">
                  No members found. Add members to households to see them here.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs md:text-sm">Name</TableHead>
                          <TableHead className="text-xs md:text-sm">Household</TableHead>
                          <TableHead className="text-xs md:text-sm">Email</TableHead>
                          <TableHead className="text-xs md:text-sm">Phone</TableHead>
                          <TableHead className="text-xs md:text-sm">Status</TableHead>
                          <TableHead className="text-right text-xs md:text-sm">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {individualMembers.map((member) => (
                          <TableRow
                            key={member.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => router.push(`/membership/${member.id}`)}
                          >
                            <TableCell className="font-medium text-xs md:text-sm">
                              {member.firstName}
                              {member.middleName ? ` ${member.middleName} ` : " "}
                              {member.lastName}
                              {member.suffix ? ` ${member.suffix}` : ""}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm">
                              {member.household ? (
                                <Link
                                  href={`/membership/household/${member.household.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-primary hover:underline"
                                >
                                  {member.household.name || `Household ${member.household.id.slice(0, 8)}`}
                                </Link>
                              ) : (
                                "No household"
                              )}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm">{member.email1 || "N/A"}</TableCell>
                            <TableCell className="text-xs md:text-sm">
                              {member.phoneCell1 || member.phoneHome || "N/A"}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getParticipationBadgeClass(member.participation)}`}
                              >
                                {member.participation}
                              </span>
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <Button
                                asChild
                                variant="ghost"
                                size="icon"
                                title="View Member"
                                className="cursor-pointer"
                              >
                                <Link href={`/membership/${member.id}`}>
                                  <EyeIcon className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {!individualMembersLoading && individualMembersPagination.totalPages > 0 && (
                    <div className="mt-6 space-y-4">
                      <div className="text-sm text-muted-foreground text-center">
                        Showing {((individualMembersPagination.page - 1) * individualMembersPagination.pageSize) + 1} to{" "}
                        {Math.min(individualMembersPagination.page * individualMembersPagination.pageSize, individualMembersPagination.total)} of{" "}
                        {individualMembersPagination.total} members
                      </div>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handleIndividualMembersPageChange(individualMembersPage - 1);
                              }}
                              className={
                                individualMembersPage === 1
                                  ? "pointer-events-none opacity-50"
                                  : "cursor-pointer"
                              }
                            />
                          </PaginationItem>

                          {Array.from({ length: individualMembersPagination.totalPages }, (_, i) => i + 1).map(
                            (pageNum) => {
                              const showPage =
                                pageNum === 1 ||
                                pageNum === individualMembersPagination.totalPages ||
                                (pageNum >= individualMembersPage - 1 && pageNum <= individualMembersPage + 1);

                              if (!showPage) {
                                if (
                                  pageNum === individualMembersPage - 2 ||
                                  pageNum === individualMembersPage + 2
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
                                      handleIndividualMembersPageChange(pageNum);
                                    }}
                                    isActive={pageNum === individualMembersPage}
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
                                handleIndividualMembersPageChange(individualMembersPage + 1);
                              }}
                              className={
                                individualMembersPage === individualMembersPagination.totalPages
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
        </TabsContent>
      </Tabs>

      {/* Edit Household Dialog */}
      {canEditMembers && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Household</DialogTitle>
            <DialogDescription>
              Update household information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Household Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Smith Family" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Household Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="family">Family</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="address1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Street address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="address2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address 2</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Apartment, suite, etc." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={editForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="AL">AL - Alabama</SelectItem>
                          <SelectItem value="AK">AK - Alaska</SelectItem>
                          <SelectItem value="AZ">AZ - Arizona</SelectItem>
                          <SelectItem value="AR">AR - Arkansas</SelectItem>
                          <SelectItem value="CA">CA - California</SelectItem>
                          <SelectItem value="CO">CO - Colorado</SelectItem>
                          <SelectItem value="CT">CT - Connecticut</SelectItem>
                          <SelectItem value="DE">DE - Delaware</SelectItem>
                          <SelectItem value="FL">FL - Florida</SelectItem>
                          <SelectItem value="GA">GA - Georgia</SelectItem>
                          <SelectItem value="HI">HI - Hawaii</SelectItem>
                          <SelectItem value="ID">ID - Idaho</SelectItem>
                          <SelectItem value="IL">IL - Illinois</SelectItem>
                          <SelectItem value="IN">IN - Indiana</SelectItem>
                          <SelectItem value="IA">IA - Iowa</SelectItem>
                          <SelectItem value="KS">KS - Kansas</SelectItem>
                          <SelectItem value="KY">KY - Kentucky</SelectItem>
                          <SelectItem value="LA">LA - Louisiana</SelectItem>
                          <SelectItem value="ME">ME - Maine</SelectItem>
                          <SelectItem value="MD">MD - Maryland</SelectItem>
                          <SelectItem value="MA">MA - Massachusetts</SelectItem>
                          <SelectItem value="MI">MI - Michigan</SelectItem>
                          <SelectItem value="MN">MN - Minnesota</SelectItem>
                          <SelectItem value="MS">MS - Mississippi</SelectItem>
                          <SelectItem value="MO">MO - Missouri</SelectItem>
                          <SelectItem value="MT">MT - Montana</SelectItem>
                          <SelectItem value="NE">NE - Nebraska</SelectItem>
                          <SelectItem value="NV">NV - Nevada</SelectItem>
                          <SelectItem value="NH">NH - New Hampshire</SelectItem>
                          <SelectItem value="NJ">NJ - New Jersey</SelectItem>
                          <SelectItem value="NM">NM - New Mexico</SelectItem>
                          <SelectItem value="NY">NY - New York</SelectItem>
                          <SelectItem value="NC">NC - North Carolina</SelectItem>
                          <SelectItem value="ND">ND - North Dakota</SelectItem>
                          <SelectItem value="OH">OH - Ohio</SelectItem>
                          <SelectItem value="OK">OK - Oklahoma</SelectItem>
                          <SelectItem value="OR">OR - Oregon</SelectItem>
                          <SelectItem value="PA">PA - Pennsylvania</SelectItem>
                          <SelectItem value="RI">RI - Rhode Island</SelectItem>
                          <SelectItem value="SC">SC - South Carolina</SelectItem>
                          <SelectItem value="SD">SD - South Dakota</SelectItem>
                          <SelectItem value="TN">TN - Tennessee</SelectItem>
                          <SelectItem value="TX">TX - Texas</SelectItem>
                          <SelectItem value="UT">UT - Utah</SelectItem>
                          <SelectItem value="VT">VT - Vermont</SelectItem>
                          <SelectItem value="VA">VA - Virginia</SelectItem>
                          <SelectItem value="WA">WA - Washington</SelectItem>
                          <SelectItem value="WV">WV - West Virginia</SelectItem>
                          <SelectItem value="WI">WI - Wisconsin</SelectItem>
                          <SelectItem value="WY">WY - Wyoming</SelectItem>
                          <SelectItem value="DC">DC - District of Columbia</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="zip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setSelectedHousehold(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="cursor-pointer">Update Household</Button>
              </DialogFooter>
            </form>
          </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Household Confirmation Dialog */}
      {canEditMembers && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedHousehold?.memberCount && selectedHousehold.memberCount > 0 ? (
                <>
                  This household has {selectedHousehold.memberCount} member{selectedHousehold.memberCount !== 1 ? "s" : ""}. 
                  You cannot delete a household that has members. Please remove all members first or transfer them to another household.
                </>
              ) : (
                "This action cannot be undone. This will permanently delete the household."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {selectedHousehold?.memberCount === 0 && (
              <AlertDialogAction onClick={handleDeleteConfirm}>
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      )}
    </div>
  );
}
