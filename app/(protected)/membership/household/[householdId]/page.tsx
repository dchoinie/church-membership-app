"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { usePermissions } from "@/lib/hooks/use-permissions";
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TriangleAlertIcon,
  EyeIcon,
} from "lucide-react";

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

interface HouseholdFormData {
  name: string;
  type: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
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
  const { canEditMembers } = usePermissions();
  const [members, setMembers] = useState<Member[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [householdId, setHouseholdId] = useState<string>("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [deleteHouseholdDialogOpen, setDeleteHouseholdDialogOpen] = useState(false);
  const [transferMemberDialogOpen, setTransferMemberDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [allHouseholds, setAllHouseholds] = useState<HouseholdOption[]>([]);

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
    const init = async () => {
      const resolvedParams = await params;
      const id = resolvedParams.householdId;
      setHouseholdId(id);
      await fetchHouseholdData(id);
      await fetchAllHouseholds();
    };
    init();
  }, [params]);

  const fetchHouseholdData = async (id: string) => {
    try {
      const response = await fetch(`/api/families/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
        setHousehold(data.household);
      } else {
        console.error("Failed to fetch household data");
      }
    } catch (error) {
      console.error("Error fetching household data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllHouseholds = async () => {
    try {
      const response = await fetch("/api/families?page=1&pageSize=1000");
      if (response.ok) {
        const data = await response.json();
        setAllHouseholds(data.households || []);
      }
    } catch (error) {
      console.error("Error fetching households:", error);
    }
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

  const calculateAge = (dateOfBirth: string | null): number | null => {
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

  const handleEditClick = () => {
    if (household) {
      editForm.reset({
        name: household.name || "",
        type: household.type || "single",
        address1: household.address1 || "",
        address2: household.address2 || "",
        city: household.city || "",
        state: household.state || "",
        zip: household.zip || "",
      });
      setEditDialogOpen(true);
    }
  };

  const onEditSubmit = async (data: HouseholdFormData) => {
    try {
      const response = await fetch(`/api/families/${householdId}`, {
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
        fetchHouseholdData(householdId);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update household");
      }
    } catch (error) {
      console.error("Error updating household:", error);
      alert("Failed to update household");
    }
  };

  const onAddMemberSubmit = async (data: MemberFormData) => {
    if (!data.firstName || !data.lastName) {
      alert("First name and last name are required");
      return;
    }

    try {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          householdId: householdId,
          envelopeNumber: data.envelopeNumber ? parseInt(data.envelopeNumber, 10) : null,
        }),
      });

      if (response.ok) {
        setAddMemberDialogOpen(false);
        memberForm.reset();
        fetchHouseholdData(householdId);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create member");
      }
    } catch (error) {
      console.error("Error creating member:", error);
      alert("Failed to create member");
    }
  };

  const handleRemoveMemberClick = (member: Member) => {
    setSelectedMember(member);
    setRemoveMemberDialogOpen(true);
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;

    try {
      const response = await fetch(`/api/members/${selectedMember.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setRemoveMemberDialogOpen(false);
        setSelectedMember(null);
        fetchHouseholdData(householdId);
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
        const response = await fetch("/api/families", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
      const response = await fetch(`/api/members/${selectedMember.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
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
        fetchHouseholdData(householdId);
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
      const response = await fetch(`/api/families/${householdId}`, {
        method: "DELETE",
      });

      if (response.ok) {
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
        <div className="text-center py-8 text-muted-foreground">
          Loading household information...
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
              <Button variant="outline" onClick={handleEditClick} className="cursor-pointer">
                <PencilIcon className="mr-2 h-4 w-4" />
                Edit Household
              </Button>
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
                    <Button type="submit" className="cursor-pointer">Add Member</Button>
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

      {/* Edit Household Dialog */}
      {canEditMembers && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Household</DialogTitle>
            <DialogDescription>Update household information.</DialogDescription>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                  onClick={() => setEditDialogOpen(false)}
                  className="cursor-pointer"
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
                            .filter((h) => h.id !== householdId)
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

