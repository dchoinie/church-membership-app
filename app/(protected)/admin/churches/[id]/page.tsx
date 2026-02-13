"use client";

import { useState, useEffect } from "react";

function ViewAsChurchLink({ churchId, subdomain }: { churchId: string; subdomain: string }) {
  const [href, setHref] = useState(`https://${subdomain}.simplechurchtools.com/dashboard?churchId=${churchId}`);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hn = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : "";
      const host =
        hn === "localhost" || hn === "127.0.0.1"
          ? `${subdomain}.localhost${port}`
          : (() => {
              const parts = hn.split(".");
              parts[0] = subdomain;
              return parts.join(".") + port;
            })();
      setHref(`${window.location.protocol}//${host}/dashboard?churchId=${churchId}`);
    }
  }, [churchId, subdomain]);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-md border p-3 hover:bg-muted/50 transition-colors"
    >
      <UserCog className="h-4 w-4" />
      View as Church (Super Admin Override)
    </a>
  );
}

function ChurchAppLink({ subdomain }: { subdomain: string }) {
  const [href, setHref] = useState(`https://${subdomain}.simplechurchtools.com`);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hn = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : "";
      const host =
        hn === "localhost" || hn === "127.0.0.1"
          ? `${subdomain}.localhost${port}`
          : (() => {
              const parts = hn.split(".");
              parts[0] = subdomain;
              return parts.join(".") + port;
            })();
      setHref(`${window.location.protocol}//${host}`);
    }
  }, [subdomain]);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-md border p-3 hover:bg-muted/50 transition-colors"
    >
      <ExternalLink className="h-4 w-4" />
      Open Church App
    </a>
  );
}
import { apiFetch } from "@/lib/api-client";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Loader2,
  ArrowLeft,
  Trash2,
  ExternalLink,
  CreditCard,
  UserCog,
} from "lucide-react";
import Link from "next/link";

interface ChurchSubscription {
  subscribedAt: string;
  canceledAt: string | null;
  currentPeriodEnd: string | null;
  status: string;
}

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
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
  subscription?: ChurchSubscription | null;
}

export default function ChurchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const churchId = params.id as string;
  const [church, setChurch] = useState<Church | null>(null);
  const [loading, setLoading] = useState(true);
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

      <Card>
        <CardHeader>
          <CardTitle>Church Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Church Name
              </dt>
              <dd className="mt-1 text-sm">{church.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Subdomain
              </dt>
              <dd className="mt-1 text-sm">
                {church.subdomain}.simplechurchtools.com
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Email</dt>
              <dd className="mt-1 text-sm">{church.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Phone
              </dt>
              <dd className="mt-1 text-sm">{church.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Address
              </dt>
              <dd className="mt-1 text-sm">{church.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Subscription Status
              </dt>
              <dd className="mt-1 text-sm capitalize">
                {church.subscriptionStatus}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Plan</dt>
              <dd className="mt-1 text-sm capitalize">
                {church.subscriptionPlan}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Created
              </dt>
              <dd className="mt-1 text-sm">
                {church.createdAt
                  ? new Date(church.createdAt).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
          </dl>

          {church.subscription && (
            <div className="rounded-md border p-4 space-y-2">
              <p className="text-sm font-medium">Subscription Details</p>
              <div className="text-sm text-muted-foreground grid gap-1">
                {church.subscription.subscribedAt && (
                  <p>
                    Subscribed:{" "}
                    {new Date(
                      church.subscription.subscribedAt
                    ).toLocaleDateString()}
                  </p>
                )}
                {church.subscription.canceledAt && (
                  <p>
                    Cancelled:{" "}
                    {new Date(
                      church.subscription.canceledAt
                    ).toLocaleDateString()}
                  </p>
                )}
                {church.subscription.currentPeriodEnd && (
                  <p>
                    Period ends:{" "}
                    {new Date(
                      church.subscription.currentPeriodEnd
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Common links for debugging and support
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <ChurchAppLink subdomain={church.subdomain} />
          {church.stripeCustomerId && (
            <a
              href={`https://dashboard.stripe.com/customers/${church.stripeCustomerId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md border p-3 hover:bg-muted/50 transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              View in Stripe
            </a>
          )}
          <ViewAsChurchLink churchId={church.id} subdomain={church.subdomain} />
        </CardContent>
      </Card>

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

