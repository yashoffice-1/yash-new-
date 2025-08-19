import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/layout/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/data_display/tabs';
import { Badge } from '@/components/ui/data_display/badge';
import { Progress } from '@/components/ui/data_display/progress';
import { 
  Users, 
  Video, 
  Image, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  Upload,
  Heart,
  Share2,
  Eye,
  Clock,
  DollarSign,
  Target,
  Zap,
  Globe
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { analyticsAPI, AnalyticsData } from '@/api/clients/analytics-client';
import { useQuery } from '@tanstack/react-query';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', timeRange],
    queryFn: () => analyticsAPI.getAnalytics(timeRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading analytics...</div>;
  }

  if (error || !data?.data) {
    return <div className="text-center text-red-500">Failed to load analytics data</div>;
  }

  const analyticsData = data.data;

  // Add null checks for analyticsData
  if (!analyticsData || typeof analyticsData !== 'object') {
    return <div className="text-center text-red-500">Invalid analytics data format</div>;
  }

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
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive insights into your platform performance</p>
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
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeGet(analyticsData, 'users.total', 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className={safeGet(analyticsData, 'users.growth.monthly', 0) > 0 ? 'text-green-600' : 'text-red-600'}>
                {safeGet(analyticsData, 'users.growth.monthly', 0) > 0 ? '+' : ''}{safeGet(analyticsData, 'users.growth.monthly', 0)}%
              </span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assets Generated</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeGet(analyticsData, 'content.generated.total', 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {safeGet(analyticsData, 'content.performance.successRate', 0)}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Social Uploads</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeGet(analyticsData, 'social.uploads.total', 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {safeGet(analyticsData, 'social.uploads.success', 0)} successful uploads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${safeGet(analyticsData, 'business.revenue.total', 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className={safeGet(analyticsData, 'business.revenue.growth', 0) > 0 ? 'text-green-600' : 'text-red-600'}>
                {safeGet(analyticsData, 'business.revenue.growth', 0) > 0 ? '+' : ''}{safeGet(analyticsData, 'business.revenue.growth', 0)}%
              </span> growth
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
        </TabsList>

        {/* Users Analytics */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>User Growth Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[
                    { name: 'Week 1', users: 100 },
                    { name: 'Week 2', users: 150 },
                    { name: 'Week 3', users: 200 },
                    { name: 'Week 4', users: 250 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="users" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Roles Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                                             data={[
                         { name: 'Users', value: safeGet(analyticsData, 'users.roles.user', 0) },
                         { name: 'Admins', value: safeGet(analyticsData, 'users.roles.admin', 0) },
                         { name: 'Superadmins', value: safeGet(analyticsData, 'users.roles.superadmin', 0) },
                       ]}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                                 <div className="flex justify-between">
                   <span>Daily</span>
                   <span className="font-bold">{safeGet(analyticsData, 'users.active.daily', 0)}</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Weekly</span>
                   <span className="font-bold">{safeGet(analyticsData, 'users.active.weekly', 0)}</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Monthly</span>
                   <span className="font-bold">{safeGet(analyticsData, 'users.active.monthly', 0)}</span>
                 </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Retention Rates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                                 <div className="flex justify-between">
                   <span>7 Days</span>
                   <span className="font-bold">{safeGet(analyticsData, 'users.retention.day7', 0)}%</span>
                 </div>
                 <div className="flex justify-between">
                   <span>30 Days</span>
                   <span className="font-bold">{safeGet(analyticsData, 'users.retention.day30', 0)}%</span>
                 </div>
                 <div className="flex justify-between">
                   <span>90 Days</span>
                   <span className="font-bold">{safeGet(analyticsData, 'users.retention.day90', 0)}%</span>
                 </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Growth Rates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                                 <div className="flex justify-between">
                   <span>Daily</span>
                   <span className={`font-bold ${safeGet(analyticsData, 'users.growth.daily', 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                     {safeGet(analyticsData, 'users.growth.daily', 0) > 0 ? '+' : ''}{safeGet(analyticsData, 'users.growth.daily', 0)}%
                   </span>
                 </div>
                 <div className="flex justify-between">
                   <span>Weekly</span>
                   <span className={`font-bold ${safeGet(analyticsData, 'users.growth.weekly', 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                     {safeGet(analyticsData, 'users.growth.weekly', 0) > 0 ? '+' : ''}{safeGet(analyticsData, 'users.growth.weekly', 0)}%
                   </span>
                 </div>
                 <div className="flex justify-between">
                   <span>Monthly</span>
                   <span className={`font-bold ${safeGet(analyticsData, 'users.growth.monthly', 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                     {safeGet(analyticsData, 'users.growth.monthly', 0) > 0 ? '+' : ''}{safeGet(analyticsData, 'users.growth.monthly', 0)}%
                   </span>
                 </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Analytics */}
        <TabsContent value="content" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Generation by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                                     <BarChart data={[
                     { name: 'Videos', count: safeGet(analyticsData, 'content.generated.videos', 0) },
                     { name: 'Images', count: safeGet(analyticsData, 'content.generated.images', 0) },
                     { name: 'Text', count: safeGet(analyticsData, 'content.generated.text', 0) },
                   ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Success Rates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                                     <div className="flex justify-between mb-2">
                     <span>HeyGen</span>
                     <span>{safeGet(analyticsData, 'content.success.heygen', 0)}%</span>
                   </div>
                   <Progress value={safeGet(analyticsData, 'content.success.heygen', 0)} className="h-2" />
                 </div>
                 <div>
                   <div className="flex justify-between mb-2">
                     <span>OpenAI</span>
                     <span>{safeGet(analyticsData, 'content.success.openai', 0)}%</span>
                   </div>
                   <Progress value={safeGet(analyticsData, 'content.success.openai', 0)} className="h-2" />
                 </div>
                 <div>
                   <div className="flex justify-between mb-2">
                     <span>RunwayML</span>
                     <span>{safeGet(analyticsData, 'content.success.runwayml', 0)}%</span>
                   </div>
                   <Progress value={safeGet(analyticsData, 'content.success.runwayml', 0)} className="h-2" />
                 </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                                 <div className="flex justify-between">
                   <span>Avg Generation Time</span>
                   <span className="font-bold">{safeGet(analyticsData, 'content.performance.avgGenerationTime', 0)}s</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Success Rate</span>
                   <span className="font-bold text-green-600">{safeGet(analyticsData, 'content.performance.successRate', 0)}%</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Failure Rate</span>
                   <span className="font-bold text-red-600">{safeGet(analyticsData, 'content.performance.failureRate', 0)}%</span>
                 </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Template Usage</CardTitle>
              </CardHeader>
              <CardContent>
                                 <div className="text-2xl font-bold mb-2">{safeGet(analyticsData, 'content.templates.totalUsed', 0)}</div>
                 <p className="text-sm text-muted-foreground">Total template uses</p>
                 <div className="mt-4 space-y-2">
                   {(safeGet(analyticsData, 'content.templates.mostPopular', []) as any[]).slice(0, 3).map((template, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{template.name}</span>
                      <span className="font-medium">{template.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generation Costs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Cost</span>
                  <span className="font-bold">${safeGet(analyticsData, 'business.costs.total', 0).toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg per Generation</span>
                  <span className="font-bold">${safeGet(analyticsData, 'business.costs.perGeneration', 0).toFixed(4)}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="text-sm font-medium mb-2">By Platform:</div>
                  {Object.entries(safeGet(analyticsData, 'business.costs.byPlatform', {})).map(([platform, cost]) => (
                    <div key={platform} className="flex justify-between text-sm">
                      <span className="capitalize">{platform}</span>
                      <span className="font-medium">${(cost as number).toFixed(4)}</span>
                    </div>
                  ))}
                </div>
                {safeGet(analyticsData, 'business.costs.platformCounts') && (
                  <div className="border-t pt-2 mt-2">
                    <div className="text-sm font-medium mb-2">Generation Counts:</div>
                    {Object.entries(safeGet(analyticsData, 'business.costs.platformCounts', {})).map(([platform, count]) => (
                      <div key={platform} className="flex justify-between text-sm">
                        <span className="capitalize">{platform}</span>
                        <span className="font-medium">{count as number}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {safeGet(analyticsData, 'business.costs.byAssetType') && Object.keys(safeGet(analyticsData, 'business.costs.byAssetType', {})).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Costs by Asset Type</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(safeGet(analyticsData, 'business.costs.byAssetType', {})).map(([assetType, cost]) => (
                    <div key={assetType} className="flex justify-between">
                      <span className="capitalize">{assetType}</span>
                      <span className="font-bold">${(cost as number).toFixed(4)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>${(Object.values(safeGet(analyticsData, 'business.costs.byAssetType', {})).reduce((sum: number, cost: any) => sum + (cost || 0), 0) as number).toFixed(4)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Assets Analytics */}
        <TabsContent value="assets" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Asset Library Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                                             data={[
                         { name: 'Videos', value: safeGet(analyticsData, 'assets.library.videos', 0) },
                         { name: 'Images', value: safeGet(analyticsData, 'assets.library.images', 0) },
                         { name: 'Text', value: safeGet(analyticsData, 'assets.library.text', 0) },
                       ]}
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

            <Card>
              <CardHeader>
                <CardTitle>Storage Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                                         <div className="flex justify-between mb-2">
                       <span>Used Storage</span>
                       <span>{safeGet(analyticsData, 'assets.storage.used', 0)}GB / {safeGet(analyticsData, 'assets.storage.total', 0)}GB</span>
                     </div>
                     <Progress value={safeGet(analyticsData, 'assets.storage.percentage', 0)} className="h-2" />
                   </div>
                   <div className="grid grid-cols-3 gap-4 text-center">
                     <div>
                       <div className="text-2xl font-bold">{safeGet(analyticsData, 'assets.engagement.favorites', 0)}</div>
                       <div className="text-sm text-muted-foreground">Favorites</div>
                     </div>
                     <div>
                       <div className="text-2xl font-bold">{safeGet(analyticsData, 'assets.engagement.downloads', 0)}</div>
                       <div className="text-sm text-muted-foreground">Downloads</div>
                     </div>
                     <div>
                       <div className="text-2xl font-bold">{safeGet(analyticsData, 'assets.engagement.views', 0)}</div>
                       <div className="text-sm text-muted-foreground">Views</div>
                     </div>
                   </div>
                   
                   {/* Folder Analytics */}
                   {safeGet(analyticsData, 'assets.storage.folders') && (
                     <div className="border-t pt-4">
                       <div className="text-sm font-medium mb-2">Storage by Folder:</div>
                       <div className="space-y-2">
                         {Object.entries(safeGet(analyticsData, 'assets.storage.folders', {})).map(([folder, data]: [string, any]) => (
                           <div key={folder} className="flex justify-between items-center text-sm">
                             <span className="capitalize">{folder}</span>
                             <div className="flex items-center space-x-2">
                               <span>{data.count} files</span>
                               <span className="text-muted-foreground">({data.gb.toFixed(2)} GB)</span>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Social Media Analytics */}
        <TabsContent value="social" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Social Media Connections</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                                     <BarChart data={[
                     { platform: 'YouTube', connections: safeGet(analyticsData, 'social.connections.youtube', 0) },
                     { platform: 'Instagram', connections: safeGet(analyticsData, 'social.connections.instagram', 0) },
                     { platform: 'Facebook', connections: safeGet(analyticsData, 'social.connections.facebook', 0) },
                     { platform: 'TikTok', connections: safeGet(analyticsData, 'social.connections.tiktok', 0) },
                   ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="platform" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="connections" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upload Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                                     <div className="flex justify-between mb-2">
                     <span>Success Rate</span>
                     <span>{(() => {
                       const success = safeGet(analyticsData, 'social.uploads.success', 0);
                       const total = safeGet(analyticsData, 'social.uploads.total', 1);
                       return total > 0 ? ((success / total) * 100).toFixed(1) : '0.0';
                     })()}%</span>
                   </div>
                   <Progress value={(() => {
                     const success = safeGet(analyticsData, 'social.uploads.success', 0);
                     const total = safeGet(analyticsData, 'social.uploads.total', 1);
                     return total > 0 ? (success / total) * 100 : 0;
                   })()} className="h-2" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="text-center">
                     <div className="text-2xl font-bold text-green-600">{safeGet(analyticsData, 'social.uploads.success', 0)}</div>
                     <div className="text-sm text-muted-foreground">Successful</div>
                   </div>
                   <div className="text-center">
                     <div className="text-2xl font-bold text-red-600">{safeGet(analyticsData, 'social.uploads.failed', 0)}</div>
                     <div className="text-sm text-muted-foreground">Failed</div>
                   </div>
                 </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="h-4 w-4 mr-2" />
                  Likes
                </CardTitle>
              </CardHeader>
              <CardContent>
                                 <div className="text-2xl font-bold">{safeGet(analyticsData, 'social.engagement.likes', 0).toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Share2 className="h-4 w-4 mr-2" />
                  Shares
                </CardTitle>
              </CardHeader>
              <CardContent>
                                 <div className="text-2xl font-bold">{safeGet(analyticsData, 'social.engagement.shares', 0).toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="h-4 w-4 mr-2" />
                  Reach
                </CardTitle>
              </CardHeader>
              <CardContent>
                                 <div className="text-2xl font-bold">{safeGet(analyticsData, 'social.engagement.reach', 0).toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-4 w-4 mr-2" />
                  Comments
                </CardTitle>
              </CardHeader>
              <CardContent>
                                 <div className="text-2xl font-bold">{safeGet(analyticsData, 'social.engagement.comments', 0).toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Business Analytics */}
        <TabsContent value="business" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[
                    { month: 'Jan', revenue: 1000 },
                    { month: 'Feb', revenue: 1500 },
                    { month: 'Mar', revenue: 2000 },
                    { month: 'Apr', revenue: 2500 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Usage by User</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                                     {(safeGet(analyticsData, 'business.apiUsage.byUser', []) as any[]).slice(0, 5).map((user, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">User {user.userId.slice(-8)}</span>
                      <Badge variant="secondary">{user.count} calls</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                                 <div className="flex justify-between">
                   <span>Total Revenue</span>
                   <span className="font-bold">${safeGet(analyticsData, 'business.revenue.total', 0).toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Revenue per User</span>
                   <span className="font-bold">${safeGet(analyticsData, 'business.revenue.perUser', 0)}</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Growth Rate</span>
                   <span className={`font-bold ${safeGet(analyticsData, 'business.revenue.growth', 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                     {safeGet(analyticsData, 'business.revenue.growth', 0) > 0 ? '+' : ''}{safeGet(analyticsData, 'business.revenue.growth', 0)}%
                   </span>
                 </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                                 <div className="flex justify-between">
                   <span>Total Costs</span>
                   <span className="font-bold">${safeGet(analyticsData, 'business.costs.total', 0).toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Cost per Generation</span>
                   <span className="font-bold">${safeGet(analyticsData, 'business.costs.perGeneration', 0)}</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Profit Margin</span>
                   <span className="font-bold text-green-600">
                     {(() => {
                       const revenue = safeGet(analyticsData, 'business.revenue.total', 0);
                       const costs = safeGet(analyticsData, 'business.costs.total', 0);
                       return revenue > 0 ? ((revenue - costs) / revenue * 100).toFixed(1) : '0.0';
                     })()}%
                   </span>
                 </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Costs</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPieChart>
                    <Pie
                      data={Object.entries(safeGet(analyticsData, 'business.costs.byPlatform', {})).map(([platform, cost]) => ({
                        name: platform.charAt(0).toUpperCase() + platform.slice(1),
                        value: cost as number
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${Number(value).toFixed(4)}`, 'Cost']} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {Object.entries(safeGet(analyticsData, 'business.costs.byPlatform', {})).map(([platform, cost]) => (
                    <div key={platform} className="flex justify-between text-sm">
                      <span className="capitalize">{platform}</span>
                      <span className="font-medium">${(cost as number).toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
