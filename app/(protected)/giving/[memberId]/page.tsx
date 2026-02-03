"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { PlusIcon, PencilIcon, ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { usePermissions } from "@/lib/hooks/use-permissions";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  headOfHousehold: boolean | null;
  familyId: string | null;
}

interface GivingRecord {
  id: string;
  memberId: string;
  currentAmount: string | null;
  missionAmount: string | null;
  memorialsAmount: string | null;
  debtAmount: string | null;
  schoolAmount: string | null;
  miscellaneousAmount: string | null;
  dateGiven: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface GivingFormData {
  currentAmount: string;
  missionAmount: string;
  memorialsAmount: string;
  debtAmount: string;
  schoolAmount: string;
  miscellaneousAmount: string;
  dateGiven: string;
  notes: string;
}

export default function MemberGivingPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { canEditGiving } = usePermissions();
  const [member, setMember] = useState<Member | null>(null);
  const [givingRecords, setGivingRecords] = useState<GivingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GivingRecord | null>(null);
  const [memberId, setMemberId] = useState<string>("");

  const editForm = useForm<GivingFormData>({
    defaultValues: {
      currentAmount: "",
      missionAmount: "",
      memorialsAmount: "",
      debtAmount: "",
      schoolAmount: "",
      miscellaneousAmount: "",
      dateGiven: "",
      notes: "",
    },
  });

  const addForm = useForm<GivingFormData>({
    defaultValues: {
      currentAmount: "",
      missionAmount: "",
      memorialsAmount: "",
      debtAmount: "",
      schoolAmount: "",
      miscellaneousAmount: "",
      dateGiven: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  useEffect(() => {
    async function loadData() {
      const resolvedParams = await params;
      const id = resolvedParams.memberId;
      setMemberId(id);
      await fetchMember(id);
      await fetchGivingRecords(id);
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const fetchMember = async (id: string) => {
    try {
      const response = await apiFetch(`/api/members/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMember(data.member);
      }
    } catch (error) {
      console.error("Error fetching member:", error);
    }
  };

  const fetchGivingRecords = async (id: string) => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/giving/member/${id}`);
      if (response.ok) {
        const data = await response.json();
        setGivingRecords(data.giving || []);
      }
    } catch (error) {
      console.error("Error fetching giving records:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record: GivingRecord) => {
    setEditingRecord(record);
    editForm.reset({
      currentAmount: record.currentAmount || "",
      missionAmount: record.missionAmount || "",
      memorialsAmount: record.memorialsAmount || "",
      debtAmount: record.debtAmount || "",
      schoolAmount: record.schoolAmount || "",
      miscellaneousAmount: record.miscellaneousAmount || "",
      dateGiven: record.dateGiven,
      notes: record.notes || "",
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (data: GivingFormData) => {
    if (!editingRecord) return;

    // Validate at least one amount is provided
    const current = data.currentAmount ? parseFloat(data.currentAmount) : null;
    const mission = data.missionAmount ? parseFloat(data.missionAmount) : null;
    const memorials = data.memorialsAmount ? parseFloat(data.memorialsAmount) : null;
    const debt = data.debtAmount ? parseFloat(data.debtAmount) : null;
    const school = data.schoolAmount ? parseFloat(data.schoolAmount) : null;
    const miscellaneous = data.miscellaneousAmount ? parseFloat(data.miscellaneousAmount) : null;

    if (!current && !mission && !memorials && !debt && !school && !miscellaneous) {
      alert("At least one amount is required");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch(`/api/giving/${editingRecord.id}`, {
        method: "PUT",
        body: JSON.stringify({
          currentAmount: current,
          missionAmount: mission,
          memorialsAmount: memorials,
          debtAmount: debt,
          schoolAmount: school,
          miscellaneousAmount: miscellaneous,
          dateGiven: data.dateGiven,
          notes: data.notes || null,
        }),
      });

      if (response.ok) {
        setEditDialogOpen(false);
        setEditingRecord(null);
        await fetchGivingRecords(memberId);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update giving record");
      }
    } catch (error) {
      console.error("Error updating giving record:", error);
      alert("Failed to update giving record");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSubmit = async (data: GivingFormData) => {
    if (!memberId) return;

    // Validate at least one amount is provided
    const current = data.currentAmount ? parseFloat(data.currentAmount) : null;
    const mission = data.missionAmount ? parseFloat(data.missionAmount) : null;
    const memorials = data.memorialsAmount ? parseFloat(data.memorialsAmount) : null;
    const debt = data.debtAmount ? parseFloat(data.debtAmount) : null;
    const school = data.schoolAmount ? parseFloat(data.schoolAmount) : null;
    const miscellaneous = data.miscellaneousAmount ? parseFloat(data.miscellaneousAmount) : null;

    if (!current && !mission && !memorials && !debt && !school && !miscellaneous) {
      alert("At least one amount is required");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch("/api/giving", {
        method: "POST",
        body: JSON.stringify({
          memberId: memberId,
          currentAmount: current,
          missionAmount: mission,
          memorialsAmount: memorials,
          debtAmount: debt,
          schoolAmount: school,
          miscellaneousAmount: miscellaneous,
          dateGiven: data.dateGiven,
          notes: data.notes || null,
        }),
      });

      if (response.ok) {
        setAddDialogOpen(false);
        addForm.reset({
          currentAmount: "",
          missionAmount: "",
          memorialsAmount: "",
          debtAmount: "",
          schoolAmount: "",
          miscellaneousAmount: "",
          dateGiven: new Date().toISOString().split("T")[0],
          notes: "",
        });
        await fetchGivingRecords(memberId);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create giving record");
      }
    } catch (error) {
      console.error("Error creating giving record:", error);
      alert("Failed to create giving record");
    } finally {
      setSubmitting(false);
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

  const formatCurrency = (amount: string | null | undefined) => {
    const num = parseFloat(amount || "0");
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const calculateTotal = (
    current: string | null,
    mission: string | null,
    memorials: string | null,
    debt: string | null,
    school: string | null,
    miscellaneous: string | null
  ): number => {
    const curr = parseFloat(current || "0") || 0;
    const miss = parseFloat(mission || "0") || 0;
    const mem = parseFloat(memorials || "0") || 0;
    const deb = parseFloat(debt || "0") || 0;
    const sch = parseFloat(school || "0") || 0;
    const misc = parseFloat(miscellaneous || "0") || 0;
    return curr + miss + mem + deb + sch + misc;
  };

  const totalAmount = givingRecords.reduce((sum, record) => {
    return sum + calculateTotal(
      record.currentAmount,
      record.missionAmount,
      record.memorialsAmount,
      record.debtAmount,
      record.schoolAmount,
      record.miscellaneousAmount
    );
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/giving">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {member ? `${member.firstName} ${member.lastName}` : "Loading..."}
            </h1>
            <p className="text-muted-foreground mt-2">
              Giving History
            </p>
          </div>
        </div>
        {canEditGiving && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="cursor-pointer"
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Record
            </Button>
          </Dialog>
        )}
      </div>

      {member && (
        <Card>
          <CardHeader>
            <CardTitle>Member Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">
                  {member.firstName} {member.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Head of Household</p>
                <p className="font-medium">
                  {member.headOfHousehold ? "Yes" : "No"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Giving Records</CardTitle>
            {givingRecords.length > 0 && (
              <div className="text-lg font-semibold">
                Total: {formatCurrency(totalAmount.toString())}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading giving records...
            </div>
          ) : givingRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No giving records found for this member.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Mission</TableHead>
                  <TableHead>Memorials</TableHead>
                  <TableHead>Debt</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Miscellaneous</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Notes</TableHead>
                  {canEditGiving && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {givingRecords.map((record) => {
                  const total = calculateTotal(
                    record.currentAmount,
                    record.missionAmount,
                    record.memorialsAmount,
                    record.debtAmount,
                    record.schoolAmount,
                    record.miscellaneousAmount
                  );
                  return (
                    <TableRow key={record.id}>
                      <TableCell>{formatDate(record.dateGiven)}</TableCell>
                      <TableCell>{formatCurrency(record.currentAmount)}</TableCell>
                      <TableCell>{formatCurrency(record.missionAmount)}</TableCell>
                      <TableCell>{formatCurrency(record.memorialsAmount)}</TableCell>
                      <TableCell>{formatCurrency(record.debtAmount)}</TableCell>
                      <TableCell>{formatCurrency(record.schoolAmount)}</TableCell>
                      <TableCell>{formatCurrency(record.miscellaneousAmount)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(total.toString())}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {record.notes || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(record)}
                          className="cursor-pointer"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {canEditGiving && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Giving Record</DialogTitle>
            <DialogDescription>
              Update the giving record details.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(handleEditSubmit)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="currentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="missionAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mission Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="memorialsAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Memorials Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="debtAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Debt Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="schoolAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="miscellaneousAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Miscellaneous Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-xs text-muted-foreground">
                * At least one amount is required
              </p>
              <FormField
                control={editForm.control}
                name="dateGiven"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Given *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Optional notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setEditingRecord(null);
                  }}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="cursor-pointer">
                  {submitting ? "Updating..." : "Update Record"}
                </Button>
              </DialogFooter>
                </form>
              </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Dialog */}
      {canEditGiving && (
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Giving Record</DialogTitle>
            <DialogDescription>
              Enter a new giving record for this member.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form
              onSubmit={addForm.handleSubmit(handleAddSubmit)}
              className="space-y-4"
            >
              <FormField
                control={addForm.control}
                name="currentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="missionAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mission Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="memorialsAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Memorials Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="debtAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Debt Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="schoolAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="miscellaneousAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Miscellaneous Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-xs text-muted-foreground">
                * At least one amount is required
              </p>
              <FormField
                control={addForm.control}
                name="dateGiven"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Given *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Optional notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="cursor-pointer">
                  {submitting ? "Creating..." : "Create Record"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}

