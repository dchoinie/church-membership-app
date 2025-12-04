"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { PencilIcon, Loader2, PlusIcon, EyeIcon } from "lucide-react";
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
  };
}

interface ServiceWithStats {
  serviceId: string;
  serviceDate: string;
  serviceType: string;
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

interface ServiceFormData {
  serviceDate: string;
  serviceType: string;
}

const SERVICE_TYPES = [
  { value: "divine_service", label: "Divine Service" },
  { value: "midweek_lent", label: "Midweek Lent" },
  { value: "midweek_advent", label: "Midweek Advent" },
  { value: "festival", label: "Festival" },
];

const formatServiceType = (type: string) => {
  return SERVICE_TYPES.find((t) => t.value === type)?.label || type;
};

export default function AttendancePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesWithStats, setServicesWithStats] = useState<ServiceWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  });
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [creatingService, setCreatingService] = useState(false);
  const [createServiceDialogOpen, setCreateServiceDialogOpen] = useState(false);
  const [formData, setFormData] = useState<AttendanceFormData>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const serviceForm = useForm<ServiceFormData>({
    defaultValues: {
      serviceDate: new Date().toISOString().split("T")[0],
      serviceType: "divine_service",
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
    const validTypes = SERVICE_TYPES.map((t) => t.value);
    if (!validTypes.includes(data.serviceType)) {
      alert("Invalid service type");
      return false;
    }
    return true;
  };

  // Fetch active members
  const fetchMembers = async () => {
    try {
      const response = await fetch("/api/attendance/members");
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
        
        // Initialize form data with all members set to false
        const initialFormData: AttendanceFormData = {};
        (data.members || []).forEach((member: Member) => {
          initialFormData[member.id] = {
            attended: false,
            tookCommunion: false,
          };
        });
        setFormData(initialFormData);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  // Fetch services
  const fetchServices = async () => {
    try {
      const response = await fetch("/api/services?pageSize=1000");
      if (response.ok) {
        const data = await response.json();
        const servicesList = (data.services || []).sort((a: Service, b: Service) => 
          new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()
        );
        setServices(servicesList);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  // Fetch services with attendance statistics
  const fetchServicesWithStats = async (page: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/attendance/services?page=${page}&pageSize=50`);
      if (response.ok) {
        const data = await response.json();
        setServicesWithStats(data.services || []);
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
      console.error("Error fetching services with stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchServices();
    fetchServicesWithStats(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
      fetchServicesWithStats(newPage);
    }
  };

  const handleCheckboxChange = (memberId: string, field: "attended" | "tookCommunion", checked: boolean) => {
    setFormData((prev) => {
      const currentData = prev[memberId] || { attended: false, tookCommunion: false };
      
      // If unchecking "attended", also uncheck "tookCommunion" (can't take communion without attending)
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
      const response = await fetch("/api/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceDate: data.serviceDate,
          serviceType: data.serviceType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to create service: ${error.error || "Unknown error"}`);
        return;
      }

      const result = await response.json();
      await fetchServices();
      setSelectedServiceId(result.service.id);
      setCreateServiceDialogOpen(false);
      serviceForm.reset({
        serviceDate: new Date().toISOString().split("T")[0],
        serviceType: "divine_service",
      });
    } catch (error) {
      console.error("Error creating service:", error);
      alert("Failed to create service");
    } finally {
      setCreatingService(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedServiceId) {
      alert("Please select a service");
      return;
    }

    setSubmitting(true);
    try {
      // Only include records for members who attended
      const records = Object.entries(formData)
        .filter(([, data]) => data.attended)
        .map(([memberId, data]) => ({
          memberId,
          attended: data.attended,
          tookCommunion: data.tookCommunion,
        }));

      // If no one attended, show a message
      if (records.length === 0) {
        alert("No members marked as attended. Please mark at least one member as attended.");
        setSubmitting(false);
        return;
      }

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          records,
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

      // Reset selected service to show "Create Service" button again
      setSelectedServiceId("");

      // Refresh services with stats
      await fetchServicesWithStats(currentPage);
      
      alert(`Successfully saved ${result.success} attendance record(s)`);
    } catch (error) {
      console.error("Error saving attendance:", error);
      alert("Failed to save attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingRecord) return;

    setEditSubmitting(true);
    try {
      const response = await fetch(`/api/attendance/${editingRecord.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
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
      await fetchServicesWithStats(currentPage);
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

  const selectedService = services.find((s) => s.id === selectedServiceId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Attendance</h1>
        <p className="text-muted-foreground mt-2">
          Track member attendance and communion participation
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Record Attendance</CardTitle>
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
            <>
              {selectedService && (
                <div className="text-sm text-muted-foreground mb-4">
                  Service: {formatDate(selectedService.serviceDate)} - {formatServiceType(selectedService.serviceType)}
                </div>
              )}

              <div className="border rounded-md max-h-[600px] overflow-auto">
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
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={formData[member.id]?.tookCommunion || false}
                              onCheckedChange={(checked) =>
                                handleCheckboxChange(member.id, "tookCommunion", checked === true)
                              }
                              disabled={!formData[member.id]?.attended}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting || members.length === 0 || !selectedServiceId}
                className="w-full"
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
          <CardTitle>Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading attendance records...
            </div>
          ) : servicesWithStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No attendance records found
            </div>
          ) : (
            <>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Service Date</TableHead>
                      <TableHead className="text-center">Members Attended</TableHead>
                      <TableHead className="text-center">Took Communion</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servicesWithStats.map((service) => (
                      <TableRow key={service.serviceId}>
                        <TableCell className="font-medium">
                          {formatServiceType(service.serviceType)}
                        </TableCell>
                        <TableCell>{formatDate(service.serviceDate)}</TableCell>
                        <TableCell className="text-center">
                          {service.attendeesCount}
                        </TableCell>
                        <TableCell className="text-center">
                          {service.communionCount}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                            >
                              <Link href={`/attendance/service/${service.serviceId}?mode=view`}>
                                <EyeIcon className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                            >
                              <Link href={`/attendance/service/${service.serviceId}?mode=edit`}>
                                <PencilIcon className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
                  {formatDate(editingRecord.service.serviceDate)} - {formatServiceType(editingRecord.service.serviceType)}
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
                  Note: Members must attend to take communion. Checking "Attended" will enable this option.
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
    </div>
  );
}
