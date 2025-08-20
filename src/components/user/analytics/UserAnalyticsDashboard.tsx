import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/layout/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/data_display/tabs';
import { Progress } from '@/components/ui/data_display/progress';
import { Badge } from '@/components/ui/data_display/badge';
import { 
  HardDrive, 
  DollarSign, 
  Video, 
  Image, 
  TrendingUp,
  Calendar,
  Download,
  Upload,
  Activity,
  BarChart3,
  PieChart,
  Clock
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { userAnalyticsAPI, UserAnalyticsData } from '@/api/clients/user-analytics-client';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];



export function UserAnalyticsDashboard() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const { data, isLoading, error } = useQuery({
    queryKey: ['userAnalytics', user?.id, timeRange],
    queryFn: () => userAnalyticsAPI.getMyAnalytics(timeRange),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading your analytics...</div>;
  }

  if (error || !data?.data) {
    return <div className="text-center text-red-500">Failed to load your analytics data</div>;
  }

  const analyticsData = data.data;

  // Create safe access functions
  const safeGet = (obj: any, path: string, defaultValue: any = 0) => {
    try {
      return path.split('.').reduce((acc, part) => acc?.[part], obj) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Your Analytics</h1>
          <p className="text-muted-foreground">Personal insights into your usage and storage</p>
        </div>
        <div className="flex items-center space-x-2">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="border rounded-md px-3 py-1"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeGet(analyticsData, 'storage.used', 0).toFixed(2)} GB</div>
            <p className="text-xs text-muted-foreground">
              {safeGet(analyticsData, 'storage.percentage', 0).toFixed(1)}% of {safeGet(analyticsData, 'storage.total', 0)} GB limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeGet(analyticsData, 'assets.total', 0)}</div>
            <p className="text-xs text-muted-foreground">
              {safeGet(analyticsData, 'assets.videos', 0)} videos, {safeGet(analyticsData, 'assets.images', 0)} images
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Generation Costs</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${safeGet(analyticsData, 'costs.total', 0).toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              ${safeGet(analyticsData, 'costs.perGeneration', 0).toFixed(4)} per generation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeGet(analyticsData, 'activity.thisMonth', 0)}</div>
            <p className="text-xs text-muted-foreground">
              {safeGet(analyticsData, 'activity.lastMonth', 0)} last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="storage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Storage Analytics */}
        <TabsContent value="storage" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Storage Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Used Storage</span>
                      <span>{safeGet(analyticsData, 'storage.used', 0).toFixed(2)}GB / {safeGet(analyticsData, 'storage.total', 0)}GB</span>
                    </div>
                    <Progress value={safeGet(analyticsData, 'storage.percentage', 0)} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{safeGet(analyticsData, 'storage.assetCount', 0)}</div>
                      <div className="text-sm text-muted-foreground">Total Assets</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">${safeGet(analyticsData, 'storage.costEstimate', 0).toFixed(4)}</div>
                      <div className="text-sm text-muted-foreground">Monthly Cost</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Storage by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={Object.entries(safeGet(analyticsData, 'storage.byResourceType', {})).map(([type, data]: [string, any]) => ({
                        name: type.charAt(0).toUpperCase() + type.slice(1),
                        value: data.count
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Folder Breakdown */}
          {safeGet(analyticsData, 'storage.folders') && Object.keys(safeGet(analyticsData, 'storage.folders', {})).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Storage by Folder</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(safeGet(analyticsData, 'storage.folders', {})).map(([folder, data]: [string, any]) => (
                    <div key={folder} className="flex justify-between items-center p-2 border rounded">
                      <span className="capitalize">{folder.replace('-', ' ')}</span>
                      <div className="flex items-center space-x-4">
                        <span>{data.count} files</span>
                        <span className="text-muted-foreground">({data.gb.toFixed(2)} GB)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Costs Analytics */}
        <TabsContent value="costs" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Cost</span>
                    <span className="font-bold">${safeGet(analyticsData, 'costs.total', 0).toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg per Generation</span>
                    <span className="font-bold">${safeGet(analyticsData, 'costs.perGeneration', 0).toFixed(4)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="text-sm font-medium mb-2">By Platform:</div>
                    {Object.entries(safeGet(analyticsData, 'costs.byPlatform', {})).map(([platform, cost]) => (
                      <div key={platform} className="flex justify-between text-sm">
                        <span className="capitalize">{platform}</span>
                        <span className="font-medium">${(cost as number).toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generation Counts</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(safeGet(analyticsData, 'costs.platformCounts', {})).map(([platform, count]) => ({
                    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
                    count: count as number
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="platform" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Costs by Asset Type */}
          {safeGet(analyticsData, 'costs.byAssetType') && Object.keys(safeGet(analyticsData, 'costs.byAssetType', {})).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Costs by Asset Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(safeGet(analyticsData, 'costs.byAssetType', {})).map(([assetType, cost]) => (
                    <div key={assetType} className="flex justify-between items-center p-2 border rounded">
                      <span className="capitalize">{assetType}</span>
                      <span className="font-bold">${(cost as number).toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Assets Analytics */}
        <TabsContent value="assets" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Asset Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{safeGet(analyticsData, 'assets.videos', 0)}</div>
                    <div className="text-sm text-muted-foreground">Videos</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{safeGet(analyticsData, 'assets.images', 0)}</div>
                    <div className="text-sm text-muted-foreground">Images</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {Object.entries(safeGet(analyticsData, 'assets.byStatus', {})).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span className="capitalize">{status}</span>
                      <Badge variant="secondary">{count as number}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Assets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(safeGet(analyticsData, 'assets.recent', []) as any[]).slice(0, 5).map((asset) => (
                    <div key={asset.id} className="flex justify-between items-center p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        {asset.assetType === 'video' ? <Video className="h-4 w-4" /> : <Image className="h-4 w-4" />}
                        <span className="capitalize">{asset.assetType}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={asset.status === 'completed' ? 'default' : 'secondary'}>
                          {asset.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(asset.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Analytics */}
        <TabsContent value="activity" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Activity Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Uploads</span>
                    <span className="font-bold">{safeGet(analyticsData, 'activity.totalUploads', 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>This Month</span>
                    <span className="font-bold">{safeGet(analyticsData, 'activity.thisMonth', 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Month</span>
                    <span className="font-bold">{safeGet(analyticsData, 'activity.lastMonth', 0)}</span>
                  </div>
                  {safeGet(analyticsData, 'activity.lastUpload') && (
                    <div className="flex justify-between">
                      <span>Last Upload</span>
                      <span className="font-bold">
                        {new Date(safeGet(analyticsData, 'activity.lastUpload')).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { month: 'Last Month', uploads: safeGet(analyticsData, 'activity.lastMonth', 0) },
                    { month: 'This Month', uploads: safeGet(analyticsData, 'activity.thisMonth', 0) }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="uploads" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
