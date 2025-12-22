import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class CategoryType {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  slug: string;

  @Field(() => String, { nullable: true })
  description: string | null;

  @Field(() => ID, { nullable: true })
  parentId: string | null;

  @Field(() => String, { nullable: true })
  image: string | null;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Int)
  sortOrder: number;

  @Field(() => String, { nullable: true })
  metaTitle: string | null;

  @Field(() => String, { nullable: true })
  metaDescription: string | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Date, { nullable: true })
  deletedAt: Date | null;

  @Field(() => CategoryType, { nullable: true })
  parent: CategoryType | null;

  @Field(() => [CategoryType], { nullable: true })
  children?: CategoryType[];
}

@ObjectType()
export class CategoriesPaginatedResponse {
  @Field(() => [CategoryType])
  data: CategoryType[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;
}

