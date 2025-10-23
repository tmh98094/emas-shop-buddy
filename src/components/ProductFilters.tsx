import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface ProductFiltersProps {
  categories: Category[];
  selectedCategories: string[];
  selectedGoldTypes: string[];
  priceRange: [number, number];
  maxPrice: number;
  inStockOnly: boolean;
  sortBy: string;
  onCategoryChange: (categoryId: string) => void;
  onGoldTypeChange: (goldType: string) => void;
  onPriceRangeChange: (range: [number, number]) => void;
  onStockFilterChange: (checked: boolean) => void;
  onSortChange: (value: string) => void;
  onClearAll: () => void;
}

export const ProductFilters = ({
  categories,
  selectedCategories,
  selectedGoldTypes,
  priceRange,
  maxPrice,
  inStockOnly,
  sortBy,
  onCategoryChange,
  onGoldTypeChange,
  onPriceRangeChange,
  onStockFilterChange,
  onSortChange,
  onClearAll,
}: ProductFiltersProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filters</h3>
        <Button variant="ghost" size="sm" onClick={onClearAll}>
          <X className="h-4 w-4 mr-1" />
          Clear All
        </Button>
      </div>

      <Separator />

      {/* Sort By */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Sort By</Label>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="price-asc">Price: Low to High</SelectItem>
            <SelectItem value="price-desc">Price: High to Low</SelectItem>
            <SelectItem value="best-seller">Best Seller</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Categories */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Categories</Label>
        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center space-x-2">
              <Checkbox
                id={`category-${category.id}`}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => onCategoryChange(category.id)}
              />
              <label
                htmlFor={`category-${category.id}`}
                className="text-sm cursor-pointer"
              >
                {category.name}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Gold Type */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Gold Type</Label>
        <div className="space-y-2">
          {["916", "999"].map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`gold-${type}`}
                checked={selectedGoldTypes.includes(type)}
                onCheckedChange={() => onGoldTypeChange(type)}
              />
              <label htmlFor={`gold-${type}`} className="text-sm cursor-pointer">
                {type} Gold
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Price Range */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Price Range (RM)</Label>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            placeholder="Min"
            value={priceRange[0]}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              onPriceRangeChange([val, priceRange[1]]);
            }}
            className="w-24"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="number"
            placeholder="Max"
            value={priceRange[1]}
            onChange={(e) => {
              const val = parseInt(e.target.value) || maxPrice;
              onPriceRangeChange([priceRange[0], val]);
            }}
            className="w-24"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          Current: RM {priceRange[0]} - RM {priceRange[1]}
        </div>
      </div>

      <Separator />

      {/* Stock Status */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Stock Status</Label>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="in-stock"
            checked={inStockOnly}
            onCheckedChange={onStockFilterChange}
          />
          <label htmlFor="in-stock" className="text-sm cursor-pointer">
            In Stock Only
          </label>
        </div>
      </div>
    </div>
  );
};
