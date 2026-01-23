"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { PencilIcon, SaveIcon, XIcon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { usePermissions } from "@/lib/hooks/use-permissions";

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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Member {
  id: string;
  householdId: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  preferredName: string | null;
  maidenName: string | null;
  title: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  email1: string | null;
  email2: string | null;
  phoneHome: string | null;
  phoneCell1: string | null;
  phoneCell2: string | null;
  baptismDate: string | null;
  confirmationDate: string | null;
  receivedBy: string | null;
  dateReceived: string | null;
  removedBy: string | null;
  dateRemoved: string | null;
  deceasedDate: string | null;
  membershipCode: string | null;
  envelopeNumber: number | null;
  participation: string;
  createdAt: string;
  updatedAt: string;
  headOfHousehold: {
    id: string;
    firstName: string;
    lastName: string;
    isCurrentMember: boolean;
  } | null;
}

interface HouseholdMember {
  firstName: string;
  lastName: string;
}

interface Household {
  id: string;
  name: string | null;
  type: string | null;
  members: HouseholdMember[];
}

interface MemberFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  preferredName: string;
  maidenName: string;
  title: string;
  sex: string;
  dateOfBirth: string;
  email1: string;
  email2: string;
  phoneHome: string;
  phoneCell1: string;
  phoneCell2: string;
  baptismDate: string;
  confirmationDate: string;
  receivedBy: string;
  dateReceived: string;
  removedBy: string;
  dateRemoved: string;
  deceasedDate: string;
  membershipCode: string;
  participation: string;
  householdId: string;
  envelopeNumber: string;
}

export default function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canEditMembers } = usePermissions();
  const [member, setMember] = useState<Member | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [memberId, setMemberId] = useState<string>("");

  const form = useForm<MemberFormData>({
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      suffix: "",
      preferredName: "",
      maidenName: "",
      title: "",
      sex: "",
      dateOfBirth: "",
      email1: "",
      email2: "",
      phoneHome: "",
      phoneCell1: "",
      phoneCell2: "",
      baptismDate: "",
      confirmationDate: "",
      receivedBy: "",
      dateReceived: "",
      removedBy: "",
      dateRemoved: "",
      deceasedDate: "",
      membershipCode: "",
      participation: "active",
      householdId: "",
      envelopeNumber: "",
    },
  });

  const formatDateInput = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      const parts = dateString.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const localDate = new Date(year, month, day);
        const y = localDate.getFullYear();
        const m = String(localDate.getMonth() + 1).padStart(2, "0");
        const d = String(localDate.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const fetchMember = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/members/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMember(data.member);
        form.reset({
          firstName: data.member.firstName || "",
          middleName: data.member.middleName || "",
          lastName: data.member.lastName || "",
          suffix: data.member.suffix || "",
          preferredName: data.member.preferredName || "",
          maidenName: data.member.maidenName || "",
          title: data.member.title || "",
          sex: data.member.sex || "",
          dateOfBirth: formatDateInput(data.member.dateOfBirth) || "",
          email1: data.member.email1 || "",
          email2: data.member.email2 || "",
          phoneHome: data.member.phoneHome || "",
          phoneCell1: data.member.phoneCell1 || "",
          phoneCell2: data.member.phoneCell2 || "",
          baptismDate: formatDateInput(data.member.baptismDate) || "",
          confirmationDate: formatDateInput(data.member.confirmationDate) || "",
          receivedBy: data.member.receivedBy || "",
          dateReceived: formatDateInput(data.member.dateReceived) || "",
          removedBy: data.member.removedBy || "",
          dateRemoved: formatDateInput(data.member.dateRemoved) || "",
          deceasedDate: formatDateInput(data.member.deceasedDate) || "",
          membershipCode: data.member.membershipCode || "",
          participation: data.member.participation || "active",
          householdId: data.member.householdId || "",
          envelopeNumber: data.member.envelopeNumber ? String(data.member.envelopeNumber) : "",
        });
      } else {
        console.error("Failed to fetch member");
      }
    } catch (error) {
      console.error("Error fetching member:", error);
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    const init = async () => {
      const resolvedParams = await params;
      const id = resolvedParams.id;
      setMemberId(id);
      const editParam = searchParams.get("edit");
      setIsEditMode(editParam === "true");
      await fetchMember(id);
      await fetchHouseholds();
    };
    init();
  }, [params, searchParams, fetchMember]);

  const fetchHouseholds = async () => {
    try {
      const response = await fetch("/api/families?page=1&pageSize=1000");
      if (response.ok) {
        const data = await response.json();
        setHouseholds(data.households || []);
      }
    } catch (error) {
      console.error("Error fetching households:", error);
    }
  };

  const getHouseholdDisplayName = (household: Household): string => {
    if (household.name) {
      return household.name;
    }
    if (household.members.length === 0) {
      return `Household ${household.id.slice(0, 8)}`;
    }
    if (household.members.length === 1) {
      return `${household.members[0].firstName} ${household.members[0].lastName}`;
    }
    if (household.members.length === 2) {
      return `${household.members[0].firstName} & ${household.members[1].firstName} ${household.members[1].lastName}`;
    }
    return `${household.members[0].firstName} ${household.members[0].lastName} (+${household.members.length - 1})`;
  };

  const onSubmit = async (data: MemberFormData) => {
    if (!data.firstName || !data.lastName) {
      alert("First name and last name are required");
      return;
    }

    if (!data.householdId) {
      alert("Household is required. All members must belong to a household.");
      return;
    }

    try {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || null,
        suffix: data.suffix || null,
        preferredName: data.preferredName || null,
        maidenName: data.maidenName || null,
        title: data.title || null,
        sex: data.sex || null,
        dateOfBirth: data.dateOfBirth || null,
        email1: data.email1 || null,
        email2: data.email2 || null,
        phoneHome: data.phoneHome || null,
        phoneCell1: data.phoneCell1 || null,
        phoneCell2: data.phoneCell2 || null,
        baptismDate: data.baptismDate || null,
        confirmationDate: data.confirmationDate || null,
        receivedBy: data.receivedBy || null,
        dateReceived: data.dateReceived || null,
        removedBy: data.removedBy || null,
        dateRemoved: data.dateRemoved || null,
        deceasedDate: data.deceasedDate || null,
        membershipCode: data.membershipCode || null,
        participation: data.participation || "active",
        householdId: data.householdId || null,
        envelopeNumber: data.envelopeNumber ? parseInt(data.envelopeNumber, 10) : null,
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
          <Button asChild variant="outline">
            <Link href="/membership">Back to Households</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {member.preferredName || member.firstName} {member.lastName}
              {member.suffix ? ` ${member.suffix}` : ""}
            </h1>
            <p className="text-muted-foreground mt-2">Member Details</p>
          </div>
          <div className="flex gap-2">
            {!isEditMode ? (
              <>
                <Button asChild variant="outline">
                  <Link href={`/membership/${memberId}?edit=true`}>
                    <PencilIcon className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/membership">Back</Link>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditMode(false);
                    router.push(`/membership/${memberId}`);
                  }}
                  className="cursor-pointer"
                >
                  <XIcon className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={form.handleSubmit(onSubmit)} className="cursor-pointer">
                  <SaveIcon className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="cursor-pointer">
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
              </>
            )}
          </div>
        </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className={`space-y-6 ${isEditMode ? 'mb-0' : ''}`}>
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
                      name="middleName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Middle Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="preferredName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <>
                    {member.middleName && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Middle Name
                        </label>
                        <p className="mt-1 text-sm">{member.middleName}</p>
                      </div>
                    )}
                    {member.preferredName && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Preferred Name
                        </label>
                        <p className="mt-1 text-sm">{member.preferredName}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {isEditMode ? (
                  <>
                    <FormField
                      control={form.control}
                      name="suffix"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Suffix</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Jr., Sr., III, etc." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Mr., Mrs., Dr., etc." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <>
                    {member.suffix && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Suffix
                        </label>
                        <p className="mt-1 text-sm">{member.suffix}</p>
                      </div>
                    )}
                    {member.title && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Title
                        </label>
                        <p className="mt-1 text-sm">{member.title}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {isEditMode ? (
                  <>
                    <FormField
                      control={form.control}
                      name="maidenName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maiden Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sex"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sex</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select sex" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <>
                    {member.maidenName && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Maiden Name
                        </label>
                        <p className="mt-1 text-sm">{member.maidenName}</p>
                      </div>
                    )}
                    {member.sex && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Sex
                        </label>
                        <p className="mt-1 text-sm capitalize">{member.sex}</p>
                      </div>
                    )}
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
                      name="email1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email 1</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email 2</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
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
                        Email 1
                      </label>
                      <p className="mt-1 text-sm">{member.email1 || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Email 2
                      </label>
                      <p className="mt-1 text-sm">{member.email2 || "N/A"}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                {isEditMode ? (
                  <>
                    <FormField
                      control={form.control}
                      name="phoneHome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Home</FormLabel>
                          <FormControl>
                            <Input type="tel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phoneCell1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Cell 1</FormLabel>
                          <FormControl>
                            <Input type="tel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phoneCell2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Cell 2</FormLabel>
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
                        Phone Home
                      </label>
                      <p className="mt-1 text-sm">{member.phoneHome || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Phone Cell 1
                      </label>
                      <p className="mt-1 text-sm">{member.phoneCell1 || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Phone Cell 2
                      </label>
                      <p className="mt-1 text-sm">{member.phoneCell2 || "N/A"}</p>
                    </div>
                  </>
                )}
              </div>
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="participation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Participation Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="deceased">Deceased</SelectItem>
                            <SelectItem value="homebound">Homebound</SelectItem>
                            <SelectItem value="military">Military</SelectItem>
                            <SelectItem value="school">School</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="householdId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Household *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select household" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {households.map((household) => (
                                <SelectItem key={household.id} value={household.id}>
                                  {getHouseholdDisplayName(household)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="confirmationDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmation Date</FormLabel>
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
                      name="receivedBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Received By</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="baptism">Baptism</SelectItem>
                              <SelectItem value="confirmation">Confirmation</SelectItem>
                              <SelectItem value="transfer">Transfer</SelectItem>
                              <SelectItem value="profession">Profession</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dateReceived"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date Received</FormLabel>
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
                      name="membershipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Membership Code</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="envelopeNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Envelope Number</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} placeholder="Enter envelope number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="removedBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Removed By</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select reason" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="death">Death</SelectItem>
                              <SelectItem value="excommunication">Excommunication</SelectItem>
                              <SelectItem value="inactivity">Inactivity</SelectItem>
                              <SelectItem value="moved_no_transfer">Moved (No Transfer)</SelectItem>
                              <SelectItem value="released">Released</SelectItem>
                              <SelectItem value="removed_by_request">Removed by Request</SelectItem>
                              <SelectItem value="transfer">Transfer</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dateRemoved"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date Removed</FormLabel>
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
                  </div>
                  <FormField
                    control={form.control}
                    name="deceasedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deceased Date</FormLabel>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Participation Status
                      </label>
                      <p className="mt-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            member.participation?.toLowerCase() === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : member.participation?.toLowerCase() === "inactive"
                                ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                                : member.participation?.toLowerCase() === "deceased"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  : member.participation?.toLowerCase() === "homebound" ||
                                      member.participation?.toLowerCase() === "military" ||
                                      member.participation?.toLowerCase() === "school"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {member.participation}
                        </span>
                      </p>
                    </div>
                    {member.householdId && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Household
                        </label>
                        <p className="mt-1 text-sm">
                          <Link
                            href={`/membership/household/${member.householdId}`}
                            className="text-primary hover:underline"
                          >
                            View Household
                          </Link>
                        </p>
                      </div>
                    )}
                  </div>
                  {member.headOfHousehold && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Head of Household
                      </label>
                      <p className="mt-1 text-sm">
                        {member.headOfHousehold.isCurrentMember ? (
                          <span className="font-medium">You (this member)</span>
                        ) : (
                          <Link
                            href={`/membership/${member.headOfHousehold.id}`}
                            className="text-primary hover:underline"
                          >
                            {member.headOfHousehold.firstName} {member.headOfHousehold.lastName}
                          </Link>
                        )}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {member.confirmationDate && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Confirmation Date
                        </label>
                        <p className="mt-1 text-sm">
                          {formatDate(member.confirmationDate)}
                        </p>
                      </div>
                    )}
                    {member.receivedBy && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Received By
                        </label>
                        <p className="mt-1 text-sm capitalize">{member.receivedBy}</p>
                      </div>
                    )}
                  </div>
                  {member.dateReceived && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Date Received
                      </label>
                      <p className="mt-1 text-sm">
                        {formatDate(member.dateReceived)}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {member.membershipCode && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Membership Code
                        </label>
                        <p className="mt-1 text-sm">{member.membershipCode}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Envelope Number
                      </label>
                      <p className="mt-1 text-sm">{member.envelopeNumber || "N/A"}</p>
                    </div>
                  </div>
                  {(member.removedBy || member.dateRemoved) && (
                    <div className="grid grid-cols-2 gap-4">
                      {member.removedBy && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Removed By
                          </label>
                          <p className="mt-1 text-sm">{member.removedBy}</p>
                        </div>
                      )}
                      {member.dateRemoved && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Date Removed
                          </label>
                          <p className="mt-1 text-sm">
                            {formatDate(member.dateRemoved)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {member.deceasedDate && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Deceased Date
                      </label>
                      <p className="mt-1 text-sm">
                        {formatDate(member.deceasedDate)}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          </form>
        </Form>
    </div>
  );
}
