'use client';

import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Helper function to determine if a link is active
  const isActive = (path: string) => pathname === path;
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/admin" className="text-xl font-bold text-gray-900">
                Admin Panel
              </Link>
              <nav className="ml-6 flex space-x-4">
                <Link 
                  href="/admin" 
                  className={`text-gray-700 px-3 py-2 rounded-md font-medium ${isActive('/admin') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/admin/products" 
                  className={`text-gray-700 px-3 py-2 rounded-md font-medium ${isActive('/admin/products') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                  Products
                </Link>
                <Link 
                  href="/admin/orders" 
                  className={`text-gray-700 px-3 py-2 rounded-md font-medium ${isActive('/admin/orders') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                  Orders
                </Link>
                <Link 
                  href="/admin/users" 
                  className={`text-gray-700 px-3 py-2 rounded-md font-medium ${isActive('/admin/users') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                  Users
                </Link>
              </nav>
            </div>
            <div className="flex items-center">
              <SignedIn>
                <UserButton />
              </SignedIn>
              <SignedOut>
                <SignInButton>
                  <Button variant="outline">Sign In</Button>
                </SignInButton>
              </SignedOut>
            </div>
          </div>
        </div>
      </header>

      <main>
        {children}
      </main>
    </div>
  );
}