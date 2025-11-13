"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { PencilIcon, SaveIcon, XIcon, TrashIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
}

export default function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [member, setMember] = useState<Member | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [memberId, setMemberId] = useState<string>("");

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
    },
  });

  const formatDateInput = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  useEffect(() => {
    const init = async () => {
      const resolvedParams = await params;
      const id = resolvedParams.id;
      setMemberId(id);
      const editParam = searchParams.get("edit");
      setIsEditMode(editParam === "true");
      await fetchMember(id);
      await fetchFamilies();
    };
    init();
  }, [params, searchParams]);

  const fetchMember = async (id: string) => {
    try {
      const response = await fetch(`/api/members/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMember(data.member);
        // Populate form with member data
        form.reset({
          firstName: data.member.firstName || "",
          lastName: data.member.lastName || "",
          membershipDate: formatDateInput(data.member.membershipDate) || "",
          email: data.member.email || "",
          phone: data.member.phone || "",
          addressLine1: data.member.addressLine1 || "",
          addressLine2: data.member.addressLine2 || "",
          city: data.member.city || "",
          state: data.member.state || "",
          zipCode: data.member.zipCode || "",
          dateOfBirth: formatDateInput(data.member.dateOfBirth) || "",
          baptismDate: formatDateInput(data.member.baptismDate) || "",
          membershipStatus: data.member.membershipStatus || "active",
          familyId: data.member.familyId || "__none__",
          familyRole: data.member.familyRole || "__none__",
          notes: data.member.notes || "",
          photoUrl: data.member.photoUrl || "",
        });
      } else {
        console.error("Failed to fetch member");
      }
    } catch (error) {
      console.error("Error fetching member:", error);
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

  const onSubmit = async (data: MemberFormData) => {
    // Validate required fields
    if (!data.firstName || !data.lastName || !data.membershipDate) {
      alert("First name, last name, and membership date are required");
      return;
    }

    try {
      const payload = {
        ...data,
        familyId: data.familyId === "__none__" || !data.familyId ? null : data.familyId,
        email: data.email || null,
        phone: data.phone || null,
        addressLine1: data.addressLine1 || null,
        addressLine2: data.addressLine2 || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        dateOfBirth: data.dateOfBirth || null,
        baptismDate: data.baptismDate || null,
        familyRole: data.familyRole === "__none__" || !data.familyRole ? null : data.familyRole,
        notes: data.notes || null,
        photoUrl: data.photoUrl || null,
      };

      const response = await fetch(`/api/members/${memberId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsEditMode(false);
        await fetchMember(memberId);
        router.push(`/membership/${memberId}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update member");
      }
    } catch (error) {
      console.error("Error updating member:", error);
      alert("Failed to update member");
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/membership");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete member");
      }
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Failed to delete member");
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          Loading member details...
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          Member not found
        </div>
        <div className="text-center">
          <Link href="/membership">
            <Button variant="outline">Back to Members</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {member.firstName} {member.lastName}
          </h1>
          <p className="text-muted-foreground mt-2">Member Details</p>
        </div>
        <div className="flex gap-2">
          {!isEditMode ? (
            <>
              <Link href={`/membership/${memberId}?edit=true`}>
                <Button variant="outline">
                  <PencilIcon className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <Link href="/membership">
                <Button variant="outline">Back</Button>
              </Link>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditMode(false);
                  router.push(`/membership/${memberId}`);
                }}
              >
                <XIcon className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={form.handleSubmit(onSubmit)}>
                <SaveIcon className="mr-2 h-4 w-4" />
                Save
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <TrashIcon className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      this member record.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {isEditMode ? (
                  <>
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input {...field} required />
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
                            <Input {...field} required />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        First Name
                      </label>
                      <p className="mt-1 text-sm">{member.firstName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Last Name
                      </label>
                      <p className="mt-1 text-sm">{member.lastName}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {isEditMode ? (
                  <>
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={formatDateInput(field.value)}
                            />
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
                            <Input
                              type="date"
                              {...field}
                              value={formatDateInput(field.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Date of Birth
                      </label>
                      <p className="mt-1 text-sm">
                        {formatDate(member.dateOfBirth)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Baptism Date
                      </label>
                      <p className="mt-1 text-sm">
                        {formatDate(member.baptismDate)}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {isEditMode ? (
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
              ) : (
                member.photoUrl && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Photo
                    </label>
                    <div className="mt-1">
                      <img
                        src={member.photoUrl}
                        alt={`${member.firstName} ${member.lastName}`}
                        className="h-32 w-32 rounded-md object-cover"
                      />
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {isEditMode ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Email
                      </label>
                      <p className="mt-1 text-sm">{member.email || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Phone
                      </label>
                      <p className="mt-1 text-sm">{member.phone || "N/A"}</p>
                    </div>
                  </>
                )}
              </div>

              {isEditMode ? (
                <>
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
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Address
                    </label>
                    <p className="mt-1 text-sm">
                      {member.addressLine1 || "N/A"}
                      {member.addressLine2 && `, ${member.addressLine2}`}
                      {member.city && `, ${member.city}`}
                      {member.state && `, ${member.state}`}
                      {member.zipCode && ` ${member.zipCode}`}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Membership Information */}
          <Card>
            <CardHeader>
              <CardTitle>Membership Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditMode ? (
                <>
                  <FormField
                    control={form.control}
                    name="membershipDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Membership Date *</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={formatDateInput(field.value)}
                            required
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                  </div>
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
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Member Since
                    </label>
                    <p className="mt-1 text-sm">
                      {formatDate(member.membershipDate)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Status
                      </label>
                      <p className="mt-1">
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
                      </p>
                    </div>
                    {member.familyId && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Family
                        </label>
                        <p className="mt-1 text-sm">
                          <Link
                            href={`/membership/family/${member.familyId}`}
                            className="text-primary hover:underline"
                          >
                            Family {member.familyId.slice(0, 8)}
                          </Link>
                        </p>
                      </div>
                    )}
                  </div>
                  {member.familyRole && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Family Role
                      </label>
                      <p className="mt-1 text-sm">{member.familyRole}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditMode ? (
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea {...field} rows={5} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {member.notes || "No notes"}
                </p>
              )}
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}

