import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/forms/button';
import { Badge } from '@/components/ui/data_display/badge';
import { Input } from '@/components/ui/forms/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data_display/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/overlays/dialog';
import { Search, Mail, Calendar, Shield, User, Crown, Users, AlertTriangle, BarChart3, Upload, Clock, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/ui/use-toast';
import { useTheme } from '@/contexts/ThemeContext';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: 'user' | 'admin' | 'superadmin';
  status: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserAnalytics {
  totalUploads: number;
  lastUpload: string | null;
  hasUploads: boolean;
}

interface UserWithAnalytics extends User {
  analytics?: UserAnalytics;
}

export function UserManagement() {
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const [analyticsLoading, setAnalyticsLoading] = useState<Record<string, boolean>>({});
  const [analyticsFailed, setAnalyticsFailed] = useState<Record<string, boolean>>({});
  const isFetchingRef = useRef(false);

  useEffect(() => {
    fetchUsers();
    // Reset fetching flag when users change
    isFetchingRef.current = false;
  }, []);

  useEffect(() => {
    if (users.length > 0 && !isFetchingRef.current) {
      // Fetch analytics for users one by one with delays to avoid rate limiting
      const usersWithoutAnalytics = users.filter(user => !user.analytics && !analyticsLoading[user.id] && !analyticsFailed[user.id]);
      
      if (usersWithoutAnalytics.length > 0) {
        isFetchingRef.current = true;
        
        const fetchWithDelay = async (index: number) => {
          if (index >= usersWithoutAnalytics.length) {
            isFetchingRef.current = false;
            return;
          }
          
          const user = usersWithoutAnalytics[index];
          await fetchUserAnalytics(user.id);
          
          // Wait 500ms before next request to avoid rate limiting
          setTimeout(() => {
            fetchWithDelay(index + 1);
          }, 500);
        };
        
        // Start the sequential fetching
        fetchWithDelay(0);
      }
    }
  }, [users]); // Removed analyticsLoading from dependencies

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUsers(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAnalytics = useCallback(async (userId: string) => {
    if (analyticsLoading[userId]) return;
    
    setAnalyticsLoading(prev => ({ ...prev, [userId]: true }));
    
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/admin/users/${userId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.status === 429) {
        // Rate limited - mark as failed but don't retry immediately
        console.warn(`Rate limited for user ${userId}, will retry later`);
        setAnalyticsLoading(prev => ({ ...prev, [userId]: false }));
        setAnalyticsFailed(prev => ({ ...prev, [userId]: true }));
        return;
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUsers(prev => prev.map(user => 
            user.id === userId 
              ? { ...user, analytics: data.data.analytics }
              : user
          ));
        }
      } else {
        console.error(`Failed to fetch analytics for user ${userId}:`, response.status);
        setAnalyticsFailed(prev => ({ ...prev, [userId]: true }));
      }
    } catch (error) {
      console.error('Error fetching user analytics:', error);
    } finally {
      setAnalyticsLoading(prev => ({ ...prev, [userId]: false }));
    }
  }, [analyticsLoading]);

  const retryAnalytics = useCallback(async (userId: string) => {
    setAnalyticsFailed(prev => ({ ...prev, [userId]: false }));
    await fetchUserAnalytics(userId);
  }, [fetchUserAnalytics]);

  const updateUserRole = async (userId: string, newRole: string) => {
    // Get the user being updated
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    // Confirm the role change
    const confirmMessage = `Are you sure you want to change ${targetUser.displayName}'s role from ${targetUser.role} to ${newRole}?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Update the user in the local state
        setUsers(users.map(user => 
          user.id === userId ? { ...user, role: newRole as 'user' | 'admin' | 'superadmin' } : user
        ));
        
        // Show success toast
        toast({
          title: "Role Updated",
          description: `User role changed to ${newRole}`,
          variant: "default",
        });
      } else {
        // Show error toast
        toast({
          title: "Error",
          description: data.error || 'Failed to update user role',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: 'Failed to update user role',
        variant: "destructive",
      });
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <Badge className="bg-yellow-100 text-yellow-800">Superadmin</Badge>;
      case 'admin':
        return <Badge className="bg-blue-100 text-blue-800">Admin</Badge>;
      default:
        return <Badge variant="outline">User</Badge>;
    }
  };

  const isSelfDemotion = (userId: string) => {
    return currentUser?.id === userId;
  };

  const isLastSuperadmin = (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.role !== 'superadmin') return false;
    
    const superadminCount = users.filter(u => u.role === 'superadmin').length;
    return superadminCount <= 1;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 mx-auto ${
            theme === 'dark' ? 'border-white' : 'border-gray-900'
          }`}></div>
          <p className={`mt-2 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className={`${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <CardHeader>
          <CardTitle className={`flex items-center space-x-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            <Users className="h-5 w-5" />
            <span>User Management</span>
          </CardTitle>
          <CardDescription className={`${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            View and manage user accounts, roles, and permissions
            {users.length > 0 && (
              <div className={`mt-2 text-xs ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {users.filter(u => u.analytics).length} of {users.length} users have analytics loaded
                {users.filter(u => analyticsFailed[u.id]).length > 0 && (
                  <span className="text-red-500 ml-2">
                    ({users.filter(u => analyticsFailed[u.id]).length} failed)
                  </span>
                )}
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <Input
                placeholder="Search users by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 ${
                  theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                }`}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className={`w-full sm:w-48 ${
                theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
              }`}>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent className={`${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <SelectItem value="all" className={`${
                  theme === 'dark' ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100'
                }`}>All Roles</SelectItem>
                <SelectItem value="user" className={`${
                  theme === 'dark' ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100'
                }`}>Users</SelectItem>
                <SelectItem value="admin" className={`${
                  theme === 'dark' ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100'
                }`}>Admins</SelectItem>
                <SelectItem value="superadmin" className={`${
                  theme === 'dark' ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100'
                }`}>Superadmins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className={`rounded-md border ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <Table>
              <TableHeader>
                <TableRow className={`${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}>
                  <TableHead className={`${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>User</TableHead>
                  <TableHead className={`${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Role</TableHead>
                  <TableHead className={`${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Status</TableHead>
                  <TableHead className={`${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Analytics</TableHead>
                  <TableHead className={`${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Joined</TableHead>
                  <TableHead className={`${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                          {getRoleIcon(user.role)}
                        </div>
                        <div>
                          <div className="font-medium">{user.displayName}</div>
                          <div className="text-sm text-gray-500 flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(user.role)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {user.emailVerified ? (
                          <Badge variant="default" className="bg-green-600">Verified</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </div>
                    </TableCell>
                                         <TableCell>
                       <div className="flex items-center space-x-2">
                         {user.analytics ? (
                           <div className="flex items-center space-x-3">
                             <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 rounded-full border border-blue-200">
                               <Upload className="h-3 w-3 text-blue-600" />
                               <span className="text-xs font-medium text-blue-700">{user.analytics.totalUploads}</span>
                             </div>
                             <div className="flex items-center space-x-1 px-2 py-1 bg-green-50 rounded-full border border-green-200">
                               <Activity className="h-3 w-3 text-green-600" />
                               <span className="text-xs font-medium text-green-700">
                                 {user.analytics.hasUploads ? user.analytics.lastUpload : 'Never'}
                               </span>
                             </div>
                           </div>
                         ) : analyticsLoading[user.id] ? (
                           <div className="flex items-center space-x-1">
                             <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-600"></div>
                             <span className="text-xs text-gray-500">Loading...</span>
                           </div>
                         ) : analyticsFailed[user.id] ? (
                           <div className="flex items-center space-x-2">
                             <div className="flex items-center space-x-1">
                               <div className="w-3 h-3 bg-red-200 rounded-full"></div>
                               <span className="text-xs text-red-500">Failed</span>
                             </div>
                             <Button
                               size="sm"
                               variant="outline"
                               className="h-5 px-2 text-xs"
                               onClick={() => retryAnalytics(user.id)}
                             >
                               Retry
                             </Button>
                           </div>
                         ) : (
                           <div className="flex items-center space-x-1">
                             <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                             <span className="text-xs text-gray-400">Pending</span>
                           </div>
                         )}
                       </div>
                     </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                                         <TableCell>
                       <div className="flex flex-col space-y-2">
                                                   {/* Action Buttons Row */}
                          <div className="flex items-center space-x-2">
                            <Select
                              value={user.role}
                              onValueChange={(newRole) => updateUserRole(user.id, newRole)}
                              disabled={isSelfDemotion(user.id) || isLastSuperadmin(user.id)}
                            >
                              <SelectTrigger className={`w-28 h-8 text-xs ${(isSelfDemotion(user.id) || isLastSuperadmin(user.id)) ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="superadmin">Superadmin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                         
                         {/* Status Indicators Row */}
                         {(isSelfDemotion(user.id) || isLastSuperadmin(user.id)) && (
                           <div className="flex items-center space-x-1">
                             {isSelfDemotion(user.id) && (
                               <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-orange-600 border-orange-200 bg-orange-50">
                                 Self
                               </Badge>
                             )}
                             {isLastSuperadmin(user.id) && (
                               <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-red-600 border-red-200 bg-red-50">
                                 Protected
                               </Badge>
                             )}
                           </div>
                         )}
                       </div>
                     </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No users found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 