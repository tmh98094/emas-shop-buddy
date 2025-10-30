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
import { Loader2, Upload, X, Plus } from "lucide-react";
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
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [enableVariants, setEnableVariants] = useState(false);
  const [variantGroups, setVariantGroups] = useState<Array<{ name: string; values: string; price_adjustment: string; stock_adjustment: string }>>([]);
  const [existingVariants, setExistingVariants] = useState<any[]>([]);

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
          product_images (*),
          product_variants (*)
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
      
      if (product.product_variants && product.product_variants.length > 0) {
        setEnableVariants(true);
        setExistingVariants(product.product_variants);
      }
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

      // Handle variants
      if (enableVariants) {
        // Delete removed existing variants
        const existingVariantIds = existingVariants.map(v => v.id);
        const keptVariantIds = existingVariants.filter(v => v.id).map(v => v.id);
        const deletedVariantIds = existingVariantIds.filter(id => !keptVariantIds.includes(id));
        
        for (const variantId of deletedVariantIds) {
          await supabase.from("product_variants").delete().eq("id", variantId);
        }
        
        // Update existing variants
        for (const variant of existingVariants) {
          if (variant.id) {
            await supabase.from("product_variants").update({
              name: variant.name,
              value: variant.value,
              price_adjustment: parseFloat(variant.price_adjustment || "0"),
              stock_adjustment: parseInt(variant.stock_adjustment || "0"),
            }).eq("id", variant.id);
          }
        }
        
        // Insert new variant groups (each group can have multiple values)
        for (const group of variantGroups) {
          // Split comma-separated values
          const values = group.values.split(',').map(v => v.trim()).filter(v => v);
          
          for (const value of values) {
            await supabase.from("product_variants").insert({
              product_id: productId,
              name: group.name,
              value: value,
              price_adjustment: parseFloat(group.price_adjustment || "0"),
              stock_adjustment: parseInt(group.stock_adjustment || "0"),
            });
          }
        }
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
    if (saveMutation.isPending) return;
    saveMutation.mutate();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const filesArray = Array.from(files);
      setPendingImages(filesArray);
      setCurrentImageIndex(0);
      
      // Start with first image
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
        setCropperOpen(true);
      };
      reader.readAsDataURL(filesArray[0]);
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' });
    setImages([...images, croppedFile]);
    
    // Check if there are more images to process
    const nextIndex = currentImageIndex + 1;
    if (nextIndex < pendingImages.length) {
      setCurrentImageIndex(nextIndex);
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
        setCropperOpen(true);
      };
      reader.readAsDataURL(pendingImages[nextIndex]);
    } else {
      // No more images, clear pending
      setPendingImages([]);
      setCurrentImageIndex(0);
    }
  };

  const setExistingThumbnail = async (imageId: string) => {
    setThumbnailId(imageId);
  };

  const removeImage = async (imageId: string) => {
    await supabase.from("product_images").delete().eq("id", imageId);
    setExistingImages(existingImages.filter((img) => img.id !== imageId));
  };

  const addVariantGroup = () => {
    setVariantGroups([...variantGroups, { name: "", values: "", price_adjustment: "0", stock_adjustment: "0" }]);
  };

  const updateVariantGroup = (index: number, field: string, value: string) => {
    const updated = [...variantGroups];
    updated[index] = { ...updated[index], [field]: value };
    setVariantGroups(updated);
  };

  const removeVariantGroup = (index: number) => {
    setVariantGroups(variantGroups.filter((_, i) => i !== index));
  };

  const updateExistingVariant = (index: number, field: string, value: string) => {
    const updated = [...existingVariants];
    updated[index] = { ...updated[index], [field]: value };
    setExistingVariants(updated);
  };

  const removeExistingVariant = (index: number) => {
    setExistingVariants(existingVariants.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="p-2 md:p-6 lg:p-8">
      <h1 className="text-xl md:text-2xl font-bold mb-4">{isEdit ? "Edit Product" : "Add New Product"}</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-3">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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

          <div className="mt-3 md:mt-4">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-3 md:mt-4">
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

        <Card className="p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-3">Pricing & Stock</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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

          <div className="flex flex-wrap gap-3 md:gap-4 mt-3 md:mt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked as boolean })}
              />
              <Label htmlFor="featured" className="text-sm">精选</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="bestseller"
                checked={formData.is_best_seller}
                onCheckedChange={(checked) => setFormData({ ...formData, is_best_seller: checked as boolean })}
              />
              <Label htmlFor="bestseller" className="text-sm">畅销</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="newarrival"
                checked={formData.is_new_arrival}
                onCheckedChange={(checked) => setFormData({ ...formData, is_new_arrival: checked as boolean })}
              />
              <Label htmlFor="newarrival" className="text-sm">新品</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="preorder"
                checked={formData.is_preorder}
                onCheckedChange={(checked) => setFormData({ ...formData, is_preorder: checked as boolean })}
              />
              <Label htmlFor="preorder" className="text-sm">预订</Label>
            </div>
          </div>

          {formData.is_preorder && (
            <div className="mt-3 md:mt-4">
              <Label htmlFor="preorder_deposit">预订定金 (RM)</Label>
              <Input
                id="preorder_deposit"
                type="number"
                step="0.01"
                value={formData.preorder_deposit}
                onChange={(e) => setFormData({ ...formData, preorder_deposit: e.target.value })}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">预订商品客户需支付的定金金额</p>
            </div>
          )}
        </Card>

        <Card className="p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-3">Media</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
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
                <div className="border-2 border-dashed rounded p-4 md:p-8 text-center hover:border-primary transition-colors">
                  <Upload className="mx-auto h-8 md:h-12 w-8 md:w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm md:text-base font-medium">Click to upload and crop images (1:1 ratio)</p>
                  <p className="text-xs text-muted-foreground mt-1">Select multiple images - you can adjust crop for each</p>
                </div>
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </Label>
            </div>

            <div>
              <Label htmlFor="videos" className="cursor-pointer">
                <div className="border-2 border-dashed rounded p-4 md:p-8 text-center hover:border-primary">
                  <Upload className="mx-auto h-8 md:h-12 w-8 md:w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm md:text-base">Click to upload videos</p>
                </div>
                <Input
                  id="videos"
                  type="file"
                  multiple
                  accept="video/mp4,video/webm,video/ogg,video/quicktime"
                  className="hidden"
                  onChange={(e) => setVideos(Array.from(e.target.files || []))}
                />
              </Label>
              {videos.length > 0 && <p className="mt-2 text-sm">{videos.length} new video(s) selected</p>}
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-3">Product Variants (Optional)</h2>
          
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              id="enable_variants"
              checked={enableVariants}
              onCheckedChange={(checked) => setEnableVariants(checked as boolean)}
            />
            <Label htmlFor="enable_variants" className="text-sm">Enable Variants (e.g., sizes, zodiacs, colors)</Label>
          </div>

          {enableVariants && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add variant groups with multiple values. For example: Variant Name: "Size", Values: "1cm, 5cm, 8cm, 10cm" (comma-separated).
              </p>

              {existingVariants.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Existing Variants (Edit individually)</h3>
                  {existingVariants.map((variant, index) => (
                    <div key={variant.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 border rounded-lg">
                      <div>
                        <Label className="text-xs">Variant Name</Label>
                        <Input
                          placeholder="e.g., Zodiac, Size"
                          value={variant.name}
                          onChange={(e) => updateExistingVariant(index, "name", e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Value</Label>
                        <Input
                          placeholder="e.g., Aries, 5cm"
                          value={variant.value}
                          onChange={(e) => updateExistingVariant(index, "value", e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Price Adj. (RM)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={variant.price_adjustment}
                          onChange={(e) => updateExistingVariant(index, "price_adjustment", e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Stock Adj.</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="0"
                            value={variant.stock_adjustment}
                            onChange={(e) => updateExistingVariant(index, "stock_adjustment", e.target.value)}
                            className="text-sm"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => removeExistingVariant(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {variantGroups.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">New Variant Groups</h3>
                  {variantGroups.map((group, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 border rounded-lg bg-muted/50">
                      <div>
                        <Label className="text-xs">Variant Name</Label>
                        <Input
                          placeholder="e.g., Size, Zodiac"
                          value={group.name}
                          onChange={(e) => updateVariantGroup(index, "name", e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Values (comma-separated)</Label>
                        <Input
                          placeholder="e.g., 1cm, 5cm, 8cm, 10cm"
                          value={group.values}
                          onChange={(e) => updateVariantGroup(index, "values", e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Price Adj. (RM)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={group.price_adjustment}
                          onChange={(e) => updateVariantGroup(index, "price_adjustment", e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Stock Adj.</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="0"
                            value={group.stock_adjustment}
                            onChange={(e) => updateVariantGroup(index, "stock_adjustment", e.target.value)}
                            className="text-sm"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => removeVariantGroup(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button type="button" variant="outline" onClick={addVariantGroup}>
                <Plus className="mr-2 h-4 w-4" />
                Add Variant Group
              </Button>
            </div>
          )}
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="submit" disabled={saveMutation.isPending} className="w-full sm:w-auto">
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Update Product" : "Create Product"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/admin/products")} className="w-full sm:w-auto">
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
          setPendingImages([]);
          setCurrentImageIndex(0);
        }}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
