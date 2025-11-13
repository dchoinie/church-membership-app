"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { PlusIcon, EyeIcon, PencilIcon, UsersIcon, UploadIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Member {
  id: string;
  familyId: string | null;
  firstName: string;
  lastName: string;
  membershipDate: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  dateOfBirth: string | null;
  baptismDate: string | null;
  membershipStatus: string;
  familyRole: string | null;
  notes: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FamilyMember {
  firstName: string;
  lastName: string;
}

interface Family {
  id: string;
  parentFamilyId: string | null;
  members: FamilyMember[];
}

interface MemberFormData {
  firstName: string;
  lastName: string;
  membershipDate: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  dateOfBirth: string;
  baptismDate: string;
  membershipStatus: string;
  familyId: string;
  familyRole: string;
  notes: string;
  photoUrl: string;
  // New family flag
  createNewFamily: boolean;
}

export default function MembershipPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const form = useForm<MemberFormData>({
    defaultValues: {
      firstName: "",
      lastName: "",
      membershipDate: "",
      email: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      dateOfBirth: "",
      baptismDate: "",
      membershipStatus: "active",
      familyId: "",
      familyRole: "",
      notes: "",
      photoUrl: "",
      createNewFamily: false,
    },
    mode: "onChange",
  });

  const createNewFamily = form.watch("createNewFamily");

  useEffect(() => {
    fetchMembers();
    fetchFamilies();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch("/api/members");
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilies = async () => {
    try {
      const response = await fetch("/api/families");
      if (response.ok) {
        const data = await response.json();
        setFamilies(data.families || []);
      }
    } catch (error) {
      console.error("Error fetching families:", error);
    }
  };

  const getFamilyDisplayName = (family: Family): string => {
    if (family.members.length === 0) {
      return `Family ${family.id.slice(0, 8)}`;
    }
    if (family.members.length === 1) {
      return `Family of ${family.members[0].firstName} ${family.members[0].lastName}`;
    }
    if (family.members.length === 2) {
      return `Family of ${family.members[0].firstName} & ${family.members[1].firstName} ${family.members[1].lastName}`;
    }
    return `Family of ${family.members[0].firstName} ${family.members[0].lastName} (+${family.members.length - 1})`;
  };

  const getFamilyDisplayNameWithParent = (family: Family): string => {
    const baseName = getFamilyDisplayName(family);
    if (family.parentFamilyId) {
      const parent = families.find((f) => f.id === family.parentFamilyId);
      if (parent) {
        return `${baseName} (in ${getFamilyDisplayName(parent)})`;
      }
    }
    return baseName;
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
        // Refresh members list
        await fetchMembers();
        // Clear file input
        setImportFile(null);
        // Reset file input element
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

  const onSubmit = async (data: MemberFormData) => {
    // Validate required fields
    if (!data.firstName || !data.lastName || !data.membershipDate) {
      alert("First name, last name, and membership date are required");
      return;
    }

    try {
      interface MemberPayload {
        firstName: string;
        lastName: string;
        membershipDate: string;
        email: string | null;
        phone: string | null;
        addressLine1: string | null;
        addressLine2: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        dateOfBirth: string | null;
        baptismDate: string | null;
        membershipStatus: string;
        familyRole: string | null;
        notes: string | null;
        photoUrl: string | null;
        familyId?: string | null;
        createNewFamily?: boolean;
      }

      const payload: MemberPayload = {
        firstName: data.firstName,
        lastName: data.lastName,
        membershipDate: data.membershipDate,
        email: data.email || null,
        phone: data.phone || null,
        addressLine1: data.addressLine1 || null,
        addressLine2: data.addressLine2 || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        dateOfBirth: data.dateOfBirth || null,
        baptismDate: data.baptismDate || null,
        membershipStatus: data.membershipStatus || "active",
        familyRole: data.familyRole === "__none__" || !data.familyRole ? null : data.familyRole,
        notes: data.notes || null,
        photoUrl: data.photoUrl || null,
      };

      // Handle family assignment
      if (data.createNewFamily) {
        // Create new family (empty container)
        payload.createNewFamily = true;
        payload.familyId = null; // Will be set after family creation
      } else {
        // Use existing family or none
        payload.familyId = data.familyId === "__none__" || !data.familyId ? null : data.familyId;
      }

      const response = await fetch("/api/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setDialogOpen(false);
        form.reset();
        fetchMembers();
        fetchFamilies(); // Refresh families list
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create member");
      }
    } catch (error) {
      console.error("Error creating member:", error);
      alert("Failed to create member");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Membership</h1>
          <p className="text-muted-foreground mt-2">
            Manage church members and their information
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="cursor-pointer">
                <PlusIcon className="mr-2 h-4 w-4" />
                Add New Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Member</DialogTitle>
                <DialogDescription>
                  Enter the member&apos;s information below.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="membershipDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Membership Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} required />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="addressLine1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 1</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                <FormField
                  control={form.control}
                  name="membershipDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Membership Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} required />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input type="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 1</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="addressLine2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 2</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
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
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="baptismDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Baptism Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="membershipStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Membership Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="transferred">Transferred</SelectItem>
                            <SelectItem value="deceased">Deceased</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {!createNewFamily ? (
                    <FormField
                      control={form.control}
                      name="familyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Family</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select family" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {families
                                .filter((f) => !f.parentFamilyId)
                                .map((family) => (
                                  <SelectItem key={family.id} value={family.id}>
                                    {getFamilyDisplayName(family)} (Extended)
                                  </SelectItem>
                                ))}
                              {families
                                .filter((f) => f.parentFamilyId)
                                .map((family) => (
                                  <SelectItem key={family.id} value={family.id}>
                                    {getFamilyDisplayNameWithParent(family)}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormItem>
                      <FormLabel>Family</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Creating new family
                      </div>
                    </FormItem>
                  )}
                </div>

                {/* Create New Family Toggle */}
                <FormField
                  control={form.control}
                  name="createNewFamily"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Create New Family</FormLabel>
                        <FormDescription className="text-xs">
                          Check this to create a new family for this member
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="familyRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Family Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          <SelectItem value="father">Father</SelectItem>
                          <SelectItem value="mother">Mother</SelectItem>
                          <SelectItem value="son">Son</SelectItem>
                          <SelectItem value="daughter">Daughter</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="photoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Photo URL</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Textarea {...field} rows={3} />
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
                  <Button type="submit">Create Member</Button>
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
                  Upload a CSV file to import multiple members at once. Download the example CSV to see the required format.
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
                    Required columns: First Name, Last Name, Membership Date
                    <br />
                    Optional columns: Email, Phone, Address Line 1, Address Line 2, City, State, Zip Code, Date of Birth, Baptism Date, Membership Status, Family Role, Notes, Photo URL
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
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={!importFile || importing}
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
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading members...
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No members found. Add your first member to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Member Since</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.firstName}
                    </TableCell>
                    <TableCell>{member.lastName}</TableCell>
                    <TableCell>{formatDate(member.membershipDate)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          member.membershipStatus?.toLowerCase() === "active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : member.membershipStatus?.toLowerCase() === "inactive"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : member.membershipStatus?.toLowerCase() === "pending"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                : member.membershipStatus?.toLowerCase() === "deceased" ||
                                    member.membershipStatus?.toLowerCase() === "transferred"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {member.membershipStatus}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/membership/${member.id}`}>
                          <Button variant="ghost" size="icon" title="View">
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                        </Link>
                        {member.familyId && (
                          <Link href={`/membership/family/${member.familyId}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="View Family"
                            >
                              <UsersIcon className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        <Link href={`/membership/${member.id}?edit=true`}>
                          <Button variant="ghost" size="icon" title="Edit">
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
