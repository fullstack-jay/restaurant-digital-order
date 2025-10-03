Full-Stack Restaurant App: Project Plan
This document outlines the architecture, features, application flow, and database schema for a modern, full-stack restaurant application. It features a guest checkout process for customers and a secure, multi-level admin panel (superadmin and admin) using Clerk.

1. Core Features (MVP)
Public Side (Guest Users)
Product Landing Page: A clean, responsive grid or list view of all available food and drinks, fetched directly from the Supabase database. Each product card displays an image, name, short description, and price.

Shopping Cart: A client-side cart (using React Context, Zustand, or local storage) that shows selected items, quantities, and the subtotal. Users can update quantities or remove items.

Guest Checkout: A simple checkout page where users review their order and enter their name. No login is required for customers.

Xendit Payment Integration: Seamless integration with the Xendit sandbox environment.

Order Confirmation: After a successful payment, the user is redirected to a confirmation page. The order status is verified via a secure webhook from Xendit.

Admin Panel (Protected by Clerk)
Secure Role-Based Authentication: The admin panel is protected by Clerk. Access is restricted based on user roles.

Super Admin Role (Single Account):

The first user to sign up via the Clerk login page is automatically designated as the superadmin.

Has full access to all admin features.

Admin Management: Can invite and manage admin user accounts from a dedicated dashboard.

Admin Role (Multiple Accounts):

Can only be created via an invitation from the superadmin.

Product Management: Can access the dashboard to upload new product photos.

Automated Product Creation:

The backend uses the OpenAI Vision API to analyze uploaded images, extracting the product name, a short description, and the price.

This information is used to automatically create and save a new product in the Supabase database.

The new product instantly appears on the public-facing menu.

2. Technology Stack & Architecture
Framework: Next.js (App Router)

Styling: Tailwind CSS

UI Components: Shadcn/ui

Database: Supabase (PostgreSQL)

ORM: Drizzle ORM

Admin Authentication: Clerk

AI Framework: OpenAI API (gpt-4-vision-preview model)

Workflow Automation: n8n

Payment Gateway: Xendit (Sandbox)

Builder Tools: v0.dev can be used to rapidly prototype UI components.

3. Application Flow
A. Customer Order Flow (Guest Checkout)
This flow remains unchanged.

Browse & Add to Cart: A user visits the site, browses the menu, and adds items to their client-side shopping cart.

Checkout: The user enters their name on the checkout page.

Initiate Payment: The app sends the cart details to a Next.js API route (/api/checkout), which generates a Xendit invoice and returns the payment URL.

Payment: The user is redirected to Xendit to complete the payment.

Confirmation: Xendit sends a webhook to /api/webhooks/xendit. The app verifies the payment, updates the order status in the database to paid, and redirects the user to a success page.

B. Admin & Super Admin Authentication Flow
First User Sign-Up (Super Admin Creation):

The first person ever to sign in with Gmail via the Clerk component becomes the superadmin.

Clerk triggers a user.created webhook, which is sent to a Next.js API route (/api/webhooks/clerk).

This API route checks the user_roles table in Supabase. If the table is empty, it adds the new user's Clerk ID with the role superadmin.

It also uses the Clerk Backend SDK to set the user's publicMetadata to { role: 'superadmin' }.

Super Admin Invites New Admin:

The logged-in superadmin navigates to the admin management page.

They use a form to invite a new admin by email.

This action calls a protected API route (/api/admin/invite) which uses the Clerk SDK to create and send an invitation.

New Admin Onboarding:

The invited user receives an email and clicks the link to sign up with their Gmail account.

The user.created webhook is triggered again.

This time, the webhook handler sees the user_roles table is not empty. It proceeds to add the new user with the admin role and updates their Clerk publicMetadata accordingly.

C. Admin Product Upload Flow
This flow is accessible to both admin and superadmin roles.

Login & Upload: An authenticated admin/superadmin uploads a product image on the /admin/products page.

Trigger n8n Workflow: The image is sent to a protected API route that uploads it to Supabase Storage, then triggers an n8n webhook with the public image URL.

n8n Automation: The n8n workflow receives the URL, sends it to the OpenAI Vision API for analysis, parses the JSON response (name, description, price), and inserts the new product data into the Supabase products table.

Menu Update: The public menu page reflects the new item on the next page load or revalidation.

4. Database Schema (Drizzle & PostgreSQL)
products, orders, order_items tables
These three tables remain unchanged from the previous version, as they are not directly related to admin users.

user_roles table
New table to store user roles, linked to Clerk user IDs.
```sql
-- Enable the pgcrypto extension to use gen_random_uuid() for generating UUIDs.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: products
-- Stores all menu items available in the restaurant.
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE "products" IS 'Stores all available menu items.';

-- Table: orders
-- Stores customer order information for guest checkouts.
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'paid', 'failed')),
    xendit_invoice_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE "orders" IS 'Contains guest customer orders and payment status.';

-- Table: order_items
-- A junction table to link products with specific orders.
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL -- Price of the product at the time of the order
);

COMMENT ON TABLE "order_items" IS 'Details of each product within a customer order.';

-- Create indexes for foreign keys to improve query performance.
CREATE INDEX ON order_items (order_id);
CREATE INDEX ON order_items (product_id);

-- Table: user_roles
-- Stores admin and superadmin roles, linked to Clerk's user ID.
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('superadmin', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE "user_roles" IS 'Stores user roles linked to Clerk user IDs for the admin panel.';

```