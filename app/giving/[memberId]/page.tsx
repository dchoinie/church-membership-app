"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { PlusIcon, PencilIcon, ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  amount: string;
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
  amount: string;
  dateGiven: string;
  notes: string;
}

export default function MemberGivingPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const router = useRouter();
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
      amount: "",
      dateGiven: "",
      notes: "",
    },
  });

  const addForm = useForm<GivingFormData>({
    defaultValues: {
      amount: "",
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
      const response = await fetch(`/api/members/${id}`);
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
      const response = await fetch(`/api/giving/member/${id}`);
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
      amount: record.amount,
      dateGiven: record.dateGiven,
      notes: record.notes || "",
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (data: GivingFormData) => {
    if (!editingRecord) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/giving/${editingRecord.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(data.amount),
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

    setSubmitting(true);
    try {
      const response = await fetch("/api/giving", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId: memberId,
          amount: parseFloat(data.amount),
          dateGiven: data.dateGiven,
          notes: data.notes || null,
        }),
      });

      if (response.ok) {
        setAddDialogOpen(false);
        addForm.reset({
          amount: "",
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

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const totalAmount = givingRecords.reduce((sum, record) => {
    return sum + parseFloat(record.amount);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/giving">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {member ? `${member.firstName} ${member.lastName}` : "Loading..."}
            </h1>
            <p className="text-muted-foreground mt-2">
              Giving History
            </p>
          </div>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="cursor-pointer"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Record
          </Button>
        </Dialog>
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
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {givingRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{formatDate(record.dateGiven)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(record.amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(record)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
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
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Updating..." : "Update Record"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
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
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Record"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

