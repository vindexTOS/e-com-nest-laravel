import { Category } from '../../entities/category.entity';

export interface ICategoriesService {
  findAll(filters: {
    page?: number;
    limit?: number;
    search?: string;
    parentId?: string;
    isActive?: boolean;
    withDeleted?: boolean;
  }): Promise<{
    data: Category[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  findOne(id: string): Promise<Category>;
  findByParentId(parentId: string | null): Promise<Category[]>;
  getCategoryTree(): Promise<Category[]>;
}

