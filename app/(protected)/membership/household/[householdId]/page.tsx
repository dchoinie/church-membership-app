"use client";

import { useState, useEffect } from "react";
import { useSWRConfig } from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useHousehold, type HouseholdMember } from "@/lib/hooks/use-household";
import { useHouseholds } from "@/lib/hooks/use-households";
import { apiFetch } from "@/lib/api-client";
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  TriangleAlertIcon,
  EyeIcon,
  Loader2,
} from "lucide-react";

import { ChurchLoadingIndicator } from "@/components/ui/church-loading";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

interface Member {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  preferredName: string | null;
  email1: string | null;
  phoneHome: string | null;
  phoneCell1: string | null;
  participation: string;
  envelopeNumber: number | null;
  dateOfBirth: string | null;
  sex: string | null;
}

interface Household {
  id: string;
  name: string | null;
  type: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
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
  envelopeNumber: string;
}

interface HouseholdOption {
  id: string;
  name: string | null;
  type: string | null;
  memberCount: number;
  members: Array<{ firstName: string; lastName: string }>;
}

export default function HouseholdViewPage({
  params,
}: {
  params: Promise<{ householdId: string }>;
}) {
  const router = useRouter();
  const { mutate: globalMutate } = useSWRConfig();
  const { canEditMembers } = usePermissions();
  const [householdId, setHouseholdId] = useState<string>("");

  const { household, members, isLoading: loading, mutate: mutateHousehold } = useHousehold(householdId || null);
  const { households: allHouseholdsRaw, mutate: mutateHouseholds } = useHouseholds(1, 1000);
  const allHouseholds = allHouseholdsRaw as HouseholdOption[];
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [deleteHouseholdDialogOpen, setDeleteHouseholdDialogOpen] = useState(false);
  const [transferMemberDialogOpen, setTransferMemberDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<HouseholdMember | null>(null);

  const memberForm = useForm<MemberFormData>({
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
      envelopeNumber: "",
    },
  });

  const transferForm = useForm<{ targetHouseholdId: string; createNewHousehold: boolean }>({
    defaultValues: {
      targetHouseholdId: "",
      createNewHousehold: false,
    },
  });

  useEffect(() => {
    params.then((resolved) => setHouseholdId(resolved.householdId));
  }, [params]);

  const invalidateHouseholdAndFamilies = () => {
    mutateHousehold();
    mutateHouseholds();
    globalMutate((k) => typeof k === "string" && k.startsWith("/api/families"));
    globalMutate((k) => typeof k === "string" && k.startsWith("/api/members"));
  };

  const getHouseholdDisplayName = (): string => {
    if (household?.name) {
      return household.name;
    }
    if (members.length === 0) {
      return `Household ${householdId.slice(0, 8)}`;
    }
    if (members.length === 1) {
      return `${members[0].preferredName || members[0].firstName} ${members[0].lastName}`;
    }
    if (members.length === 2) {
      return `${members[0].preferredName || members[0].firstName} & ${members[1].preferredName || members[1].firstName} ${members[1].lastName}`;
    }
    return `${members[0].preferredName || members[0].firstName} ${members[0].lastName} (+${members.length - 1})`;
  };

  const checkEnvelopeNumbers = (): boolean => {
    if (members.length === 0 || members.length === 1) {
      return true; // No conflict if 0 or 1 member
    }
    
    const envelopeNumbers = members.map((m) => m.envelopeNumber);
    const hasNulls = envelopeNumbers.some((num) => num === null || num === undefined);
    const hasNumbers = envelopeNumbers.some((num) => num !== null && num !== undefined);
    
    // If there's a mix of null and non-null values, show alert
    if (hasNulls && hasNumbers) {
      return false;
    }
    
    // If all are null, no conflict
    if (!hasNumbers) {
      return true;
    }
    
    // Check if all envelope numbers are the same
    const nonNullNumbers = envelopeNumbers.filter((num): num is number => num !== null && num !== undefined);
    const firstEnvelope = nonNullNumbers[0];
    return nonNullNumbers.every((num) => num === firstEnvelope);
  };

  const getHouseholdOptionDisplayName = (h: HouseholdOption): string => {
    if (h.name) return h.name;
    if (h.members.length === 0) return `Household (${h.memberCount} members)`;
    if (h.members.length === 1) {
      return `${h.members[0].firstName} ${h.members[0].lastName}`;
    }
    return `${h.members[0].firstName} ${h.members[0].lastName} (+${h.memberCount - 1})`;
  };

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

  const calculateAge = (dateOfBirth: string | null | undefined): number | null => {
    if (!dateOfBirth) return null;
    try {
      const parts = dateOfBirth.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const birthDate = new Date(year, month, day);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age;
      }
      return null;
    } catch {
      return null;
    }
  };

  const onAddMemberSubmit = async (data: MemberFormData) => {
    if (!data.firstName || !data.lastName) {
      alert("First name and last name are required");
      return;
    }

    setAddMemberLoading(true);
    try {
      const response = await apiFetch("/api/members", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          householdId: householdId,
          envelopeNumber: data.envelopeNumber ? parseInt(data.envelopeNumber, 10) : null,
        }),
      });

      if (response.ok) {
        setAddMemberDialogOpen(false);
        memberForm.reset();
        invalidateHouseholdAndFamilies();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create member");
      }
    } catch (error) {
      console.error("Error creating member:", error);
      alert("Failed to create member");
    } finally {
      setAddMemberLoading(false);
    }
  };

  const handleRemoveMemberClick = (member: HouseholdMember) => {
    setSelectedMember(member);
    setRemoveMemberDialogOpen(true);
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;

    try {
      const response = await apiFetch(`/api/members/${selectedMember.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setRemoveMemberDialogOpen(false);
        setSelectedMember(null);
        invalidateHouseholdAndFamilies();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete member");
      }
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Failed to delete member");
    }
  };

  const handleTransferMember = async () => {
    if (!selectedMember) return;

    const formData = transferForm.getValues();
    let targetHouseholdId: string | null = null;

    if (formData.createNewHousehold) {
      // Create new individual household
      try {
        const response = await apiFetch("/api/families", {
          method: "POST",
          body: JSON.stringify({
            name: `${selectedMember.firstName} ${selectedMember.lastName}`,
            type: "single",
          }),
        });

        if (response.ok) {
          const data = await response.json();
          targetHouseholdId = data.household.id;
        } else {
          alert("Failed to create new household");
          return;
        }
      } catch (error) {
        console.error("Error creating household:", error);
        alert("Failed to create new household");
        return;
      }
    } else {
      targetHouseholdId = formData.targetHouseholdId || null;
    }

    if (!targetHouseholdId) {
      alert("Please select a target household");
      return;
    }

    try {
      const response = await apiFetch(`/api/members/${selectedMember.id}`, {
        method: "PUT",
        body: JSON.stringify({
          firstName: selectedMember.firstName,
          lastName: selectedMember.lastName,
          householdId: targetHouseholdId,
        }),
      });

      if (response.ok) {
        setTransferMemberDialogOpen(false);
        setRemoveMemberDialogOpen(false);
        setSelectedMember(null);
        transferForm.reset();
        invalidateHouseholdAndFamilies();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to transfer member");
      }
    } catch (error) {
      console.error("Error transferring member:", error);
      alert("Failed to transfer member");
    }
  };

  const handleDeleteHousehold = async () => {
    if (members.length > 0) {
      alert("Cannot delete household with members. Please remove all members first.");
      return;
    }

    try {
      const response = await apiFetch(`/api/families/${householdId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        invalidateHouseholdAndFamilies();
        router.push("/membership");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete household");
      }
    } catch (error) {
      console.error("Error deleting household:", error);
      alert("Failed to delete household");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <ChurchLoadingIndicator size="md" label="Loading household information..." />
        </div>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          Household not found.
        </div>
        <div className="text-center">
          <Button asChild variant="outline">
            <Link href="/membership">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Households
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const hasEnvelopeNumberConflict = !checkEnvelopeNumbers();

  return (
    <div className="space-y-6">
      {hasEnvelopeNumberConflict && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Envelope Number Mismatch</AlertTitle>
          <AlertDescription>
            Not all members in this household have the same envelope number. Please review and update the envelope numbers to ensure consistency.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{getHouseholdDisplayName()}</h1>
          {household && (
            <p className="text-muted-foreground mt-2">
              {household.address1 && (
                <>
                  {household.address1}
                  {household.city && `, ${household.city}`}
                  {household.state && ` ${household.state}`}
                </>
              )}
              {household.type && (
                <span className="ml-2 capitalize">({household.type})</span>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {canEditMembers && (
            <>
              <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="cursor-pointer">
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Member
                  </Button>
                </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Member to Household</DialogTitle>
                <DialogDescription>
                  Create a new member and add them to this household.
                </DialogDescription>
              </DialogHeader>
              <Form {...memberForm}>
                <form onSubmit={memberForm.handleSubmit(onAddMemberSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={memberForm.control}
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
                      control={memberForm.control}
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={memberForm.control}
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
                      control={memberForm.control}
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={memberForm.control}
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
                      control={memberForm.control}
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={memberForm.control}
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
                      control={memberForm.control}
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
                  </div>
                  <FormField
                    control={memberForm.control}
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={memberForm.control}
                      name="email1"
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
                      control={memberForm.control}
                      name="phoneCell1"
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={memberForm.control}
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
                    <FormField
                      control={memberForm.control}
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={memberForm.control}
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
                    <FormField
                      control={memberForm.control}
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={memberForm.control}
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
                      control={memberForm.control}
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={memberForm.control}
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
                    <FormField
                      control={memberForm.control}
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
                  </div>
                  <FormField
                    control={memberForm.control}
                    name="envelopeNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Envelope Number</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            placeholder="Enter envelope number"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? e.target.value : "")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={memberForm.control}
                    name="participation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Participation Status</FormLabel>
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
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddMemberDialogOpen(false)}
                      className="cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="cursor-pointer" disabled={addMemberLoading}>
                      {addMemberLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add Member
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
              {members.length === 0 && (
                <Button variant="destructive" onClick={() => setDeleteHouseholdDialogOpen(true)} className="cursor-pointer">
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Delete Household
                </Button>
              )}
            </>
          )}
          <Button asChild variant="outline">
            <Link href="/membership">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Households
            </Link>
          </Button>
        </div>
      </div>

      {/* Household Members */}
      <Card>
        <CardHeader>
          <CardTitle>Household Members</CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? "s" : ""} in this household
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No members in this household. Add a member to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const age = calculateAge(member.dateOfBirth);
                  const genderIcon = member.sex === "male" ? "♂" : member.sex === "female" ? "♀" : null;
                  
                  return (
                    <TableRow 
                      key={member.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/membership/${member.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {genderIcon && (
                            <span className="text-muted-foreground text-sm" title={member.sex === "male" ? "Male" : "Female"}>
                              {genderIcon}
                            </span>
                          )}
                          <span>
                            {member.firstName}{" "}
                            {member.middleName ? `${member.middleName} ` : ""}
                            {member.lastName}
                            {member.suffix ? ` ${member.suffix}` : ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{age !== null ? age : "N/A"}</TableCell>
                      <TableCell>{member.email1 || "N/A"}</TableCell>
                      <TableCell>
                        {member.phoneCell1 || member.phoneHome || "N/A"}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            asChild 
                            variant="ghost" 
                            size="icon"
                          >
                            <Link href={`/membership/${member.id}`}>
                              <EyeIcon className="h-4 w-4" />
                            </Link>
                          </Button>
                          {canEditMembers && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveMemberClick(member);
                              }}
                              className="cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Member Dialog */}
      <AlertDialog open={removeMemberDialogOpen} onOpenChange={setRemoveMemberDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              {selectedMember
                ? `${selectedMember.firstName} ${selectedMember.lastName}`
                : "this member"}? This action cannot be undone and will permanently remove the member from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteMember}
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Member Dialog */}
      <Dialog open={transferMemberDialogOpen} onOpenChange={setTransferMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Member</DialogTitle>
            <DialogDescription>
              Select a household to transfer{" "}
              {selectedMember
                ? `${selectedMember.firstName} ${selectedMember.lastName}`
                : "this member"}{" "}
              to, or create a new individual household.
            </DialogDescription>
          </DialogHeader>
          <Form {...transferForm}>
            <form onSubmit={transferForm.handleSubmit(handleTransferMember)} className="space-y-4">
              <FormField
                control={transferForm.control}
                name="createNewHousehold"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Create New Individual Household</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              {!transferForm.watch("createNewHousehold") && (
                <FormField
                  control={transferForm.control}
                  name="targetHouseholdId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Household</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select household" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allHouseholds
                            .filter((h) => h.id !== householdId && h.name?.toLowerCase() !== "guests")
                            .map((h) => (
                              <SelectItem key={h.id} value={h.id}>
                                {getHouseholdOptionDisplayName(h)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTransferMemberDialogOpen(false);
                    setRemoveMemberDialogOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" className="cursor-pointer">Transfer</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Household Dialog */}
      {canEditMembers && (
        <AlertDialog open={deleteHouseholdDialogOpen} onOpenChange={setDeleteHouseholdDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the household.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHousehold}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      )}
    </div>
  );
}

