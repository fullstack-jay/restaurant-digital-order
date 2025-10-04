'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function AdminDashboard() {
  const { user, isLoaded } = useUser();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user && isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase!
            .from('user_roles')
            .select('role')
            .eq('clerk_user_id', user.id)
            .single();

          if (error) {
            console.error('Error fetching user role:', error);
            // Don't set user role if there's an error to avoid incorrect access
            setUserRole(null);
          } else {
            setUserRole(data?.role || null);
          }
        } catch (err) {
          console.error('Error in fetchUserRole:', err);
          setUserRole(null);
        }
      }
    };

    const fetchStats = async () => {
      if (!isSupabaseConfigured || !supabase) {
        console.error('Supabase is not configured');
        setStats({
          totalProducts: 0,
          totalOrders: 0,
          pendingOrders: 0,
          totalRevenue: 0,
        });
        return;
      }

      try {
        // Get total products
        const { count: totalProducts, error: productsError } = await supabase!
          .from('products')
          .select('*', { count: 'exact', head: true });
          
        if (productsError) {
          console.error('Error fetching products count:', productsError);
          // Don't return here, continue with other queries
        }
        
        // Get total orders
        const { count: totalOrders, error: ordersError } = await supabase!
          .from('orders')
          .select('*', { count: 'exact', head: true });
          
        if (ordersError) {
          console.error('Error fetching orders count:', ordersError);
        }
        
        // Get pending orders
        const { count: pendingOrders, error: pendingError } = await supabase!
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        if (pendingError) {
          console.error('Error fetching pending orders count:', pendingError);
        }

        // Get total revenue
        const { data: revenueData, error: revenueError } = await supabase!
          .from('orders')
          .select('total_amount')
          .eq('status', 'paid');

        if (revenueError) {
          console.error('Error fetching revenue data:', revenueError);
        }

        let totalRevenue = 0;
        if (revenueData) {
          totalRevenue = revenueData.reduce((sum, order) => sum + parseFloat(order.total_amount || '0'), 0);
        }

        // Update stats with safe fallback values
        setStats({
          totalProducts: totalProducts ?? 0,
          totalOrders: totalOrders ?? 0,
          pendingOrders: pendingOrders ?? 0,
          totalRevenue,
        });
      } catch (err) {
        console.error('Unexpected error in fetchStats:', err);
        // Set default values if there's an error
        setStats({
          totalProducts: 0,
          totalOrders: 0,
          pendingOrders: 0,
          totalRevenue: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    if (isLoaded && user) {
      fetchUserRole();
      fetchStats();
    }
  }, [user, isLoaded]); // Dependencies are correct - only run when user or isLoaded changes

  if (!isLoaded) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  // If userRole is still null after loading, it means we couldn't fetch the role (likely due to missing env vars)
  if (userRole === null && isLoaded && user) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Error</h1>
        <p>Could not verify your permissions. Please check your configuration.</p>
      </div>
    );
  }

  // Only check role after it's been fetched
  if (userRole !== 'admin' && userRole !== 'superadmin') {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>You don&#39;t have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{userRole === 'superadmin' ? 'Superadmin Dashboard' : 'Admin Dashboard'}</h1>
        <p className="text-gray-600">Welcome back, {(user?.firstName || user?.username || "Admin")}!</p>
        <p className="text-gray-500">Role: {userRole === 'superadmin' ? 'Super Admin' : 'Admin'}</p>
      </div>

      {loading ? (
        <div className="text-center">Loading dashboard...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp. {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(stats.totalRevenue)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {userRole === 'admin' ? (
                <a href="/admin/products" className="bg-blue-500 text-white p-4 rounded-lg text-center hover:bg-blue-600 transition-colors">
                  Manage Products
                </a>
              ) : (
                <div className="bg-gray-300 text-white p-4 rounded-lg text-center cursor-not-allowed opacity-50">
                  Manage Products
                </div>
              )}
              <a href="/admin/orders" className="bg-green-500 text-white p-4 rounded-lg text-center hover:bg-green-600 transition-colors">
                View Orders
              </a>
              {userRole === 'superadmin' ? (
                <a href="/admin/users" className="bg-purple-500 text-white p-4 rounded-lg text-center hover:bg-purple-600 transition-colors">
                  Manage Users
                </a>
              ) : (
                <div className="bg-gray-300 text-white p-4 rounded-lg text-center cursor-not-allowed opacity-50">
                  Manage Users
                </div>
              )}
              <a href="/products" className="bg-gray-500 text-white p-4 rounded-lg text-center hover:bg-gray-600 transition-colors">
                View Public Menu
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}