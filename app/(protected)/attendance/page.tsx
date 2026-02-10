"use client";

import { useState, useEffect } from "react";
import { useSWRConfig } from "swr";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { PencilIcon, Loader2, PlusIcon, EyeIcon, TrashIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useAttendanceMembers, useAttendanceServices } from "@/lib/hooks/use-attendance";
import { useServices } from "@/lib/hooks/use-services";
import { apiFetch } from "@/lib/api-client";

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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
}

interface Service {
  id: string;
  serviceDate: string;
  serviceType: string;
  serviceTime?: string | null;
}

interface AttendanceRecord {
  id: string;
  memberId: string;
  serviceId: string;
  attended: boolean;
  tookCommunion: boolean;
  createdAt: string;
  updatedAt: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
  };
  service: {
    id: string;
    serviceDate: string;
    serviceType: string;
    serviceTime?: string | null;
  };
}

interface ServiceWithStats {
  serviceId: string;
  serviceDate: string;
  serviceType: string;
  serviceTime?: string | null;
  createdAt: string;
  updatedAt: string;
  attendeesCount: number;
  communionCount: number;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface AttendanceFormData {
  [memberId: string]: {
    attended: boolean;
    tookCommunion: boolean;
  };
}

interface NonMemberFormData {
  name: string;
  tookCommunion: boolean;
}

interface ServiceFormData {
  serviceDate: string;
  serviceType: string;
  customServiceType?: string;
  serviceTime?: string;
}

const SERVICE_TYPES = [
  { value: "divine_service", label: "Divine Service" },
  { value: "midweek_lent", label: "Midweek Lent" },
  { value: "midweek_advent", label: "Midweek Advent" },
  { value: "festival", label: "Festival" },
  { value: "custom", label: "Custom" },
];

const formatServiceType = (type: string) => {
  return SERVICE_TYPES.find((t) => t.value === type)?.label || type;
};

export default function AttendancePage() {
  const { mutate: globalMutate } = useSWRConfig();
  const { canEditAttendance } = usePermissions();
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { members, mutate: mutateAttendanceMembers } = useAttendanceMembers();
  const { services: rawServices } = useServices();
  const services = [...rawServices].sort(
    (a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()
  );
  const {
    services: servicesWithStats,
    pagination,
    isLoading: loading,
    mutate: mutateAttendanceServices,
  } = useAttendanceServices(currentPage, 50);

  const invalidateAttendance = () => {
    mutateAttendanceMembers();
    mutateAttendanceServices();
    globalMutate((k) => typeof k === "string" && k.startsWith("/api/attendance"));
    globalMutate((k) => typeof k === "string" && k.startsWith("/api/services"));
    globalMutate((k) => typeof k === "string" && k.startsWith("/api/dashboard"));
  };
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [creatingService, setCreatingService] = useState(false);
  const [createServiceDialogOpen, setCreateServiceDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedServiceForDelete, setSelectedServiceForDelete] = useState<ServiceWithStats | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState<AttendanceFormData>({});
  const [nonMembers, setNonMembers] = useState<NonMemberFormData[]>([{ name: "", tookCommunion: false }]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const serviceForm = useForm<ServiceFormData>({
    defaultValues: {
      serviceDate: new Date().toISOString().split("T")[0],
      serviceType: "divine_service",
      customServiceType: "",
      serviceTime: "",
    },
    mode: "onChange",
  });

  const validateServiceForm = (data: ServiceFormData): boolean => {
    if (!data.serviceDate) {
      alert("Please select a service date");
      return false;
    }
    if (!data.serviceType) {
      alert("Please select a service type");
      return false;
    }
    // If custom is selected, require customServiceType
    if (data.serviceType === "custom") {
      if (!data.customServiceType || data.customServiceType.trim() === "") {
        alert("Please enter a custom service type name");
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    const initialFormData: AttendanceFormData = {};
    members.forEach((member) => {
      initialFormData[member.id] = {
        attended: false,
        tookCommunion: false,
      };
    });
    setFormData(initialFormData);
  }, [members]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleDeleteClick = (service: ServiceWithStats) => {
    setSelectedServiceForDelete(service);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedServiceForDelete) return;

    setDeleting(true);
    try {
      const response = await apiFetch(`/api/services/${selectedServiceForDelete.serviceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to delete service");
        return;
      }

      invalidateAttendance();
      setDeleteDialogOpen(false);
      setSelectedServiceForDelete(null);
    } catch (error) {
      console.error("Error deleting service:", error);
      alert("Failed to delete service. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCheckboxChange = (memberId: string, field: "attended" | "tookCommunion", checked: boolean) => {
    setFormData((prev) => {
      const currentData = prev[memberId] || { attended: false, tookCommunion: false };
      
      // If unchecking "attended", also uncheck "tookCommunion" (can&apos;t take communion without attending)
      if (field === "attended" && !checked) {
        return {
          ...prev,
          [memberId]: {
            attended: false,
            tookCommunion: false,
          },
        };
      }
      
      // If checking "tookCommunion", ensure "attended" is also checked
      if (field === "tookCommunion" && checked && !currentData.attended) {
        return {
          ...prev,
          [memberId]: {
            attended: true,
            tookCommunion: true,
          },
        };
      }
      
      return {
        ...prev,
        [memberId]: {
          ...currentData,
          [field]: checked,
        },
      };
    });
  };

  const onCreateService = async (data: ServiceFormData) => {
    if (!validateServiceForm(data)) {
      return;
    }

    setCreatingService(true);
    try {
      // Use customServiceType if custom is selected, otherwise use the selected type
      const finalServiceType = data.serviceType === "custom" 
        ? data.customServiceType?.trim() || "" 
        : data.serviceType;

      // Convert service time to UTC format (HH:MM:SS) if provided
      // The time input gives us local time, we'll store it as-is (church local time)
      // and convert to user timezone when displaying
      let serviceTime: string | undefined = undefined;
      if (data.serviceTime && data.serviceTime.trim() !== "") {
        // Ensure time is in HH:MM:SS format
        const timeParts = data.serviceTime.split(":");
        if (timeParts.length >= 2) {
          const hours = timeParts[0].padStart(2, "0");
          const minutes = timeParts[1].padStart(2, "0");
          const seconds = timeParts[2]?.padStart(2, "0") || "00";
          serviceTime = `${hours}:${minutes}:${seconds}`;
        }
      }

      const response = await apiFetch("/api/services", {
        method: "POST",
        body: JSON.stringify({
          serviceDate: data.serviceDate,
          serviceType: finalServiceType,
          serviceTime: serviceTime,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to create service: ${error.error || "Unknown error"}`);
        return;
      }

      const result = await response.json();
      invalidateAttendance();
      setSelectedServiceId(result.service.id);
      setCreateServiceDialogOpen(false);
      serviceForm.reset({
        serviceDate: new Date().toISOString().split("T")[0],
        serviceType: "divine_service",
        customServiceType: "",
        serviceTime: "",
      });
    } catch (error) {
      console.error("Error creating service:", error);
      alert("Failed to create service");
    } finally {
      setCreatingService(false);
    }
  };

  const handleAddNonMember = () => {
    setNonMembers([...nonMembers, { name: "", tookCommunion: false }]);
  };

  const handleRemoveNonMember = (index: number) => {
    setNonMembers(nonMembers.filter((_, i) => i !== index));
  };

  const handleNonMemberNameChange = (index: number, name: string) => {
    const updated = [...nonMembers];
    updated[index].name = name;
    setNonMembers(updated);
  };

  const handleNonMemberCommunionChange = (index: number, checked: boolean) => {
    const updated = [...nonMembers];
    updated[index].tookCommunion = checked;
    setNonMembers(updated);
  };

  const handleSubmit = async () => {
    if (!selectedServiceId) {
      alert("Please select a service");
      return;
    }

    setSubmitting(true);
    try {
      // Filter out empty non-member names
      const validNonMembers = nonMembers.filter((nm) => nm.name.trim() !== "");

      // Only include records for members who attended
      const memberRecords = Object.entries(formData)
        .filter(([, data]) => data.attended)
        .map(([memberId, data]) => ({
          memberId,
          attended: data.attended,
          tookCommunion: data.tookCommunion,
        }));

      // Create guest member records for non-members and get their IDs
      const guestMemberIds: string[] = [];
      if (validNonMembers.length > 0) {
        for (const nonMember of validNonMembers) {
          try {
            const nameParts = nonMember.name.trim().split(" ");
            const firstName = nameParts[0] || "Guest";
            const lastName = nameParts.slice(1).join(" ") || "Visitor";
            
            // Create a guest member record with a new household
            const guestResponse = await apiFetch("/api/members", {
              method: "POST",
              body: JSON.stringify({
                firstName,
                lastName,
                createNewHousehold: true,
                householdName: "Guests",
                householdType: "other",
                participation: "inactive", // Mark as inactive to distinguish from regular members
                membershipCode: "GUEST", // Mark as guest
              }),
            });

            if (guestResponse.ok) {
              const guestData = await guestResponse.json();
              guestMemberIds.push(guestData.member.id);
            } else {
              const errorData = await guestResponse.json().catch(() => ({ error: "Unknown error" }));
              console.error(`Failed to create guest member for ${nonMember.name}:`, errorData.error);
            }
          } catch (error) {
            console.error(`Error creating guest member for ${nonMember.name}:`, error);
          }
        }
      }

      // Combine member records with guest member records
      const allRecords = [
        ...memberRecords,
        ...guestMemberIds.map((memberId, index) => ({
          memberId,
          attended: true,
          tookCommunion: validNonMembers[index].tookCommunion,
        })),
      ];

      // If no one attended, show a message
      if (allRecords.length === 0) {
        alert("No members marked as attended. Please mark at least one member as attended or add a non-member.");
        setSubmitting(false);
        return;
      }

      const response = await apiFetch("/api/attendance", {
        method: "POST",
        body: JSON.stringify({
          serviceId: selectedServiceId,
          records: allRecords,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to save attendance: ${error.error || "Unknown error"}`);
        return;
      }

      const result = await response.json();
      
      if (result.failed > 0 && result.errors.length > 0) {
        alert(`Some records failed to save:\n${result.errors.join("\n")}`);
      }

      // Reset form
      const resetFormData: AttendanceFormData = {};
      members.forEach((member) => {
        resetFormData[member.id] = {
          attended: false,
          tookCommunion: false,
        };
      });
      setFormData(resetFormData);
      setNonMembers([{ name: "", tookCommunion: false }]);

      // Reset selected service to show "Create Service" button again
      setSelectedServiceId("");

      invalidateAttendance();
      alert(`Successfully saved ${result.success} attendance record(s)`);
    } catch (error) {
      console.error("Error saving attendance:", error);
      alert("Failed to save attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingRecord) return;

    setEditSubmitting(true);
    try {
      const response = await apiFetch(`/api/attendance/${editingRecord.id}`, {
        method: "PUT",
        body: JSON.stringify({
          attended: editingRecord.attended,
          tookCommunion: editingRecord.tookCommunion,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to update attendance: ${error.error || "Unknown error"}`);
        return;
      }

      setEditDialogOpen(false);
      setEditingRecord(null);
      invalidateAttendance();
    } catch (error) {
      console.error("Error updating attendance:", error);
      alert("Failed to update attendance");
    } finally {
      setEditSubmitting(false);
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

  const formatTime = (timeString: string | null | undefined) => {
    if (!timeString) return "";
    try {
      // Time is stored as HH:MM:SS in church local time
      // Display as-is (church local time) since we don't have church timezone info
      const [hours, minutes] = timeString.split(":");
      const hour = parseInt(hours, 10);
      const minute = parseInt(minutes, 10);
      
      // Create a date object for today with the service time
      // This will be interpreted in the user's browser timezone
      const today = new Date();
      const serviceDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute);
      
      // Format in 12-hour format with AM/PM
      return format(serviceDateTime, "h:mm a");
    } catch {
      // Fallback: just return the time string if parsing fails
      return timeString;
    }
  };

  const selectedService = services.find((s) => s.id === selectedServiceId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Attendance</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Track member attendance and communion participation
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">Record Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedServiceId ? (
            <Dialog
              open={createServiceDialogOpen}
              onOpenChange={(open) => {
                setCreateServiceDialogOpen(open);
                if (!open) {
                  // Reset form when dialog closes
                  serviceForm.reset({
                    serviceDate: new Date().toISOString().split("T")[0],
                    serviceType: "divine_service",
                    customServiceType: "",
                    serviceTime: "",
                  });
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="cursor-pointer">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Create Service
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Service</DialogTitle>
                  <DialogDescription>
                    Enter the service details to create a new service record.
                  </DialogDescription>
                </DialogHeader>
                <Form {...serviceForm}>
                  <form onSubmit={serviceForm.handleSubmit(onCreateService)} className="space-y-4">
                    <FormField
                      control={serviceForm.control}
                      name="serviceDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Date *</FormLabel>
                          <FormControl>
                            <Input type="date" required {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={serviceForm.control}
                      name="serviceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select service type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {SERVICE_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {serviceForm.watch("serviceType") === "custom" && (
                      <FormField
                        control={serviceForm.control}
                        name="customServiceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom Service Type Name *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter custom service type name" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={serviceForm.control}
                      name="serviceTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Time (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              {...field} 
                              placeholder="HH:MM"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCreateServiceDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={creatingService}>
                        {creatingService ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Service"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            ) : (
              <p className="text-muted-foreground">Select a service to view attendance records.</p>
            )}
          {selectedServiceId && (
            <>
              {selectedService && (
                <div className="text-sm text-muted-foreground mb-4">
                  Service: {formatDate(selectedService.serviceDate)}
                  {selectedService.serviceTime && ` at ${formatTime(selectedService.serviceTime)}`} - {formatServiceType(selectedService.serviceType)}
                </div>
              )}

              <div className="border rounded-md max-h-[600px] overflow-auto">
                <div className="overflow-x-auto">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Member Name</TableHead>
                      <TableHead className="text-center">Attended</TableHead>
                      <TableHead className="text-center">Took Communion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          {loading ? "Loading members..." : "No active members found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            {member.firstName} {member.lastName}
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={formData[member.id]?.attended || false}
                              onCheckedChange={(checked) =>
                                handleCheckboxChange(member.id, "attended", checked === true)
                              }
                              disabled={!canEditAttendance}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={formData[member.id]?.tookCommunion || false}
                              onCheckedChange={(checked) =>
                                handleCheckboxChange(member.id, "tookCommunion", checked === true)
                              }
                              disabled={!canEditAttendance || !formData[member.id]?.attended}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              </div>

              {/* Non-Member Section */}
              <div className="mt-6 border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-sm font-medium">Non-Members</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddNonMember}
                    disabled={!canEditAttendance}
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Non-Member
                  </Button>
                </div>
                <div className="space-y-2">
                  {nonMembers.map((nonMember, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="Enter non-member name"
                        value={nonMember.name}
                        onChange={(e) => handleNonMemberNameChange(index, e.target.value)}
                        disabled={!canEditAttendance}
                        className="flex-1"
                      />
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`non-member-communion-${index}`}
                          checked={nonMember.tookCommunion}
                          onCheckedChange={(checked) =>
                            handleNonMemberCommunionChange(index, checked === true)
                          }
                          disabled={!canEditAttendance || !nonMember.name.trim()}
                        />
                        <Label
                          htmlFor={`non-member-communion-${index}`}
                          className={`text-sm cursor-pointer ${!nonMember.name.trim() ? "text-muted-foreground" : ""}`}
                        >
                          Communion
                        </Label>
                      </div>
                      {nonMembers.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveNonMember(index)}
                          disabled={!canEditAttendance}
                          className="text-destructive hover:text-destructive"
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting || (members.length === 0 && nonMembers.every((nm) => !nm.name.trim())) || !selectedServiceId}
                className="w-full mt-4"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Attendance"
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* View Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm md:text-base">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading attendance records...
            </div>
          ) : servicesWithStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm md:text-base">
              No attendance records found
            </div>
          ) : (
            <>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs md:text-sm">Service</TableHead>
                      <TableHead className="text-xs md:text-sm">Service Date</TableHead>
                      <TableHead className="text-center text-xs md:text-sm">Members Attended</TableHead>
                      <TableHead className="text-center text-xs md:text-sm">Took Communion</TableHead>
                      {canEditAttendance && <TableHead className="text-right text-xs md:text-sm">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servicesWithStats.map((service) => {
                      const isDeleting = deleting && selectedServiceForDelete?.serviceId === service.serviceId;
                      return (
                        <TableRow key={service.serviceId} className={isDeleting ? "opacity-50" : ""}>
                          <TableCell className="font-medium text-xs md:text-sm">
                            {isDeleting ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>{formatServiceType(service.serviceType)}</span>
                              </div>
                            ) : (
                              formatServiceType(service.serviceType)
                            )}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {formatDate(service.serviceDate)}
                            {service.serviceTime && (
                              <span className="text-muted-foreground ml-2">
                                {formatTime(service.serviceTime)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-xs md:text-sm">
                            {service.attendeesCount}
                          </TableCell>
                          <TableCell className="text-center text-xs md:text-sm">
                            {service.communionCount}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                title="View"
                                disabled={isDeleting}
                              >
                                <Link href={`/attendance/service/${service.serviceId}?mode=view`}>
                                  <EyeIcon className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                title="Edit"
                                disabled={isDeleting}
                              >
                                <Link href={`/attendance/service/${service.serviceId}?mode=edit`}>
                                  <PencilIcon className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(service)}
                                title="Delete"
                                disabled={isDeleting}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <TrashIcon className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(currentPage - 1)}
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
                        (page) => {
                          if (
                            page === 1 ||
                            page === pagination.totalPages ||
                            (page >= currentPage - 2 && page <= currentPage + 2)
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => handlePageChange(page)}
                                  isActive={currentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          } else if (
                            page === currentPage - 3 ||
                            page === currentPage + 3
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          return null;
                        },
                      )}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(currentPage + 1)}
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

      {/* Edit Dialog */}
      {canEditAttendance && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendance Record</DialogTitle>
            <DialogDescription>
              Update attendance and communion status for this record.
            </DialogDescription>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Member</Label>
                <p className="text-sm text-muted-foreground">
                  {editingRecord.member.firstName} {editingRecord.member.lastName}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Service</Label>
                <p className="text-sm text-muted-foreground">
                  {formatDate(editingRecord.service.serviceDate)}
                  {editingRecord.service.serviceTime && ` at ${formatTime(editingRecord.service.serviceTime)}`} - {formatServiceType(editingRecord.service.serviceType)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-attended"
                  checked={editingRecord.attended}
                  onCheckedChange={(checked) => {
                    const newAttended = checked === true;
                    // If unchecking "attended", also uncheck "tookCommunion"
                    setEditingRecord({
                      ...editingRecord,
                      attended: newAttended,
                      tookCommunion: newAttended ? editingRecord.tookCommunion : false,
                    });
                  }}
                />
                <Label htmlFor="edit-attended" className="cursor-pointer">
                  Attended
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-communion"
                  checked={editingRecord.tookCommunion}
                  onCheckedChange={(checked) => {
                    const newTookCommunion = checked === true;
                    // If checking "tookCommunion", ensure "attended" is also checked
                    setEditingRecord({
                      ...editingRecord,
                      attended: newTookCommunion ? true : editingRecord.attended,
                      tookCommunion: newTookCommunion,
                    });
                  }}
                  disabled={!editingRecord.attended}
                />
                <Label htmlFor="edit-communion" className={`cursor-pointer ${!editingRecord.attended ? "text-muted-foreground" : ""}`}>
                  Took Communion
                </Label>
              </div>
              {!editingRecord.attended && editingRecord.tookCommunion && (
                <p className="text-sm text-muted-foreground">
                  Note: Members must attend to take communion. Checking &quot;Attended&quot; will enable this option.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={editSubmitting}>
              {editSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {/* Delete Service Confirmation Dialog */}
      {canEditAttendance && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedServiceForDelete && (
                <>
                  This will permanently delete the service from{" "}
                  <strong>{formatDate(selectedServiceForDelete.serviceDate)}
                  {selectedServiceForDelete.serviceTime && ` at ${formatTime(selectedServiceForDelete.serviceTime)}`}</strong> (
                  {formatServiceType(selectedServiceForDelete.serviceType)}) and all associated
                  attendance records ({selectedServiceForDelete.attendeesCount} attendees).
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      )}
    </div>
  );
}
