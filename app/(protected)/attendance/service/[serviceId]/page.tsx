"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Loader2, ArrowLeft, PencilIcon, PlusIcon, XIcon, CheckCircle2, AlertCircle } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

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
    membershipCode: string | null;
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

interface NonMemberFormData {
  name: string;
  tookCommunion: boolean;
  memberId?: string; // Track existing guest member ID if this is an existing guest
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
  const [nonMembers, setNonMembers] = useState<NonMemberFormData[]>([{ name: "", tookCommunion: false }]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showAlertMessage, setShowAlertMessage] = useState(false);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
        setNonMembers([{ name: "", tookCommunion: false }]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, mode, includeInactive]);


  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const url = includeInactive 
        ? "/api/attendance/members?includeInactive=true"
        : "/api/attendance/members";
      const response = await apiFetch(url);
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
      // Only include non-guest members in formData
      members.forEach((member) => {
        const existingRecord = attendanceRecords.find(
          (r) => r.memberId === member.id && r.member.membershipCode !== "GUEST"
        );
        if (existingRecord) {
          initialFormData[member.id] = {
            attended: existingRecord.attended,
            tookCommunion: existingRecord.tookCommunion,
          };
        } else {
          // Initialize with false if no record exists
          initialFormData[member.id] = {
            attended: false,
            tookCommunion: false,
          };
        }
      });
      setFormData(initialFormData);

      // Populate nonMembers with existing guest records
      const guestRecords = attendanceRecords.filter(
        (r) => r.member.membershipCode === "GUEST" && r.attended
      );
      if (guestRecords.length > 0) {
        const guestNonMembers: NonMemberFormData[] = guestRecords.map((record) => ({
          name: `${record.member.firstName} ${record.member.lastName}`.trim(),
          tookCommunion: record.tookCommunion,
          memberId: record.memberId, // Track the member ID for updates
        }));
        setNonMembers(guestNonMembers);
      } else {
        // If no guests, start with one empty entry
        setNonMembers([{ name: "", tookCommunion: false }]);
      }
    } else if (isEditMode && !loadingMembers) {
      // Reset nonMembers when switching to edit mode but before members load
      setNonMembers([{ name: "", tookCommunion: false }]);
    }
  }, [isEditMode, members, attendanceRecords, loadingMembers]);

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

  const handleSave = async () => {
    if (!serviceId) return;

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

      // Handle guest member records - use existing memberId if available, otherwise create new
      const guestMemberRecords: Array<{ memberId: string; attended: boolean; tookCommunion: boolean }> = [];
      if (validNonMembers.length > 0) {
        for (const nonMember of validNonMembers) {
          if (nonMember.memberId) {
            // This is an existing guest, use their memberId
            guestMemberRecords.push({
              memberId: nonMember.memberId,
              attended: true,
              tookCommunion: nonMember.tookCommunion,
            });
          } else {
            // This is a new guest, create a new member record
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
                guestMemberRecords.push({
                  memberId: guestData.member.id,
                  attended: true,
                  tookCommunion: nonMember.tookCommunion,
                });
              } else {
                const errorData = await guestResponse.json().catch(() => ({ error: "Unknown error" }));
                console.error(`Failed to create guest member for ${nonMember.name}:`, errorData.error);
              }
            } catch (error) {
              console.error(`Error creating guest member for ${nonMember.name}:`, error);
            }
          }
        }
      }

      // Combine member records with guest member records
      const allRecords = [
        ...memberRecords,
        ...guestMemberRecords,
      ];

      const response = await apiFetch("/api/attendance", {
        method: "POST",
        body: JSON.stringify({
          serviceId,
          records: allRecords,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        // Clear any existing timeout before showing new message
        if (alertTimeoutRef.current) {
          clearTimeout(alertTimeoutRef.current);
          alertTimeoutRef.current = null;
        }
        setShowAlertMessage(true);
        setAlertMessage({ type: "error", message: `Failed to save attendance: ${error.error || "Unknown error"}` });
        return;
      }

      const result = await response.json();
      
      if (result.failed > 0 && result.errors.length > 0) {
        setShowAlertMessage(true);
        setAlertMessage({ type: "error", message: `Some records failed to save:\n${result.errors.join("\n")}` });
      }

      // Refresh attendance records
      await fetchServiceAttendance();
      
      setShowAlertMessage(true);
      setAlertMessage({ type: "success", message: `Successfully saved ${result.success} attendance record(s)` });
      
      // Switch back to view mode
      router.push(`/attendance/service/${serviceId}?mode=view`);
    } catch (error) {
      console.error("Error saving attendance:", error);
      // Clear any existing timeout before showing new message
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
        alertTimeoutRef.current = null;
      }
      setShowAlertMessage(true);
      setAlertMessage({ type: "error", message: "Failed to save attendance" });
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
        setShowAlertMessage(true);
        setAlertMessage({ type: "error", message: `Failed to update attendance: ${error.error || "Unknown error"}` });
        setEditSubmitting(false);
        return;
      }

      setEditDialogOpen(false);
      setEditingRecord(null);
      await fetchServiceAttendance();
      setShowAlertMessage(true);
      setAlertMessage({ type: "success", message: "Successfully updated attendance" });
    } catch (error) {
      console.error("Error updating attendance:", error);
      setShowAlertMessage(true);
      setAlertMessage({ type: "error", message: "Failed to update attendance" });
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

      {/* Alert Messages */}
      {showAlertMessage && alertMessage && (
        <div
          className={`rounded-md p-4 flex items-start gap-3 border ${
            alertMessage.type === "success"
              ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
              : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
          }`}
        >
          {alertMessage.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-medium">{alertMessage.message}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onClick={() => {
              // Clear timeout when manually closing
              if (alertTimeoutRef.current) {
                clearTimeout(alertTimeoutRef.current);
                alertTimeoutRef.current = null;
              }
              setShowAlertMessage(false);
              setAlertMessage(null);
            }}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      )}

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
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-inactive"
                    checked={includeInactive}
                    onCheckedChange={(checked) => {
                      setIncludeInactive(checked);
                    }}
                    disabled={loadingMembers}
                  />
                  <Label
                    htmlFor="include-inactive"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Include inactive members
                  </Label>
                </div>
              </div>
              {loadingMembers || members.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {loadingMembers ? "Loading members..." : `No ${includeInactive ? "active or inactive" : "active"} members found`}
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
                    onClick={handleSave}
                    disabled={submitting || (members.length === 0 && nonMembers.every((nm) => !nm.name.trim()))}
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

