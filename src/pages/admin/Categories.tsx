import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Trash, Upload, X, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export default function Categories() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    display_order: "0",
    image_url: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isSubCategoryDialogOpen, setIsSubCategoryDialogOpen] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<any>(null);
  const [currentCategoryId, setCurrentCategoryId] = useState<string>("");
  const [subCategoryFormData, setSubCategoryFormData] = useState({
    name: "",
    slug: "",
    description: "",
    display_order: "0",
    featured_on_homepage: false,
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*, sub_categories(*)")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = formData.image_url;

      // Upload image if a new file is selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `categories/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const categoryData = {
        name: formData.name,
        slug: formData.slug?.trim() || undefined,
        description: formData.description || null,
        display_order: parseInt(formData.display_order),
        image_url: imageUrl || null,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update(categoryData)
          .eq("id", editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(categoryData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: `Category ${editingCategory ? "updated" : "created"} successfully` });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Category deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const saveSubCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!currentCategoryId) {
        throw new Error("Category ID is required");
      }

      const subCategoryData = {
        name: subCategoryFormData.name,
        slug: subCategoryFormData.slug?.trim() || undefined,
        description: subCategoryFormData.description || null,
        display_order: parseInt(subCategoryFormData.display_order),
        category_id: currentCategoryId,
        featured_on_homepage: subCategoryFormData.featured_on_homepage,
      };

      if (editingSubCategory) {
        const { error } = await supabase
          .from("sub_categories")
          .update(subCategoryData)
          .eq("id", editingSubCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sub_categories").insert(subCategoryData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: `Sub-category ${editingSubCategory ? "updated" : "created"} successfully` });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsSubCategoryDialogOpen(false);
      resetSubCategoryForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteSubCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sub_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sub-category deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", slug: "", description: "", display_order: "0", image_url: "" });
    setEditingCategory(null);
    setImageFile(null);
    setImagePreview("");
  };

  const resetSubCategoryForm = () => {
    setSubCategoryFormData({ name: "", slug: "", description: "", display_order: "0", featured_on_homepage: false });
    setEditingSubCategory(null);
    setCurrentCategoryId("");
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      display_order: category.display_order?.toString() || "0",
      image_url: category.image_url || "",
    });
    setImagePreview(category.image_url || "");
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview("");
    setFormData({ ...formData, image_url: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const handleSubCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSubCategoryMutation.mutate();
  };

  const handleAddSubCategory = (categoryId: string) => {
    setCurrentCategoryId(categoryId);
    resetSubCategoryForm();
    setIsSubCategoryDialogOpen(true);
  };

  const handleEditSubCategory = (subCategory: any, categoryId: string) => {
    setCurrentCategoryId(categoryId);
    setEditingSubCategory(subCategory);
    setSubCategoryFormData({
      name: subCategory.name,
      slug: subCategory.slug,
      description: subCategory.description || "",
      display_order: subCategory.display_order?.toString() || "0",
      featured_on_homepage: subCategory.featured_on_homepage || false,
    });
    setIsSubCategoryDialogOpen(true);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Categories</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug (optional)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="category_image">Category Image</Label>
                <div className="space-y-2">
                  {imagePreview ? (
                    <div className="relative w-full h-40 border rounded-lg overflow-hidden">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={clearImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">Upload category image</p>
                    </div>
                  )}
                  <Input
                    id="category_image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer"
                  />
                </div>
              </div>
              <Button type="submit" disabled={saveMutation.isPending}>
                {editingCategory ? "Update" : "Create"} Category
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Sub-Categories</TableHead>
              <TableHead>Display Order</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories?.map((category) => (
              <>
                <TableRow key={category.id}>
                  <TableCell>
                    {category.image_url ? (
                      <img src={category.image_url} alt={category.name} className="w-16 h-16 object-cover rounded" />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                        No Image
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {category.sub_categories && category.sub_categories.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleCategory(category.id)}
                        >
                          {expandedCategories.has(category.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {category.name}
                    </div>
                  </TableCell>
                  <TableCell>{category.slug}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{category.sub_categories?.length || 0}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddSubCategory(category.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{category.display_order}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => navigate(`/admin/categories/${category.id}`)}>
                        Manage
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleEdit(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this category?")) {
                            deleteMutation.mutate(category.id);
                          }
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {expandedCategories.has(category.id) && category.sub_categories && category.sub_categories.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="bg-muted/30 p-4">
                      <div className="ml-8">
                        <h4 className="font-semibold mb-2">Sub-Categories</h4>
                        <Table>
                           <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Slug</TableHead>
                              <TableHead>Display Order</TableHead>
                              <TableHead>Featured</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {category.sub_categories.map((subCat: any) => (
                              <TableRow key={subCat.id}>
                                <TableCell>{subCat.name}</TableCell>
                                <TableCell>{subCat.slug}</TableCell>
                                <TableCell>{subCat.display_order}</TableCell>
                                <TableCell>
                                  {subCat.featured_on_homepage ? (
                                    <Badge variant="default">Featured</Badge>
                                  ) : (
                                    <Badge variant="outline">Not Featured</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => handleEditSubCategory(subCat, category.id)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      onClick={() => {
                                        if (confirm("Are you sure you want to delete this sub-category?")) {
                                          deleteSubCategoryMutation.mutate(subCat.id);
                                        }
                                      }}
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isSubCategoryDialogOpen} onOpenChange={setIsSubCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubCategory ? "Edit Sub-Category" : "Add New Sub-Category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubCategorySubmit} className="space-y-4">
            <div>
              <Label htmlFor="sub_name">Name *</Label>
              <Input
                id="sub_name"
                value={subCategoryFormData.name}
                onChange={(e) => setSubCategoryFormData({ ...subCategoryFormData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="sub_slug">Slug (optional)</Label>
              <Input
                id="sub_slug"
                value={subCategoryFormData.slug}
                onChange={(e) => setSubCategoryFormData({ ...subCategoryFormData, slug: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="sub_description">Description</Label>
              <Textarea
                id="sub_description"
                value={subCategoryFormData.description}
                onChange={(e) => setSubCategoryFormData({ ...subCategoryFormData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="sub_display_order">Display Order</Label>
              <Input
                id="sub_display_order"
                type="number"
                value={subCategoryFormData.display_order}
                onChange={(e) => setSubCategoryFormData({ ...subCategoryFormData, display_order: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="featured_on_homepage"
                checked={subCategoryFormData.featured_on_homepage}
                onCheckedChange={(checked) => 
                  setSubCategoryFormData({ ...subCategoryFormData, featured_on_homepage: checked as boolean })
                }
              />
              <Label htmlFor="featured_on_homepage" className="cursor-pointer">
                Featured on Homepage
              </Label>
            </div>
            <Button type="submit" disabled={saveSubCategoryMutation.isPending}>
              {editingSubCategory ? "Update" : "Create"} Sub-Category
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
