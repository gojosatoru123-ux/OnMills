import { z } from "zod";
export const projectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be 100 characters or less"),
  key: z
    .string()
    .min(2, "Project key must be at least 2 characters")
    .max(10, "Project key must be 10 characters or less")
    .toUpperCase(),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional(),
});

export const sprintSchema = z.object({
  name: z.string().min(1, "Sprint name is required"),
  startDate: z.date(),
  endDate: z.date(),
  isLongSprint: z.boolean(),
});

export const issueSchema = z.object({
  title: z.uuid("Please select item"),
  assigneeId: z.uuid("Please select assignee"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  quantity: z.number("Please set quantity").gte(1,"Minimum quantity should be 1"),
});

export const itemSchema = z.object({
  name: z.string().trim().min(3,"Item title must be at least 3 characters").toUpperCase(),
  reorderValue: z.number("Must be a number").gte(0,"Reorder value cannot be negative"),
  itemUnit: z.enum(["PIECES", "UNITS", "SETS" , "PACKETS", "KILOGRAM","GRAM","TONNE","LITRES", "METERS", "FEET", "INCHES", "SQUARE_METERS", "CUBIC_METERS"]),
  usingQuantity: z.number("Must be a number").gt(0,"Value cannot be negative or zero"),
  usingUnit: z.enum(["PIECES", "UNITS", "SETS" , "PACKETS", "KILOGRAM","GRAM","TONNE","LITRES", "METERS", "FEET", "INCHES", "SQUARE_METERS", "CUBIC_METERS"]),
})

export const statusSchema = z.object({
  name: z.string().trim().min(3,"Item title must be at least 3 characters").toUpperCase(),
  order: z.number("Must be a number").gte(3,"Order must be at least 3").lte(100,"Order cannot be more than 100"),
})