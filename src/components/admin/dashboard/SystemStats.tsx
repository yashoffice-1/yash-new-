import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/layout/card';
import { Progress } from '@/components/ui/data_display/progress';
import { BarChart3, Users, Video, Image, TrendingUp } from 'lucide-react';

interface SystemStatsData {
  totalUsers: number;
  verifiedUsers: number;
  pendingUsers: number;
  totalAssets: number;
  totalVideos: number;
  totalImages: number;
}

interface SystemStatsProps {
  stats: SystemStatsData | null;
}

export function SystemStats({ stats }: SystemStatsProps) {
  if (!stats) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No system statistics available</p>
      </div>
    );
  }

  const verificationRate = stats.totalUsers > 0 ? (stats.verifiedUsers / stats.totalUsers) * 100 : 0;
  const videoPercentage = stats.totalAssets > 0 ? (stats.totalVideos / stats.totalAssets) * 100 : 0;
  const imagePercentage = stats.totalAssets > 0 ? (stats.totalImages / stats.totalAssets) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* User Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>User Analytics</span>
          </CardTitle>
          <CardDescription>
            Overview of user registration and verification status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
              <div className="text-sm text-gray-500">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.verifiedUsers}</div>
              <div className="text-sm text-gray-500">Verified Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.pendingUsers}</div>
              <div className="text-sm text-gray-500">Pending Users</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Email Verification Rate</span>
              <span>{verificationRate.toFixed(1)}%</span>
            </div>
            <Progress value={verificationRate} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Content Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Content Analytics</span>
          </CardTitle>
          <CardDescription>
            Overview of generated content and media types
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.totalAssets}</div>
              <div className="text-sm text-gray-500">Total Assets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.totalVideos}</div>
              <div className="text-sm text-gray-500">Videos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalImages}</div>
              <div className="text-sm text-gray-500">Images</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center space-x-2">
                  <Video className="h-4 w-4 text-red-600" />
                  <span>Videos</span>
                </span>
                <span>{videoPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={videoPercentage} className="w-full" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center space-x-2">
                  <Image className="h-4 w-4 text-green-600" />
                  <span>Images</span>
                </span>
                <span>{imagePercentage.toFixed(1)}%</span>
              </div>
              <Progress value={imagePercentage} className="w-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>System Health</span>
          </CardTitle>
          <CardDescription>
            Key metrics for system performance and user engagement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>User Engagement</span>
                <span className="text-green-600">High</span>
              </div>
              <Progress value={85} className="w-full" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Content Generation</span>
                <span className="text-blue-600">Active</span>
              </div>
              <Progress value={72} className="w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 