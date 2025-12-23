"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, UploadIcon, TrashIcon, PencilIcon, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

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

interface HouseholdMember {
  firstName: string;
  lastName: string;
}

interface Household {
  id: string;
  name: string | null;
  type: string | null;
  address1: string | null;
  city: string | null;
  state: string | null;
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
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
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
  } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  });

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

  const fetchHouseholds = async (page: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/families?page=${page}&pageSize=50`);
      if (response.ok) {
        const data = await response.json();
        const fetchedHouseholds = data.households || [];
        const paginationInfo = data.pagination || {
          page: 1,
          pageSize: 50,
          total: 0,
          totalPages: 0,
        };

        setHouseholds(fetchedHouseholds);
        setPagination(paginationInfo);
      }
    } catch (error) {
      console.error("Error fetching households:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHouseholds(currentPage);
  }, [currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
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
    try {
      const response = await fetch("/api/families", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        fetchHouseholds(currentPage);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create household");
      }
    } catch (error) {
      console.error("Error creating household:", error);
      alert("Failed to create household");
    }
  };

  const onEditSubmit = async (data: HouseholdFormData) => {
    if (!selectedHousehold) return;

    try {
      const response = await fetch(`/api/families/${selectedHousehold.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
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
        fetchHouseholds(currentPage);
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
      const response = await fetch(`/api/families/${selectedHousehold.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDeleteDialogOpen(false);
        setSelectedHousehold(null);
        fetchHouseholds(currentPage);
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
      const formData = new FormData();
      formData.append("file", importFile);

      const response = await fetch("/api/members/bulk-import", {
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
        fetchHouseholds(currentPage);
        setImportFile(null);
        const fileInput = document.getElementById("csv-file-input") as HTMLInputElement;
        if (fileInput) {
          fileInput.value = "";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Membership</h1>
          <p className="text-muted-foreground mt-2">
            Manage households and their members
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="cursor-pointer">
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Household
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-3 gap-4">
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
                    <Button type="submit" className="cursor-pointer">Create Household</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="cursor-pointer">
                <UploadIcon className="mr-2 h-4 w-4" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Import Members</DialogTitle>
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
                    <h4 className="font-medium mb-2">Import Results:</h4>
                    <p className="text-sm">
                      <span className="text-green-600">
                        Successfully imported: {importResults.success}
                      </span>
                      <br />
                      <span className="text-red-600">
                        Failed: {importResults.failed}
                      </span>
                    </p>
                    {importResults.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-red-600">Errors:</p>
                        <ul className="text-xs text-muted-foreground list-disc list-inside mt-1 max-h-32 overflow-y-auto">
                          {importResults.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
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
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Households</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading households...
            </div>
          ) : households.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No households found. Create your first household to get started.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
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
                      className="cursor-pointer hover:bg-muted/50 select-none"
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
                    <TableHead>Address</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHouseholds.map((household) => (
                    <TableRow
                      key={household.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/membership/household/${household.id}`)}
                    >
                      <TableCell className="font-medium">
                        {getHouseholdDisplayName(household)}
                      </TableCell>
                      <TableCell>
                        {household.type ? (
                          <span className="capitalize">{household.type}</span>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>{getAddressDisplay(household)}</TableCell>
                      <TableCell>{household.memberCount}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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

      {/* Edit Household Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-3 gap-4">
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

      {/* Delete Household Confirmation Dialog */}
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
    </div>
  );
}
