"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Loader2, ArrowLeft, PencilIcon } from "lucide-react";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { apiFetch } from "@/lib/api-client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface Service {
  id: string;
  serviceDate: string;
  serviceType: string;
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
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

interface AttendanceFormData {
  [memberId: string]: {
    attended: boolean;
    tookCommunion: boolean;
  };
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

export default function ServiceAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canEditAttendance } = usePermissions();
  const serviceId = params.serviceId as string;
  const modeParam = searchParams.get("mode");
  // Force view mode if user doesn't have edit permission
  const mode = canEditAttendance ? (modeParam || "view") : "view";

  const [service, setService] = useState<Service | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [formData, setFormData] = useState<AttendanceFormData>({});
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const isEditMode = mode === "edit";

  useEffect(() => {
    if (serviceId) {
      fetchServiceAttendance();
      if (isEditMode) {
        fetchMembers();
      } else {
        // Clear members when switching to view mode
        setMembers([]);
        setFormData({});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, mode]);


  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const response = await apiFetch("/api/attendance/members");
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchServiceAttendance = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/attendance/service/${serviceId}`);
      if (response.ok) {
        const data = await response.json();
        setService(data.service);
        setAttendanceRecords(data.attendance || []);
      } else if (response.status === 404) {
        router.push("/attendance");
      }
    } catch (error) {
      console.error("Error fetching service attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize form data when members and attendance records are loaded
  useEffect(() => {
    if (isEditMode && members.length > 0 && attendanceRecords.length >= 0) {
      const initialFormData: AttendanceFormData = {};
      members.forEach((member) => {
        const existingRecord = attendanceRecords.find(
          (r) => r.memberId === member.id
        );
        initialFormData[member.id] = {
          attended: existingRecord?.attended || false,
          tookCommunion: existingRecord?.tookCommunion || false,
        };
      });
      setFormData(initialFormData);
    }
  }, [isEditMode, members, attendanceRecords]);

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

  const handleSave = async () => {
    if (!serviceId) return;

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

      const response = await apiFetch("/api/attendance", {
        method: "POST",
        body: JSON.stringify({
          serviceId,
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

      // Refresh attendance records
      await fetchServiceAttendance();
      
      alert(`Successfully saved ${result.success} attendance record(s)`);
      
      // Switch back to view mode
      router.push(`/attendance/service/${serviceId}?mode=view`);
    } catch (error) {
      console.error("Error saving attendance:", error);
      alert("Failed to save attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (record: AttendanceRecord) => {
    if (!isEditMode) {
      // Redirect to edit mode if not already in edit mode
      router.push(`/attendance/service/${serviceId}?mode=edit`);
      return;
    }
    setEditingRecord(record);
    setEditDialogOpen(true);
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
      await fetchServiceAttendance();
    } catch (error) {
      console.error("Error updating attendance:", error);
      alert("Failed to update attendance");
    } finally {
      setEditSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading attendance records...
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          Service not found
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/attendance")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Service Attendance</h1>
          <p className="text-muted-foreground mt-2">
            {formatDate(service.serviceDate)} - {formatServiceType(service.serviceType)}
            {isEditMode && (
              <span className="ml-2 text-sm font-medium text-primary">(Edit Mode)</span>
            )}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Members Who Attended</CardTitle>
            {!isEditMode && canEditAttendance && (
              <Button
                variant="outline"
                onClick={() => router.push(`/attendance/service/${serviceId}?mode=edit`)}
              >
                <PencilIcon className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {isEditMode && (
              <Button
                variant="outline"
                onClick={() => router.push(`/attendance/service/${serviceId}?mode=view`)}
              >
                View Mode
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditMode ? (
            <>
              {loadingMembers || members.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {loadingMembers ? "Loading members..." : "No active members found"}
                </div>
              ) : (
                <>
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
                          {members.map((member) => (
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
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={submitting || members.length === 0}
                    className="w-full mt-4"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              {attendanceRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No attendance records found for this service
                </div>
              ) : (
                <>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member Name</TableHead>
                          <TableHead className="text-center">Attended</TableHead>
                          <TableHead className="text-center">Took Communion</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">
                              {record.member.firstName} {record.member.lastName}
                            </TableCell>
                            <TableCell className="text-center">
                              {record.attended ? "Yes" : "No"}
                            </TableCell>
                            <TableCell className="text-center">
                              {record.tookCommunion ? "Yes" : "No"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-4 text-sm text-muted-foreground">
                    Total: {attendanceRecords.length} member{attendanceRecords.length !== 1 ? "s" : ""} attended
                    {attendanceRecords.filter((r) => r.tookCommunion).length > 0 && (
                      <span className="ml-2">
                        ({attendanceRecords.filter((r) => r.tookCommunion).length} took communion)
                      </span>
                    )}
                  </div>
                </>
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
    </div>
  );
}

