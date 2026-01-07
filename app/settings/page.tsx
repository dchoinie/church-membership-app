"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, ExternalLink, Users, TrashIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";

interface Church {
  id: string;
  name: string;
  subdomain: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  subscriptionStatus: string;
  subscriptionPlan: string;
  stripeCustomerId: string | null;
  trialEndsAt: string | Date | null;
}

interface ChurchUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: Date | string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [church, setChurch] = useState<Church | null>(null);
  const [users, setUsers] = useState<ChurchUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ChurchUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    fetchChurch();
    fetchUsers();
  }, []);

  const fetchChurch = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/church");
      if (!response.ok) {
        throw new Error("Failed to fetch church");
      }
      const data = await response.json();
      setChurch(data.church);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load church");
      toast.error("Failed to load church settings");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/churches/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const handleGeneralSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!church) return;

    setSaving(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const response = await fetch(`/api/churches/${church.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          address: formData.get("address"),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update church");
      }

      const data = await response.json();
      setChurch(data.church);
      toast.success("General settings updated successfully");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update church";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleBrandingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!church) return;

    setSaving(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const response = await fetch(`/api/churches/${church.id}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl: formData.get("logoUrl") || null,
          primaryColor: formData.get("primaryColor") || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update branding");
      }

      const data = await response.json();
      setChurch(data.church);
      toast.success("Branding settings updated successfully");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update branding";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!church?.stripeCustomerId) {
      toast.error("No subscription found");
      return;
    }

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const data = await response.json();
      window.location.href = data.url;
    } catch (err) {
      toast.error("Failed to open subscription portal");
    }
  };

  const handleInviteUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsInviting(true);
    setError(null);

    try {
      const response = await fetch("/api/churches/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      toast.success(data.message || "Invitation sent successfully");
      setInviteEmail("");
      await fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send invitation";
      setError(message);
      toast.error(message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleDeleteClick = (user: ChurchUser) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/churches/users/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userToDelete.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete user");
      }

      toast.success(data.message || "User removed successfully");
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      await fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete user";
      setError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error && !church) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!church) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Church Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your church information, branding, subscription, and user access.
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <form onSubmit={handleGeneralSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>General Information</CardTitle>
                <CardDescription>
                  Update your church&apos;s basic information and contact details.
                </CardDescription>
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
                  <Label htmlFor="subdomain">Subdomain</Label>
                  <Input
                    id="subdomain"
                    name="subdomain"
                    value={church.subdomain}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    Subdomain cannot be changed after creation.
                  </p>
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
        </TabsContent>

        <TabsContent value="branding">
          <form onSubmit={handleBrandingSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Branding</CardTitle>
                <CardDescription>
                  Customize your church&apos;s logo and primary color.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    name="logoUrl"
                    type="url"
                    placeholder="https://example.com/logo.png"
                    defaultValue={church.logoUrl || ""}
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter the URL of your church logo image.
                  </p>
                </div>

                {church.logoUrl && (
                  <div className="space-y-2">
                    <Label>Current Logo</Label>
                    <div className="border rounded-md p-4 flex items-center justify-center">
                      <img
                        src={church.logoUrl}
                        alt="Church logo"
                        className="max-h-32 max-w-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      name="primaryColor"
                      type="color"
                      defaultValue={church.primaryColor || "#3b82f6"}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      defaultValue={church.primaryColor || "#3b82f6"}
                      placeholder="#3b82f6"
                      onChange={(e) => {
                        const colorInput = document.getElementById("primaryColor") as HTMLInputElement;
                        if (colorInput) {
                          colorInput.value = e.target.value;
                        }
                      }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Choose a primary color for your church branding (hex format).
                  </p>
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
        </TabsContent>

        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Management</CardTitle>
              <CardDescription>
                Manage your subscription plan and billing information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Plan</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {church.subscriptionPlan.charAt(0).toUpperCase() + church.subscriptionPlan.slice(1)}
                  </Badge>
                  <Badge
                    variant={
                      church.subscriptionStatus === "active"
                        ? "default"
                        : church.subscriptionStatus === "trialing"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {church.subscriptionStatus.charAt(0).toUpperCase() +
                      church.subscriptionStatus.slice(1).replace("_", " ")}
                  </Badge>
                </div>
              </div>

              {church.trialEndsAt && (
                <div className="space-y-2">
                  <Label>Trial Ends</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(church.trialEndsAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="pt-4">
                <Button
                  onClick={handleManageSubscription}
                  disabled={!church.stripeCustomerId}
                  className="cursor-pointer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Manage Subscription
                </Button>
                {!church.stripeCustomerId && (
                  <p className="text-sm text-muted-foreground mt-2">
                    No active subscription found.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Invite New User</CardTitle>
                <CardDescription>
                  Send an invitation to a new administrator by email address.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInviteUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteEmail">Email Address</Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      placeholder="admin@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      disabled={isInviting}
                    />
                  </div>
                  {error && (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                      {error}
                    </div>
                  )}
                  <Button type="submit" disabled={isInviting}>
                    {isInviting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Users className="mr-2 h-4 w-4" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Church Users</CardTitle>
                <CardDescription>
                  View all users with access to this church.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No users found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Email Verified</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.name || "—"}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1).replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.emailVerified ? (
                              <Badge variant="outline" className="border-green-500 text-green-700">
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-gray-400 text-gray-600">
                                Not Verified
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(user)}
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Remove user access"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove access for{" "}
              <strong>{userToDelete?.email}</strong>? This action will delete
              the user account and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Removing..." : "Remove Access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

