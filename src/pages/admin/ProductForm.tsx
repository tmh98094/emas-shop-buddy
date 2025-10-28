import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageCropper } from "@/components/ImageCropper";

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    slug: "",
    gold_type: "916" as "916" | "999",
    weight_grams: "",
    labour_fee: "",
    stock: "",
    category_id: "",
    sub_category_id: "",
    is_featured: false,
    is_best_seller: false,
    is_new_arrival: false,
    is_preorder: false,
    preorder_deposit: "100.00",
  });

  const [images, setImages] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [thumbnailId, setThumbnailId] = useState<string>("");
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>("");

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch sub-categories based on selected category
  const { data: subCategories } = useQuery({
    queryKey: ["subCategories", formData.category_id],
    queryFn: async () => {
      if (!formData.category_id) return [];
      const { data, error } = await supabase
        .from("sub_categories")
        .select("*")
        .eq("category_id", formData.category_id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!formData.category_id,
  });

  // Fetch product data if editing
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          product_images (*)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  // Populate form when editing
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        description: product.description || "",
        slug: product.slug || "",
        gold_type: product.gold_type,
        weight_grams: product.weight_grams?.toString() || "",
        labour_fee: product.labour_fee?.toString() || "",
        stock: product.stock?.toString() || "",
        category_id: product.category_id || "",
        sub_category_id: product.sub_category_id || "",
        is_featured: product.is_featured || false,
        is_best_seller: product.is_best_seller || false,
        is_new_arrival: product.is_new_arrival || false,
        is_preorder: product.is_preorder || false,
        preorder_deposit: product.preorder_deposit?.toString() || "100.00",
      });
      setExistingImages(product.product_images || []);
      const thumbnail = product.product_images?.find((img: any) => img.is_thumbnail);
      if (thumbnail) setThumbnailId(thumbnail.id);
    }
  }, [product]);

  // Save product mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const productData = {
        name: formData.name,
        description: formData.description,
        slug: formData.slug || undefined,
        gold_type: formData.gold_type,
        weight_grams: parseFloat(formData.weight_grams),
        labour_fee: parseFloat(formData.labour_fee),
        stock: parseInt(formData.stock),
        category_id: formData.category_id || null,
        sub_category_id: formData.sub_category_id || null,
        is_featured: formData.is_featured,
        is_best_seller: formData.is_best_seller,
        is_new_arrival: formData.is_new_arrival,
        is_preorder: formData.is_preorder,
        preorder_deposit: formData.is_preorder ? parseFloat(formData.preorder_deposit) : null,
      };

      let productId = id;

      if (isEdit) {
        const { error } = await supabase.from("products").update(productData).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(productData).select().single();
        if (error) throw error;
        productId = data.id;
      }

      // Update thumbnail status
      if (thumbnailId) {
        await supabase.from("product_images").update({ is_thumbnail: false }).eq("product_id", productId);
        await supabase.from("product_images").update({ is_thumbnail: true }).eq("id", thumbnailId);
      }

      // Upload images (already cropped to 1:1)
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${productId}/${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        await supabase.from("product_images").insert({
          product_id: productId,
          image_url: publicUrl,
          media_type: 'image',
          display_order: existingImages.length + i,
          is_thumbnail: existingImages.length === 0 && i === 0 && !thumbnailId,
        });
      }

      // Upload videos
      for (let i = 0; i < videos.length; i++) {
        const file = videos[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${productId}/${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        await supabase.from("product_images").insert({
          product_id: productId,
          image_url: publicUrl,
          media_type: 'video',
          display_order: existingImages.length + images.length + i,
        });
      }
    },
    onSuccess: () => {
      toast({ title: `Product ${isEdit ? "updated" : "created"} successfully` });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate("/admin/products");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' });
    setImages([...images, croppedFile]);
  };

  const setExistingThumbnail = async (imageId: string) => {
    setThumbnailId(imageId);
  };

  const removeImage = async (imageId: string) => {
    await supabase.from("product_images").delete().eq("id", imageId);
    setExistingImages(existingImages.filter((img) => img.id !== imageId));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">{isEdit ? "Edit Product" : "Add New Product"}</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="slug">Slug (leave empty to auto-generate)</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="category">分类</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value, sub_category_id: "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sub_category">子分类</Label>
              <Select value={formData.sub_category_id} onValueChange={(value) => setFormData({ ...formData, sub_category_id: value })} disabled={!formData.category_id}>
                <SelectTrigger>
                  <SelectValue placeholder="选择子分类" />
                </SelectTrigger>
                <SelectContent>
                  {subCategories?.map((subCat) => (
                    <SelectItem key={subCat.id} value={subCat.id}>{subCat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Pricing & Stock</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gold_type">Gold Type *</Label>
              <Select value={formData.gold_type} onValueChange={(value: "916" | "999") => setFormData({ ...formData, gold_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="916">916 (22K)</SelectItem>
                  <SelectItem value="999">999 (24K)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="weight">Weight (grams) *</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                value={formData.weight_grams}
                onChange={(e) => setFormData({ ...formData, weight_grams: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="labour">Labour Fee (RM) *</Label>
              <Input
                id="labour"
                type="number"
                step="0.01"
                value={formData.labour_fee}
                onChange={(e) => setFormData({ ...formData, labour_fee: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="stock">Stock *</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex gap-4 mt-4 flex-wrap">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked as boolean })}
              />
              <Label htmlFor="featured">精选</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="bestseller"
                checked={formData.is_best_seller}
                onCheckedChange={(checked) => setFormData({ ...formData, is_best_seller: checked as boolean })}
              />
              <Label htmlFor="bestseller">畅销</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="newarrival"
                checked={formData.is_new_arrival}
                onCheckedChange={(checked) => setFormData({ ...formData, is_new_arrival: checked as boolean })}
              />
              <Label htmlFor="newarrival">新品</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="preorder"
                checked={formData.is_preorder}
                onCheckedChange={(checked) => setFormData({ ...formData, is_preorder: checked as boolean })}
              />
              <Label htmlFor="preorder">预订</Label>
            </div>
          </div>

          {formData.is_preorder && (
            <div className="mt-4">
              <Label htmlFor="preorder_deposit">预订定金 (RM)</Label>
              <Input
                id="preorder_deposit"
                type="number"
                step="0.01"
                value={formData.preorder_deposit}
                onChange={(e) => setFormData({ ...formData, preorder_deposit: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">预订商品客户需支付的定金金额</p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Media</h2>
          
          <div className="grid grid-cols-4 gap-4 mb-4">
            {existingImages.map((img) => (
              <div key={img.id} className="relative border rounded-lg p-2 bg-card">
                {img.media_type === 'video' ? (
                  <video src={img.image_url} className="w-full h-32 object-cover rounded" controls />
                ) : (
                  <img src={img.image_url} alt="" className="w-full h-32 object-cover rounded" loading="lazy" />
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Checkbox
                    id={`thumb-${img.id}`}
                    checked={thumbnailId === img.id}
                    onCheckedChange={(checked) => {
                      if (checked) setExistingThumbnail(img.id);
                    }}
                  />
                  <Label htmlFor={`thumb-${img.id}`} className="text-xs cursor-pointer">
                    {thumbnailId === img.id ? '⭐ Thumbnail' : 'Set as Thumbnail'}
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => removeImage(img.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {/* Preview new images before upload */}
            {images.map((img, idx) => (
              <div key={`new-${idx}`} className="relative border rounded-lg p-2 bg-muted">
                <img 
                  src={URL.createObjectURL(img)} 
                  alt="Preview" 
                  className="w-full h-32 object-cover rounded" 
                />
                <div className="flex items-center gap-2 mt-2">
                  <Checkbox
                    id={`new-thumb-${idx}`}
                    checked={existingImages.length === 0 && idx === 0}
                    disabled
                  />
                  <Label className="text-xs text-muted-foreground">
                    {existingImages.length === 0 && idx === 0 ? 'Will be thumbnail' : 'New image'}
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => setImages(images.filter((_, i) => i !== idx))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="images" className="cursor-pointer">
                <div className="border-2 border-dashed rounded p-8 text-center hover:border-primary transition-colors">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 font-medium">Click to upload and crop images (1:1 ratio)</p>
                  <p className="text-xs text-muted-foreground mt-1">Images will be automatically cropped to square format</p>
                </div>
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </Label>
            </div>

            <div>
              <Label htmlFor="videos" className="cursor-pointer">
                <div className="border-2 border-dashed rounded p-8 text-center hover:border-primary">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2">Click to upload videos</p>
                </div>
                <Input
                  id="videos"
                  type="file"
                  multiple
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => setVideos(Array.from(e.target.files || []))}
                />
              </Label>
              {videos.length > 0 && <p className="mt-2">{videos.length} new video(s) selected</p>}
            </div>
          </div>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Update Product" : "Create Product"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/admin/products")}>
            Cancel
          </Button>
        </div>
      </form>

      <ImageCropper
        image={imageToCrop}
        open={cropperOpen}
        onClose={() => {
          setCropperOpen(false);
          setImageToCrop("");
        }}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
