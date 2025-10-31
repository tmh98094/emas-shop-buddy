import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Trash, Upload, X, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export default function CategoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    slug: "",
    description: "",
    display_order: "0",
    image_url: "",
  });
  const [categoryImageFile, setCategoryImageFile] = useState<File | null>(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState<string>("");
  
  const [isSubCategoryDialogOpen, setIsSubCategoryDialogOpen] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<any>(null);
  const [subCategoryFormData, setSubCategoryFormData] = useState({
    name: "",
    slug: "",
    description: "",
    display_order: "0",
    featured_on_homepage: false,
    image_url: "",
  });
  const [subCategoryImageFile, setSubCategoryImageFile] = useState<File | null>(null);
  const [subCategoryImagePreview, setSubCategoryImagePreview] = useState<string>("");

  // Fetch category data
  const { data: category, isLoading } = useQuery({
    queryKey: ["category", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*, sub_categories(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Load category data
  useEffect(() => {
    if (category) {
      setCategoryFormData({
        name: category.name,
        slug: category.slug || "",
        description: category.description || "",
        display_order: category.display_order?.toString() || "0",
        image_url: category.image_url || "",
      });
      setCategoryImagePreview(category.image_url || "");
    }
  }, [category]);

  const updateCategoryMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = categoryFormData.image_url;

      if (categoryImageFile) {
        const fileExt = categoryImageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `categories/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, categoryImageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from("categories")
        .update({
          name: categoryFormData.name,
          slug: categoryFormData.slug?.trim() || undefined,
          description: categoryFormData.description || null,
          display_order: parseInt(categoryFormData.display_order),
          image_url: imageUrl || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Category updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["category", id] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setCategoryImageFile(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const saveSubCategoryMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = subCategoryFormData.image_url;

      if (subCategoryImageFile) {
        const fileExt = subCategoryImageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `sub-categories/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, subCategoryImageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const subCategoryData = {
        name: subCategoryFormData.name,
        slug: subCategoryFormData.slug?.trim() || undefined,
        description: subCategoryFormData.description || null,
        display_order: parseInt(subCategoryFormData.display_order),
        category_id: id,
        featured_on_homepage: subCategoryFormData.featured_on_homepage,
        image_url: imageUrl || null,
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
      queryClient.invalidateQueries({ queryKey: ["category", id] });
      setIsSubCategoryDialogOpen(false);
      resetSubCategoryForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteSubCategoryMutation = useMutation({
    mutationFn: async (subCatId: string) => {
      const { error } = await supabase.from("sub_categories").delete().eq("id", subCatId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sub-category deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["category", id] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetSubCategoryForm = () => {
    setSubCategoryFormData({
      name: "",
      slug: "",
      description: "",
      display_order: "0",
      featured_on_homepage: false,
      image_url: "",
    });
    setEditingSubCategory(null);
    setSubCategoryImageFile(null);
    setSubCategoryImagePreview("");
  };

  const handleCategoryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCategoryImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCategoryImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubCategoryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSubCategoryImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setSubCategoryImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleEditSubCategory = (subCategory: any) => {
    setEditingSubCategory(subCategory);
    setSubCategoryFormData({
      name: subCategory.name,
      slug: subCategory.slug || "",
      description: subCategory.description || "",
      display_order: subCategory.display_order?.toString() || "0",
      featured_on_homepage: subCategory.featured_on_homepage || false,
      image_url: subCategory.image_url || "",
    });
    setSubCategoryImagePreview(subCategory.image_url || "");
    setSubCategoryImageFile(null);
    setIsSubCategoryDialogOpen(true);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <Button variant="ghost" onClick={() => navigate("/admin/categories")} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Categories
      </Button>

      <h1 className="text-3xl font-bold mb-6">Manage Category</h1>

      {/* Category Form */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Category Details</h2>
        <form onSubmit={(e) => { e.preventDefault(); updateCategoryMutation.mutate(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug (optional, auto-generated)</Label>
              <Input
                id="slug"
                value={categoryFormData.slug}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, slug: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={categoryFormData.description}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="display_order">Display Order</Label>
            <Input
              id="display_order"
              type="number"
              value={categoryFormData.display_order}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, display_order: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="category_image">Category Image</Label>
            <div className="space-y-2">
              {categoryImagePreview ? (
                <div className="relative w-full h-40 border rounded-lg overflow-hidden">
                  <img src={categoryImagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setCategoryImageFile(null);
                      setCategoryImagePreview("");
                      setCategoryFormData({ ...categoryFormData, image_url: "" });
                    }}
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
                onChange={handleCategoryImageChange}
                className="cursor-pointer"
              />
            </div>
          </div>

          <Button type="submit" disabled={updateCategoryMutation.isPending}>
            Update Category
          </Button>
        </form>
      </Card>

      {/* Sub-Categories Section */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Sub-Categories</h2>
          <Button onClick={() => { resetSubCategoryForm(); setIsSubCategoryDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Sub-Category
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Display Order</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {category?.sub_categories && category.sub_categories.length > 0 ? (
              category.sub_categories.map((subCat: any) => (
                <TableRow key={subCat.id}>
                  <TableCell>
                    {subCat.image_url ? (
                      <img src={subCat.image_url} alt={subCat.name} className="w-16 h-16 object-cover rounded" />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                        No Image
                      </div>
                    )}
                  </TableCell>
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
                      <Button variant="outline" size="icon" onClick={() => handleEditSubCategory(subCat)}>
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
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No sub-categories yet. Click "Add Sub-Category" to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Sub-Category Dialog */}
      <Dialog open={isSubCategoryDialogOpen} onOpenChange={setIsSubCategoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSubCategory ? "Edit Sub-Category" : "Add New Sub-Category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveSubCategoryMutation.mutate(); }} className="space-y-4">
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
              <Label htmlFor="sub_slug">Slug (optional, auto-generated)</Label>
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
            <div>
              <Label htmlFor="sub_image">Sub-Category Image</Label>
              <div className="space-y-2">
                {subCategoryImagePreview ? (
                  <div className="relative w-full h-40 border rounded-lg overflow-hidden">
                    <img src={subCategoryImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setSubCategoryImageFile(null);
                        setSubCategoryImagePreview("");
                        setSubCategoryFormData({ ...subCategoryFormData, image_url: "" });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Upload sub-category image</p>
                  </div>
                )}
                <Input
                  id="sub_image"
                  type="file"
                  accept="image/*"
                  onChange={handleSubCategoryImageChange}
                  className="cursor-pointer"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="featured"
                checked={subCategoryFormData.featured_on_homepage}
                onCheckedChange={(checked) =>
                  setSubCategoryFormData({ ...subCategoryFormData, featured_on_homepage: checked as boolean })
                }
              />
              <Label htmlFor="featured" className="cursor-pointer">Featured on Homepage</Label>
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
