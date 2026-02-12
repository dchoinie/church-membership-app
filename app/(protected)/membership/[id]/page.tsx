"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { useSWRConfig } from "swr";
import { PencilIcon, SaveIcon, XIcon, TrashIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { ChurchLoadingIndicator } from "@/components/ui/church-loading";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useMember } from "@/lib/hooks/use-member";
import { useHouseholds } from "@/lib/hooks/use-households";
import { apiFetch } from "@/lib/api-client";

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
  weddingAnniversaryDate: string | null;
  receivedBy: string | null;
  dateReceived: string | null;
  removedBy: string | null;
  dateRemoved: string | null;
  deceasedDate: string | null;
  membershipCode: string | null;
  envelopeNumber: number | null;
  participation: string;
  sequence: string | null;
  createdAt: string;
  updatedAt: string;
  headOfHousehold: {
    id: string;
    firstName: string;
    lastName: string;
    isCurrentMember: boolean;
  } | null;
}

/** View-mode field cell with darker label strip for clear separation */
function FieldDisplay({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const display = children ?? (value ?? "—");
  return (
    <div className="rounded-lg border bg-muted/30 overflow-hidden">
      <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/60 dark:bg-muted/80 uppercase tracking-wide">
        {label}
      </div>
      <div className="px-3 py-2.5 text-sm min-h-9 flex items-center">
        {display}
      </div>
    </div>
  );
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
  weddingAnniversaryDate: string;
  receivedBy: string;
  dateReceived: string;
  removedBy: string;
  dateRemoved: string;
  deceasedDate: string;
  membershipCode: string;
  participation: string;
  sequence: string;
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
  const { mutate: globalMutate } = useSWRConfig();
  const { canEditMembers } = usePermissions();
  const [memberId, setMemberId] = useState<string>("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { member, isLoading: loading, mutate: mutateMember } = useMember(memberId || null);
  const { households } = useHouseholds(1, 1000);

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
      weddingAnniversaryDate: "",
      receivedBy: "",
      dateReceived: "",
      removedBy: "",
      dateRemoved: "",
      deceasedDate: "",
      membershipCode: "",
      participation: "active",
      sequence: "",
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

  useEffect(() => {
    params.then((resolved) => {
      setMemberId(resolved.id);
      const editParam = searchParams.get("edit");
      setIsEditMode(editParam === "true");
    });
  }, [params, searchParams]);

  useEffect(() => {
    if (member) {
      form.reset({
        firstName: member.firstName || "",
        middleName: (member.middleName as string) || "",
        lastName: member.lastName || "",
        suffix: (member.suffix as string) || "",
        preferredName: (member.preferredName as string) || "",
        maidenName: (member.maidenName as string) || "",
        title: (member.title as string) || "",
        sex: (member.sex as string) || "",
        dateOfBirth: formatDateInput(member.dateOfBirth as string) || "",
        email1: (member.email1 as string) || "",
        email2: (member.email2 as string) || "",
        phoneHome: (member.phoneHome as string) || "",
        phoneCell1: (member.phoneCell1 as string) || "",
        phoneCell2: (member.phoneCell2 as string) || "",
        baptismDate: formatDateInput(member.baptismDate as string) || "",
        confirmationDate: formatDateInput(member.confirmationDate as string) || "",
        weddingAnniversaryDate: formatDateInput(member.weddingAnniversaryDate as string) || "",
        receivedBy: (member.receivedBy as string) || "",
        dateReceived: formatDateInput(member.dateReceived as string) || "",
        removedBy: (member.removedBy as string) || "",
        dateRemoved: formatDateInput(member.dateRemoved as string) || "",
        deceasedDate: formatDateInput(member.deceasedDate as string) || "",
        membershipCode: (member.membershipCode as string) || "",
        participation: (member.participation as string) || "active",
        sequence: (member.sequence as string) || "",
        householdId: (member.householdId as string) || "",
        envelopeNumber: member.envelopeNumber ? String(member.envelopeNumber) : "",
      });
    }
  }, [member, form]);

  const getHouseholdDisplayName = (household: (typeof households)[0]): string => {
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

    setIsSaving(true);
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
        weddingAnniversaryDate: data.weddingAnniversaryDate || null,
        receivedBy: data.receivedBy || null,
        dateReceived: data.dateReceived || null,
        removedBy: data.removedBy || null,
        dateRemoved: data.dateRemoved || null,
        deceasedDate: data.deceasedDate || null,
        membershipCode: data.membershipCode || null,
        participation: data.participation || "active",
        sequence: data.sequence || null,
        householdId: data.householdId || null,
        envelopeNumber: data.envelopeNumber ? parseInt(data.envelopeNumber, 10) : null,
      };

      const response = await apiFetch(`/api/members/${memberId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsEditMode(false);
        mutateMember();
        globalMutate((k) => typeof k === "string" && k.startsWith("/api/families"));
        router.push(`/membership/${memberId}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update member");
      }
    } catch (error) {
      console.error("Error updating member:", error);
      alert("Failed to update member");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await apiFetch(`/api/members/${memberId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        globalMutate((k) => typeof k === "string" && (k.startsWith("/api/families") || k.startsWith("/api/members")));
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

  const formatDate = (dateString: string | null | undefined) => {
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
        <div className="text-center py-8">
          <ChurchLoadingIndicator size="md" label="Loading member details..." />
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
                <Button
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={isSaving}
                  className="cursor-pointer"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <SaveIcon className="mr-2 h-4 w-4" />
                  )}
                  {isSaving ? "Saving..." : "Save"}
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
          </div>
        </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className={`space-y-6 ${isEditMode ? 'mb-0' : ''}`}>
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditMode ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem><FormLabel>First Name *</FormLabel><FormControl><Input {...field} required /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="middleName" render={({ field }) => (
                    <FormItem><FormLabel>Middle Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem><FormLabel>Last Name *</FormLabel><FormControl><Input {...field} required /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="suffix" render={({ field }) => (
                    <FormItem><FormLabel>Suffix</FormLabel><FormControl><Input {...field} placeholder="Jr., Sr., III" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="preferredName" render={({ field }) => (
                    <FormItem><FormLabel>Preferred Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="maidenName" render={({ field }) => (
                    <FormItem><FormLabel>Maiden Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} placeholder="Mr., Mrs., Dr." /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="sex" render={({ field }) => (
                    <FormItem><FormLabel>Sex</FormLabel><Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                    </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                    <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} value={formatDateInput(field.value)} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="baptismDate" render={({ field }) => (
                    <FormItem><FormLabel>Baptism Date</FormLabel><FormControl><Input type="date" {...field} value={formatDateInput(field.value)} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <FieldDisplay label="First Name" value={member.firstName} />
                  <FieldDisplay label="Middle Name" value={member.middleName ?? undefined} />
                  <FieldDisplay label="Last Name" value={member.lastName} />
                  <FieldDisplay label="Suffix" value={member.suffix ?? undefined} />
                  <FieldDisplay label="Preferred Name" value={member.preferredName ?? undefined} />
                  <FieldDisplay label="Maiden Name" value={member.maidenName ?? undefined} />
                  <FieldDisplay label="Title" value={member.title ?? undefined} />
                  <FieldDisplay label="Sex" value={member.sex ? member.sex.charAt(0).toUpperCase() + member.sex.slice(1) : undefined} />
                  <FieldDisplay label="Date of Birth" value={member.dateOfBirth ? formatDate(member.dateOfBirth) : undefined} />
                  <FieldDisplay label="Baptism Date" value={member.baptismDate ? formatDate(member.baptismDate) : undefined} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditMode ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="email1" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email2" render={({ field }) => (
                    <FormItem><FormLabel>Email 2</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phoneHome" render={({ field }) => (
                    <FormItem><FormLabel>Phone Home</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phoneCell1" render={({ field }) => (
                    <FormItem><FormLabel>Phone Cell 1</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phoneCell2" render={({ field }) => (
                    <FormItem><FormLabel>Phone Cell 2</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  <FieldDisplay label="Email" value={member.email1 ?? undefined} />
                  <FieldDisplay label="Email 2" value={member.email2 ?? undefined} />
                  <FieldDisplay label="Phone Home" value={member.phoneHome ?? undefined} />
                  <FieldDisplay label="Phone Cell 1" value={member.phoneCell1 ?? undefined} />
                  <FieldDisplay label="Phone Cell 2" value={member.phoneCell2 ?? undefined} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Membership Information */}
          <Card>
            <CardHeader>
              <CardTitle>Membership Information</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditMode ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 space-y-0">
                  <FormField control={form.control} name="participation" render={({ field }) => (
                    <FormItem><FormLabel>Participation Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="deceased">Deceased</SelectItem>
                          <SelectItem value="homebound">Homebound</SelectItem>
                          <SelectItem value="military">Military</SelectItem>
                          <SelectItem value="school">School</SelectItem>
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="sequence" render={({ field }) => (
                    <FormItem><FormLabel>Role in Household</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="head_of_house">Head of House</SelectItem>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="child">Child</SelectItem>
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="householdId" render={({ field }) => (
                    <FormItem><FormLabel>Household *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select household" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {households.filter((h) => h.name?.toLowerCase() !== "guests").map((h) => (
                            <SelectItem key={h.id} value={h.id}>{getHouseholdDisplayName(h)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="confirmationDate" render={({ field }) => (
                    <FormItem><FormLabel>Confirmation Date</FormLabel><FormControl><Input type="date" {...field} value={formatDateInput(field.value)} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="weddingAnniversaryDate" render={({ field }) => (
                    <FormItem><FormLabel>Wedding Anniversary</FormLabel><FormControl><Input type="date" {...field} value={formatDateInput(field.value)} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="receivedBy" render={({ field }) => (
                    <FormItem><FormLabel>Received By</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="adult_confirmation">Adult Confirmation</SelectItem>
                          <SelectItem value="affirmation_of_faith">Affirmation of Faith</SelectItem>
                          <SelectItem value="baptism">Baptism</SelectItem>
                          <SelectItem value="junior_confirmation">Junior Confirmation</SelectItem>
                          <SelectItem value="transfer">Transfer</SelectItem>
                          <SelectItem value="with_parents">With Parents</SelectItem>
                          <SelectItem value="other_denomination">Other Denomination</SelectItem>
                          <SelectItem value="unknown">Unknown</SelectItem>
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="dateReceived" render={({ field }) => (
                    <FormItem><FormLabel>Date Received</FormLabel><FormControl><Input type="date" {...field} value={formatDateInput(field.value)} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="membershipCode" render={({ field }) => (
                    <FormItem><FormLabel>Membership Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="envelopeNumber" render={({ field }) => (
                    <FormItem><FormLabel>Envelope Number</FormLabel><FormControl><Input type="number" {...field} placeholder="Number" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="removedBy" render={({ field }) => (
                    <FormItem><FormLabel>Removed By</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
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
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="dateRemoved" render={({ field }) => (
                    <FormItem><FormLabel>Date Removed</FormLabel><FormControl><Input type="date" {...field} value={formatDateInput(field.value)} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="deceasedDate" render={({ field }) => (
                    <FormItem><FormLabel>Deceased Date</FormLabel><FormControl><Input type="date" {...field} value={formatDateInput(field.value)} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <FieldDisplay label="Participation Status" value={
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      member.participation?.toLowerCase() === "active"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : member.participation?.toLowerCase() === "inactive"
                          ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                          : member.participation?.toLowerCase() === "deceased"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    }`}>{member.participation}</span>
                  } />
                  <FieldDisplay label="Role in Household" value={
                    member.sequence
                      ? member.sequence.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                      : undefined
                  } />
                  <FieldDisplay label="Household" children={
                    member.householdId ? (
                      <Link href={`/membership/household/${member.householdId}`} className="text-primary hover:underline">
                        View Household
                      </Link>
                    ) : undefined
                  } />
                  <FieldDisplay label="Head of Household" children={
                    member.headOfHousehold
                      ? member.headOfHousehold.isCurrentMember
                        ? <span className="font-medium">This member</span>
                        : <Link href={`/membership/${member.headOfHousehold.id}`} className="text-primary hover:underline">
                            {member.headOfHousehold.firstName} {member.headOfHousehold.lastName}
                          </Link>
                      : undefined
                  } />
                  <FieldDisplay label="Confirmation Date" value={member.confirmationDate ? formatDate(member.confirmationDate) : undefined} />
                  <FieldDisplay label="Wedding Anniversary" value={member.weddingAnniversaryDate ? formatDate(member.weddingAnniversaryDate) : undefined} />
                  <FieldDisplay label="Received By" value={
                    member.receivedBy
                      ? member.receivedBy.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                      : undefined
                  } />
                  <FieldDisplay label="Date Received" value={member.dateReceived ? formatDate(member.dateReceived) : undefined} />
                  <FieldDisplay label="Membership Code" value={member.membershipCode ?? undefined} />
                  <FieldDisplay label="Envelope Number" value={member.envelopeNumber != null ? String(member.envelopeNumber) : undefined} />
                  <FieldDisplay label="Removed By" value={
                    member.removedBy
                      ? member.removedBy.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                      : undefined
                  } />
                  <FieldDisplay label="Date Removed" value={member.dateRemoved ? formatDate(member.dateRemoved) : undefined} />
                  <FieldDisplay label="Deceased Date" value={member.deceasedDate ? formatDate(member.deceasedDate) : undefined} />
                </div>
              )}
            </CardContent>
          </Card>
          </form>
        </Form>
    </div>
  );
}
