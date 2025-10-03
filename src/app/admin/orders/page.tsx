'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

export default function AdminOrdersPage() {
  const { user, isLoaded } = useUser();
  const [userRole, setUserRole] = useState<string | null>(null);
  type OrderItem = {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    price: string; // Price comes as string from database, needs parsing for calculations
    products: {
      id: string;
      name: string;
      image_url: string;
    } | null;
  };

  type Order = {
    id: string;
    customer_name: string;
    total_amount: string;
    status: string;
    xendit_invoice_id: string | null;
    created_at: string;
    order_items: OrderItem[];
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'failed'>('all');

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('clerk_user_id', user.id)
            .single();

          if (error) {
            console.error('Error fetching user role:', error);
          } else {
            setUserRole(data?.role || null);
          }
        } catch (err) {
          console.error('Error:', err);
        }
      }
    };

    const fetchOrders = async () => {
      try {
        let query = supabase
          .from('orders')
          .select(`
            *,
            order_items (
              *,
              products (name, image_url)
            )
          `)
          .order('created_at', { ascending: false });

        if (filter !== 'all') {
          query = query.eq('status', filter);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching orders:', error);
        } else {
          setOrders(data);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isLoaded && user) {
      fetchUserRole();
      fetchOrders();
    }
  }, [user, isLoaded, filter]);

  if (!isLoaded) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  if (userRole !== 'admin' && userRole !== 'superadmin') {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>Only admins and superadmins can access this page.</p>
      </div>
    );
  }

  // Filter orders based on selected status
  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Manage Orders</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          className={`px-4 py-2 rounded-md ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setFilter('all')}
        >
          All Orders
        </button>
        <button
          className={`px-4 py-2 rounded-md ${filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setFilter('pending')}
        >
          Pending
        </button>
        <button
          className={`px-4 py-2 rounded-md ${filter === 'paid' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setFilter('paid')}
        >
          Paid
        </button>
        <button
          className={`px-4 py-2 rounded-md ${filter === 'failed' ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setFilter('failed')}
        >
          Failed
        </button>
      </div>

      {loading ? (
        <div className="text-center">Loading orders...</div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Order #{order.id.substring(0, 8)}</CardTitle>
                    <p className="text-sm text-gray-500">
                      Customer: {order.customer_name} | Date: {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium
                    ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'paid' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'}`}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Items:</h4>
                  <ul className="space-y-2">
                    {order.order_items.map((item) => (
                      <li key={item.id} className="flex justify-between">
                        <div className="flex items-center">
                          <img 
                            src={item.products?.image_url || '/placeholder-food.jpg'} 
                            alt={item.products?.name} 
                            className="w-10 h-10 object-cover rounded mr-3"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-food.jpg';
                            }}
                          />
                          <span>
                            {item.products?.name} (x{item.quantity})
                          </span>
                        </div>
                        <span>${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex justify-end">
                  <div className="text-right">
                    <p className="font-semibold">Total: ${parseFloat(order.total_amount).toFixed(2)}</p>
                    {order.xendit_invoice_id && (
                      <p className="text-sm text-gray-500">Invoice ID: {order.xendit_invoice_id}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredOrders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No orders found matching the selected filter.
            </div>
          )}
        </div>
      )}
    </div>
  );
}