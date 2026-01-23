"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { TrashIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UserStatus = "active" | "invited" | "expired";
type UserRole = "admin" | "viewer";

interface User {
  id: string | null;
  name: string | null;
  email: string;
  role?: UserRole;
  status: UserStatus;
  createdAt: Date | string | null;
  emailVerified: boolean;
}

interface UsersResponse {
  users: User[];
  adminLimit?: number;
  adminCount?: number;
}

export default function ManageAdminAccessPage() {
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("viewer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingRoles, setUpdatingRoles] = useState<Set<string>>(new Set());
  const [adminLimit, setAdminLimit] = useState<number | null>(null);
  const [adminCount, setAdminCount] = useState<number | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data: UsersResponse = await response.json();
      setUsers(data.users);
      if (data.adminLimit !== undefined) {
        setAdminLimit(data.adminLimit);
      }
      if (data.adminCount !== undefined) {
        setAdminCount(data.adminCount);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create invitation");
      }

      if (data.emailSent) {
        setSuccessMessage(data.message);
      } else {
        setSuccessMessage(
          `${data.message} ${data.warning ? data.warning : ""}`,
        );
      }
      setEmail("");
      setInviteRole("viewer");
      // Refresh the users list
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/admin/users/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userToDelete.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete user");
      }

      setSuccessMessage(data.message);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      // Refresh the users list
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            Active
          </Badge>
        );
      case "invited":
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-700">
            Invited
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline" className="border-gray-400 text-gray-600">
            Expired
          </Badge>
        );
    }
  };

  const getRoleBadge = (role?: UserRole) => {
    const displayRole = role || "viewer";
    return (
      <Badge
        variant={displayRole === "admin" ? "default" : "outline"}
        className={
          displayRole === "admin"
            ? "bg-blue-500 hover:bg-blue-600"
            : "border-gray-400 text-gray-700"
        }
      >
        {displayRole === "admin" ? "Admin" : "Viewer"}
      </Badge>
    );
  };

  const handleRoleChange = async (userEmail: string, newRole: UserRole) => {
    setUpdatingRoles((prev) => new Set(prev).add(userEmail));
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/admin/users/update-role", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      setSuccessMessage(data.message);
      // Refresh the users list
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setUpdatingRoles((prev) => {
        const next = new Set(prev);
        next.delete(userEmail);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manage User Access</h1>
        <p className="text-muted-foreground mt-2">
          Invite new users and manage existing user access and roles for your church.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite New User</CardTitle>
          <CardDescription>
            Send an invitation to a new user by email address. Choose their role (Admin or Viewer).
            {adminLimit !== null && adminCount !== null && (
              <span className="block mt-1 text-sm">
                Admin users: {adminCount}/{adminLimit}
                {adminCount >= adminLimit && (
                  <span className="text-destructive ml-2">(Limit reached)</span>
                )}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(value) => setInviteRole(value as UserRole)}
                disabled={isSubmitting || (inviteRole === "admin" && adminLimit !== null && adminCount !== null && adminCount >= adminLimit)}
              >
                <SelectTrigger id="role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem 
                    value="admin"
                    disabled={adminLimit !== null && adminCount !== null && adminCount >= adminLimit}
                  >
                    Admin
                    {adminLimit !== null && adminCount !== null && adminCount >= adminLimit && " (Limit reached)"}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Viewers can view data but cannot make changes. Admins have full access.
                {adminLimit !== null && adminCount !== null && adminCount >= adminLimit && (
                  <span className="block mt-1 text-destructive">
                    Admin user limit reached. Upgrade to Premium plan for more admin users.
                  </span>
                )}
              </p>
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="text-sm text-green-700 bg-green-50 p-3 rounded-md">
                {successMessage}
              </div>
            )}
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting ? "Sending Invitation..." : "Send Invitation"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Church Users</CardTitle>
          <CardDescription>
            View all users for your church and manage their roles and access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading users...
            </div>
          ) : users.length === 0 ? (
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
                  <TableHead>Status</TableHead>
                  <TableHead>Email Verified</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id || user.email}>
                    <TableCell className="font-medium">
                      {user.name || "—"}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.status === "active" && user.id ? (
                        <Select
                          value={user.role || "viewer"}
                          onValueChange={(value) =>
                            handleRoleChange(user.email, value as UserRole)
                          }
                          disabled={updatingRoles.has(user.email)}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem 
                              value="admin"
                              disabled={adminLimit !== null && adminCount !== null && adminCount >= adminLimit && user.role !== "admin"}
                            >
                              Admin
                              {adminLimit !== null && adminCount !== null && adminCount >= adminLimit && user.role !== "admin" && " (Limit reached)"}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        getRoleBadge(user.role)
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
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
                        title="Remove access"
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Admin Access</AlertDialogTitle>
            <div className="text-sm text-muted-foreground space-y-3">
              <AlertDialogDescription asChild>
                <p>
                  Are you sure you want to remove admin access for{" "}
                  <strong>{userToDelete?.email}</strong>? This action will:
                </p>
              </AlertDialogDescription>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Delete the user account</li>
                <li>Remove all associated sessions</li>
                <li>Delete all invitations for this email</li>
              </ul>
              <p className="font-semibold text-destructive">
                This action cannot be undone.
              </p>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Removing..." : "Remove Access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

