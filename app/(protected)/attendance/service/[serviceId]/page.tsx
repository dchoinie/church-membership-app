"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Loader2, ArrowLeft, PencilIcon } from "lucide-react";

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
  const serviceId = params.serviceId as string;
  const mode = searchParams.get("mode") || "view"; // Default to view mode

  const [service, setService] = useState<Service | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const isEditMode = mode === "edit";

  useEffect(() => {
    if (serviceId) {
      fetchServiceAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, mode]);

  const fetchServiceAttendance = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/attendance/service/${serviceId}`);
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
            {!isEditMode && (
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
                      {isEditMode && (
                        <TableHead className="text-right">Actions</TableHead>
                      )}
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
                        {isEditMode && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(record)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
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
    </div>
  );
}

