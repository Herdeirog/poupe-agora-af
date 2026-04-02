import { Tag } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Category {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
}

interface CategoryFilterSelectProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

export function CategoryFilterSelect({ 
  categories, 
  selectedCategoryId, 
  onCategoryChange 
}: CategoryFilterSelectProps) {
  return (
    <Select
      value={selectedCategoryId || 'all'}
      onValueChange={(value) => onCategoryChange(value === 'all' ? null : value)}
    >
      <SelectTrigger className="w-full sm:w-[220px]">
        <SelectValue placeholder="Todas as categorias" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span>Todas as categorias</span>
          </div>
        </SelectItem>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: category.color || '#6b7280' }}
              />
              <span>{category.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
