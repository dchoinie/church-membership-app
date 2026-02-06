"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
import { PencilIcon, TrashIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon, CheckIcon, XIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Switch } from "@/components/ui/switch";

interface GivingCategory {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GivingCategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoriesUpdated?: () => void;
}

export function GivingCategoryManager({
  open,
  onOpenChange,
  onCategoriesUpdated,
}: GivingCategoryManagerProps) {
  const [categories, setCategories] = useState<GivingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<GivingCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await apiFetch("/api/giving-categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const handleEdit = (category: GivingCategory) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleSaveEdit = async (categoryId: string) => {
    if (!editingName.trim()) {
      alert("Category name cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiFetch(`/api/giving-categories/${categoryId}`, {
        method: "PUT",
        body: JSON.stringify({ name: editingName.trim() }),
      });

      if (response.ok) {
        await fetchCategories();
        setEditingId(null);
        setEditingName("");
        onCategoriesUpdated?.();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update category");
      }
    } catch (error) {
      console.error("Error updating category:", error);
      alert("Failed to update category");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (category: GivingCategory) => {
    setIsSaving(true);
    try {
      const response = await apiFetch(`/api/giving-categories/${category.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !category.isActive }),
      });

      if (response.ok) {
        await fetchCategories();
        onCategoriesUpdated?.();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update category");
      }
    } catch (error) {
      console.error("Error updating category:", error);
      alert("Failed to update category");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveUp = async (category: GivingCategory) => {
    const currentIndex = categories.findIndex(c => c.id === category.id);
    if (currentIndex <= 0) return;

    const newOrder = categories[currentIndex - 1].displayOrder;
    setIsSaving(true);
    try {
      const response = await apiFetch(`/api/giving-categories/${category.id}`, {
        method: "PUT",
        body: JSON.stringify({ displayOrder: newOrder }),
      });

      if (response.ok) {
        await fetchCategories();
        onCategoriesUpdated?.();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to reorder category");
      }
    } catch (error) {
      console.error("Error reordering category:", error);
      alert("Failed to reorder category");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveDown = async (category: GivingCategory) => {
    const currentIndex = categories.findIndex(c => c.id === category.id);
    if (currentIndex >= categories.length - 1) return;

    const newOrder = categories[currentIndex + 1].displayOrder;
    setIsSaving(true);
    try {
      const response = await apiFetch(`/api/giving-categories/${category.id}`, {
        method: "PUT",
        body: JSON.stringify({ displayOrder: newOrder }),
      });

      if (response.ok) {
        await fetchCategories();
        onCategoriesUpdated?.();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to reorder category");
      }
    } catch (error) {
      console.error("Error reordering category:", error);
      alert("Failed to reorder category");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNew = async () => {
    if (!newCategoryName.trim()) {
      alert("Category name cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiFetch("/api/giving-categories", {
        method: "POST",
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      if (response.ok) {
        await fetchCategories();
        setAddingNew(false);
        setNewCategoryName("");
        onCategoriesUpdated?.();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create category");
      }
    } catch (error) {
      console.error("Error creating category:", error);
      alert("Failed to create category");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (category: GivingCategory) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);
    try {
      const response = await apiFetch(`/api/giving-categories/${categoryToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchCategories();
        setDeleteDialogOpen(false);
        setCategoryToDelete(null);
        onCategoriesUpdated?.();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Failed to delete category");
    } finally {
      setIsDeleting(false);
    }
  };

  const sortedCategories = [...categories].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Manage Giving Categories</DialogTitle>
            <DialogDescription>
              Customize the giving categories for your church. Categories can be renamed, reordered, activated, or deactivated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add new category */}
            {addingNew ? (
              <div className="flex items-center gap-2 p-4 border rounded-lg">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddNew();
                    } else if (e.key === "Escape") {
                      setAddingNew(false);
                      setNewCategoryName("");
                    }
                  }}
                />
                <Button
                  onClick={handleAddNew}
                  disabled={isSaving}
                  size="sm"
                >
                  <CheckIcon className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => {
                    setAddingNew(false);
                    setNewCategoryName("");
                  }}
                  variant="ghost"
                  size="sm"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setAddingNew(true)}
                variant="outline"
                className="w-full"
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Add New Category
              </Button>
            )}

            {/* Categories list */}
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading categories...
              </div>
            ) : sortedCategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No categories found. Add your first category above.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Order</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-24">Active</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCategories.map((category, index) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMoveUp(category)}
                            disabled={index === 0 || isSaving}
                          >
                            <ChevronUpIcon className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMoveDown(category)}
                            disabled={index === sortedCategories.length - 1 || isSaving}
                          >
                            <ChevronDownIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {editingId === category.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveEdit(category.id);
                                } else if (e.key === "Escape") {
                                  handleCancelEdit();
                                }
                              }}
                              className="flex-1"
                              autoFocus
                            />
                            <Button
                              onClick={() => handleSaveEdit(category.id)}
                              disabled={isSaving}
                              size="sm"
                              variant="ghost"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={handleCancelEdit}
                              size="sm"
                              variant="ghost"
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className={category.isActive ? "" : "text-muted-foreground line-through"}>
                            {category.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={category.isActive}
                          onCheckedChange={() => handleToggleActive(category)}
                          disabled={isSaving}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {editingId !== category.id && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(category)}
                                disabled={isSaving}
                              >
                                <PencilIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(category)}
                                disabled={isSaving}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{categoryToDelete?.name}&quot;? 
              {categoryToDelete && " This category cannot be deleted if it has giving records associated with it. You can deactivate it instead."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
