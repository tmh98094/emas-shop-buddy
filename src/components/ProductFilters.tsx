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
  excludePreOrder: boolean;
  excludeOutOfStock: boolean;
  sortBy: string;
  onCategoryChange: (categoryId: string) => void;
  onGoldTypeChange: (goldType: string) => void;
  onPriceRangeChange: (range: [number, number]) => void;
  onStockFilterChange: (checked: boolean) => void;
  onPreOrderFilterChange: (checked: boolean) => void;
  onOutOfStockFilterChange: (checked: boolean) => void;
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
  excludePreOrder,
  excludeOutOfStock,
  sortBy,
  onCategoryChange,
  onGoldTypeChange,
  onPriceRangeChange,
  onStockFilterChange,
  onPreOrderFilterChange,
  onOutOfStockFilterChange,
  onSortChange,
  onClearAll,
}: ProductFiltersProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">筛选</h3>
        <Button variant="ghost" size="sm" onClick={onClearAll}>
          <X className="h-4 w-4 mr-1" />
          清除全部
        </Button>
      </div>

      <Separator />

      {/* Sort By */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">排序方式</Label>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger>
            <SelectValue placeholder="选择排序" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">最新上架</SelectItem>
            <SelectItem value="price-asc">价格：低到高</SelectItem>
            <SelectItem value="price-desc">价格：高到低</SelectItem>
            <SelectItem value="best-seller">畅销商品</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Categories */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">分类</Label>
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
        <Label className="text-sm font-semibold">黄金类型</Label>
        <div className="space-y-2">
          {["916", "999"].map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`gold-${type}`}
                checked={selectedGoldTypes.includes(type)}
                onCheckedChange={() => onGoldTypeChange(type)}
              />
              <label htmlFor={`gold-${type}`} className="text-sm cursor-pointer">
                {type} 黄金
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Price Range */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">价格区间 (RM)</Label>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            placeholder="最小"
            value={priceRange[0]}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              onPriceRangeChange([val, priceRange[1]]);
            }}
            className="w-24"
          />
          <span className="text-muted-foreground">至</span>
          <Input
            type="number"
            placeholder="最大"
            value={priceRange[1]}
            onChange={(e) => {
              const val = parseInt(e.target.value) || maxPrice;
              onPriceRangeChange([priceRange[0], val]);
            }}
            className="w-24"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          当前：RM {priceRange[0]} - RM {priceRange[1]}
        </div>
      </div>

      <Separator />

      {/* Stock Status */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">库存状态</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="in-stock"
              checked={inStockOnly}
              onCheckedChange={onStockFilterChange}
            />
            <label htmlFor="in-stock" className="text-sm cursor-pointer">
              仅显示有货
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="exclude-preorder"
              checked={excludePreOrder}
              onCheckedChange={onPreOrderFilterChange}
            />
            <label htmlFor="exclude-preorder" className="text-sm cursor-pointer">
              排除预购商品
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="exclude-out-of-stock"
              checked={excludeOutOfStock}
              onCheckedChange={onOutOfStockFilterChange}
            />
            <label htmlFor="exclude-out-of-stock" className="text-sm cursor-pointer">
              排除缺货商品
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
