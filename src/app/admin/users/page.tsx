'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

export default function AdminUsersPage() {
  const { user, isLoaded } = useUser();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  type UserRole = {
    id: string;
    clerk_user_id: string;
    role: string;
    created_at: string;
  };

  const [users, setUsers] = useState<UserRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

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

    const fetchUsers = async () => {
      try {
        // First, get all user roles from our database
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('*');

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
          return;
        }

        // For each user role, we could potentially fetch more user details from Clerk
        // For now, we'll just use the role data we have
        setUsers(userRoles);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoadingUsers(false);
      }
    };

    if (isLoaded && user) {
      fetchUserRole();
      fetchUsers();
    }
  }, [user, isLoaded]);

  const handleInviteAdmin = async () => {
    if (!email) {
      setInviteError('Please enter an email address');
      return;
    }

    setInviting(true);
    setInviteError(null);

    try {
      // Call the API to invite a new admin
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, inviterId: user?.id }),
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        let errorMessage = 'Failed to invite admin';
        try {
          const errorResult = await response.json();
          errorMessage = errorResult.error || errorResult.message || errorMessage;
        } catch (e) {
          console.error('Could not parse error response as JSON:', e);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        setInviteError(errorMessage);
        return;
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        setInviteError('Invalid response from server');
        return;
      }

      if (result.success) {
        setEmail('');
        // Refresh the list of users
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('*');
        
        if (!rolesError) {
          setUsers(userRoles);
        }
      } else {
        setInviteError(result.error || 'Failed to invite admin');
      }
    } catch (error) {
      console.error('Error inviting admin:', error);
      setInviteError('An error occurred while inviting admin. Please check your configuration.');
    } finally {
      setInviting(false);
    }
  };

  if (!isLoaded) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  if (userRole !== 'superadmin') {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>Only superadmins can access this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Manage Admins</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Invite New Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              placeholder="Enter admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleInviteAdmin} disabled={inviting}>
              {inviting ? 'Sending...' : 'Invite Admin'}
            </Button>
          </div>
          {inviteError && (
            <p className="text-red-500 mt-2">{inviteError}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Inviting an admin will send them an email to create their account. 
            After they sign up, they will have admin privileges.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <p>Loading users...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.clerk_user_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${user.role === 'superadmin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}