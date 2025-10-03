import { pgTable, pgEnum, uuid, varchar, text, decimal, boolean, timestamp, integer } from 'drizzle-orm/pg-core';

// Define enums for status fields
export const userRoleEnum = pgEnum('user_role', ['superadmin', 'admin']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'failed']);

// Products table - stores all menu items available in the restaurant
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  imageUrl: text('image_url').notNull(),
  isAvailable: boolean('is_available').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Orders table - stores customer order information for guest checkouts
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum('status').notNull(),
  xenditInvoiceId: varchar('xendit_invoice_id', { length: 255 }).unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Order Items table - junction table to link products with specific orders
export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  quantity: integer('quantity').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(), // Price of the product at the time of the order
});

// User Roles table - stores admin and superadmin roles linked to Clerk's user ID
export const userRoles = pgTable('user_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: varchar('clerk_user_id', { length: 255 }).notNull().unique(),
  role: userRoleEnum('role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Create indexes for foreign keys to improve query performance
export const orderItemsOrderIdIdx = orderItems.orderId;
export const orderItemsProductIdIdx = orderItems.productId;