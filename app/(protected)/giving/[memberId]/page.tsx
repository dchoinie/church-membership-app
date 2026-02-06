"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { PlusIcon, PencilIcon, ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { ServiceSelector } from "@/components/ui/service-selector";

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

interface GivingItem {
  categoryId: string;
  categoryName: string;
  amount: string;
}

interface GivingRecord {
  id: string;
  memberId: string;
  serviceId: string | null;
  dateGiven: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: GivingItem[];
  member: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface GivingCategory {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

interface GivingFormData {
  serviceId: string | null;
  notes: string;
  items: Record<string, string>; // categoryId -> amount
}

interface Service {
  id: string;
  serviceDate: string;
  serviceType: string;
  serviceTime: string | null;
}

export default function MemberGivingPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { canEditGiving } = usePermissions();
  const [member, setMember] = useState<Member | null>(null);
  const [givingRecords, setGivingRecords] = useState<GivingRecord[]>([]);
  const [categories, setCategories] = useState<GivingCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GivingRecord | null>(null);
  const [memberId, setMemberId] = useState<string>("");

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await apiFetch("/api/giving-categories");
      if (response.ok) {
        const data = await response.json();
        const activeCategories = (data.categories || []).filter((cat: GivingCategory) => cat.isActive);
        setCategories(activeCategories.sort((a: GivingCategory, b: GivingCategory) => {
          if (a.displayOrder !== b.displayOrder) {
            return a.displayOrder - b.displayOrder;
          }
          return a.name.localeCompare(b.name);
        }));
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  // Fetch services
  const fetchServices = async () => {
    try {
      const response = await apiFetch("/api/services?pageSize=1000");
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  // Initialize form defaults based on categories
  const getFormDefaults = () => {
    const items: Record<string, string> = {};
    categories.forEach(cat => {
      items[cat.id] = "";
    });
    return {
      serviceId: null,
      notes: "",
      items,
    };
  };

  const editForm = useForm<GivingFormData>({
    defaultValues: getFormDefaults(),
  });

  const addForm = useForm<GivingFormData>({
    defaultValues: getFormDefaults(),
  });

  // Update form defaults when categories change
  useEffect(() => {
    if (categories.length > 0) {
      editForm.reset(getFormDefaults());
      addForm.reset(getFormDefaults());
    }
  }, [categories]);

  useEffect(() => {
    async function loadData() {
      const resolvedParams = await params;
      const id = resolvedParams.memberId;
      setMemberId(id);
      await fetchCategories();
      await fetchServices();
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
    const items: Record<string, string> = {};
    categories.forEach(cat => {
      const item = record.items?.find(i => i.categoryId === cat.id);
      items[cat.id] = item?.amount || "";
    });
    editForm.reset({
      serviceId: record.serviceId,
      notes: record.notes || "",
      items,
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (data: GivingFormData) => {
    if (!editingRecord) return;

    // Build items array from form data
    const items = Object.entries(data.items || {})
      .map(([categoryId, amount]) => {
        const parsedAmount = amount ? parseFloat(amount) : null;
        if (!categoryId || !parsedAmount || parsedAmount <= 0) {
          return null;
        }
        return {
          categoryId,
          amount: parsedAmount,
        };
      })
      .filter((item): item is { categoryId: string; amount: number } => item !== null);

    if (items.length === 0) {
      alert("At least one amount is required");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch(`/api/giving/${editingRecord.id}`, {
        method: "PUT",
        body: JSON.stringify({
          serviceId: data.serviceId,
          notes: data.notes || null,
          items,
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

    // Build items array from form data
    const items = Object.entries(data.items || {})
      .map(([categoryId, amount]) => {
        const parsedAmount = amount ? parseFloat(amount) : null;
        if (!categoryId || !parsedAmount || parsedAmount <= 0) {
          return null;
        }
        return {
          categoryId,
          amount: parsedAmount,
        };
      })
      .filter((item): item is { categoryId: string; amount: number } => item !== null);

    if (items.length === 0) {
      alert("At least one amount is required");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch("/api/giving", {
        method: "POST",
        body: JSON.stringify({
          memberId: memberId,
          serviceId: data.serviceId,
          notes: data.notes || null,
          items,
        }),
      });

      if (response.ok) {
        setAddDialogOpen(false);
        addForm.reset(getFormDefaults());
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

  const calculateTotal = (items: GivingItem[]): number => {
    return items.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
  };

  const totalAmount = givingRecords.reduce((sum, record) => {
    return sum + calculateTotal(record.items || []);
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
                  {categories.map((cat) => (
                    <TableHead key={cat.id}>{cat.name}</TableHead>
                  ))}
                  <TableHead>Total</TableHead>
                  <TableHead>Notes</TableHead>
                  {canEditGiving && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {givingRecords.map((record) => {
                  const total = calculateTotal(record.items || []);
                  return (
                    <TableRow key={record.id}>
                      <TableCell>{formatDate(record.dateGiven)}</TableCell>
                      {categories.map((cat) => {
                        const item = record.items?.find(i => i.categoryId === cat.id);
                        return (
                          <TableCell key={cat.id}>{formatCurrency(item?.amount || "0")}</TableCell>
                        );
                      })}
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
              {categories.map((category) => (
                <FormField
                  key={category.id}
                  control={editForm.control}
                  name={`items.${category.id}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{category.name} Amount</FormLabel>
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
              ))}
              <p className="text-xs text-muted-foreground">
                * At least one amount is required
              </p>
              <FormField
                control={editForm.control}
                name="serviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service *</FormLabel>
                    <FormControl>
                      <ServiceSelector
                        value={field.value}
                        onValueChange={field.onChange}
                        services={services}
                      />
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
              {categories.map((category) => (
                <FormField
                  key={category.id}
                  control={addForm.control}
                  name={`items.${category.id}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{category.name} Amount</FormLabel>
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
              ))}
              <p className="text-xs text-muted-foreground">
                * At least one amount is required
              </p>
              <FormField
                control={addForm.control}
                name="serviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service *</FormLabel>
                    <FormControl>
                      <ServiceSelector
                        value={field.value}
                        onValueChange={field.onChange}
                        services={services}
                      />
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

