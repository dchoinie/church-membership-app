"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Loader2, ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";

interface Church {
  id: string;
  name: string;
  subdomain: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  subscriptionStatus: string;
  subscriptionPlan: string;
  trialEndsAt: string | null;
  createdAt: string;
}

export default function ChurchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const churchId = params.id as string;
  const [church, setChurch] = useState<Church | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"church" | "giving" | "members" | "attendance" | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchChurch();
  }, [churchId]);

  const fetchChurch = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch(`/api/admin/churches/${churchId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch church (${response.status})`);
      }
      const data = await response.json();
      setChurch(data.church);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load church");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!church) return;

    setSaving(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const response = await apiFetch(`/api/admin/churches/${churchId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          address: formData.get("address"),
          subscriptionStatus: formData.get("subscriptionStatus"),
          subscriptionPlan: formData.get("subscriptionPlan"),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update church");
      }

      router.refresh();
      fetchChurch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update church");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteType) return;

    setDeleting(true);
    setError(null);

    try {
      let endpoint = "";
      switch (deleteType) {
        case "church":
          endpoint = `/api/admin/churches/${churchId}`;
          break;
        case "giving":
          endpoint = `/api/admin/churches/${churchId}/delete-giving`;
          break;
        case "members":
          endpoint = `/api/admin/churches/${churchId}/delete-members-households`;
          break;
        case "attendance":
          endpoint = `/api/admin/churches/${churchId}/delete-attendance`;
          break;
      }

      const response = await apiFetch(endpoint, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete");
      }

      const data = await response.json();
      
      if (deleteType === "church") {
        // Redirect to churches list after deleting church
        router.push("/admin/churches");
      } else {
        // Refresh church data
        fetchChurch();
        setDeleteDialogOpen(false);
        setDeleteType(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (type: "church" | "giving" | "members" | "attendance") => {
    setDeleteType(type);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !church) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error || "Church not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/churches">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{church.name}</h1>
          <p className="text-muted-foreground mt-1">
            {church.subdomain}.simplechurchtools.com
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Church Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Church Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={church.name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={church.email || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={church.phone || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                defaultValue={church.address || ""}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subscriptionStatus">Subscription Status</Label>
                <select
                  id="subscriptionStatus"
                  name="subscriptionStatus"
                  defaultValue={church.subscriptionStatus}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="past_due">Past Due</option>
                  <option value="canceled">Canceled</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subscriptionPlan">Plan</Label>
                <select
                  id="subscriptionPlan"
                  name="subscriptionPlan"
                  defaultValue={church.subscriptionPlan}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* Super Admin Actions */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <p className="text-sm text-muted-foreground">
            These actions are irreversible. Use with extreme caution.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="destructive"
            onClick={() => openDeleteDialog("attendance")}
            disabled={deleting}
            className="w-full"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete All Attendance Records
          </Button>
          <Button
            variant="destructive"
            onClick={() => openDeleteDialog("giving")}
            disabled={deleting}
            className="w-full"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete All Giving Records
          </Button>
          <Button
            variant="destructive"
            onClick={() => openDeleteDialog("members")}
            disabled={deleting}
            className="w-full"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete All Members & Households
          </Button>
          <Button
            variant="destructive"
            onClick={() => openDeleteDialog("church")}
            disabled={deleting}
            className="w-full"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Entire Church
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {deleteType === "church" && (
                <>
                  <p>
                    This will <strong>permanently delete</strong> the entire church and{" "}
                    <strong>all associated data</strong>:
                  </p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>All members and households</li>
                    <li>All giving records</li>
                    <li>All attendance records</li>
                    <li>All services</li>
                    <li>All invitations</li>
                    <li>All user accounts linked to this church</li>
                  </ul>
                  <p className="font-semibold text-destructive mt-2">
                    This action cannot be undone.
                  </p>
                </>
              )}
              {deleteType === "giving" && (
                <>
                  <p>
                    This will <strong>permanently delete all giving records</strong> for this church.
                  </p>
                  <p className="font-semibold text-destructive mt-2">
                    This action cannot be undone.
                  </p>
                </>
              )}
              {deleteType === "members" && (
                <>
                  <p>
                    This will <strong>permanently delete all members and households</strong> for this church.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Note: This will also delete all giving and attendance records associated with these members.
                  </p>
                  <p className="font-semibold text-destructive mt-2">
                    This action cannot be undone.
                  </p>
                </>
              )}
              {deleteType === "attendance" && (
                <>
                  <p>
                    This will <strong>permanently delete all attendance records</strong> for this church.
                  </p>
                  <p className="font-semibold text-destructive mt-2">
                    This action cannot be undone.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
    </div>
  );
}

