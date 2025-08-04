
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, BarChart3, Settings, Shield, Video, Image, TrendingUp, Activity, FileVideo } from 'lucide-react';
import { UserManagement } from './UserManagement';
import { SystemStats } from './SystemStats';
import { AdminSettings } from './AdminSettings';
import { TemplateManager } from './TemplateManager';
import { adminAPI } from '@/api/backend-client';

interface SystemStatsData {
  totalUsers: number;
  verifiedUsers: number;
  pendingUsers: number;
  totalAssets: number;
  totalVideos: number;
  totalImages: number;
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'settings' | 'templates'>('overview');
  const [stats, setStats] = useState<SystemStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      const response = await adminAPI.getStats();
      
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users and monitor system performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <Badge variant="outline">Admin Access</Badge>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <div className="p-2 bg-blue-100 rounded-full">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
              <div className="flex items-center space-x-2 mt-1">
                <div className="flex items-center space-x-1 text-xs text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>{stats.verifiedUsers} verified</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-orange-600">
                  <Activity className="h-3 w-3" />
                  <span>{stats.pendingUsers} pending</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <div className="p-2 bg-green-100 rounded-full">
                <BarChart3 className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.totalAssets}</div>
              <div className="flex items-center space-x-2 mt-1">
                <div className="flex items-center space-x-1 text-xs text-blue-600">
                  <Video className="h-3 w-3" />
                  <span>{stats.totalVideos} videos</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-purple-600">
                  <Image className="h-3 w-3" />
                  <span>{stats.totalImages} images</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Videos</CardTitle>
              <div className="p-2 bg-purple-100 rounded-full">
                <Video className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.totalVideos}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalAssets > 0 ? Math.round((stats.totalVideos / stats.totalAssets) * 100) : 0}% of total assets
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Images</CardTitle>
              <div className="p-2 bg-orange-100 rounded-full">
                <Image className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.totalImages}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalAssets > 0 ? Math.round((stats.totalImages / stats.totalAssets) * 100) : 0}% of total assets
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'users' | 'settings' | 'templates')}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileVideo className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <SystemStats stats={stats} />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <TemplateManager />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <AdminSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
