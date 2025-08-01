import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Settings, Shield, Bell, Database, Globe } from 'lucide-react';

export function AdminSettings() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    systemMaintenance: false,
    debugMode: false,
    maxFileSize: '10',
    sessionTimeout: '24'
  });

  const handleSettingChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    // TODO: Implement settings save to backend
    console.log('Saving settings:', settings);
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>General Settings</span>
          </CardTitle>
          <CardDescription>
            Configure basic system settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-gray-500">
                Send email notifications for system events
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>System Maintenance Mode</Label>
              <p className="text-sm text-gray-500">
                Enable maintenance mode to restrict user access
              </p>
            </div>
            <Switch
              checked={settings.systemMaintenance}
              onCheckedChange={(checked) => handleSettingChange('systemMaintenance', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Debug Mode</Label>
              <p className="text-sm text-gray-500">
                Enable detailed logging for troubleshooting
              </p>
            </div>
            <Switch
              checked={settings.debugMode}
              onCheckedChange={(checked) => handleSettingChange('debugMode', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* File Upload Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>File Upload Settings</span>
          </CardTitle>
          <CardDescription>
            Configure file upload limits and restrictions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxFileSize">Maximum File Size (MB)</Label>
              <Input
                id="maxFileSize"
                type="number"
                value={settings.maxFileSize}
                onChange={(e) => handleSettingChange('maxFileSize', e.target.value)}
                placeholder="10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => handleSettingChange('sessionTimeout', e.target.value)}
                placeholder="24"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Security Settings</span>
          </CardTitle>
          <CardDescription>
            Configure security and access control settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Password Policy</Label>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">Minimum 8 characters</Badge>
                <Badge variant="outline" className="text-xs">Require uppercase</Badge>
                <Badge variant="outline" className="text-xs">Require numbers</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Session Management</Label>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">JWT tokens</Badge>
                <Badge variant="outline" className="text-xs">7-day expiration</Badge>
                <Badge variant="outline" className="text-xs">Secure cookies</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>System Information</span>
          </CardTitle>
          <CardDescription>
            Current system status and version information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Environment</Label>
              <div className="flex items-center space-x-2">
                <Badge variant="default" className="bg-green-600">Production</Badge>
                <span className="text-sm text-gray-500">v1.0.0</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Database</Label>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">PostgreSQL</Badge>
                <span className="text-sm text-gray-500">Connected</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} className="flex items-center space-x-2">
          <Settings className="h-4 w-4" />
          <span>Save Settings</span>
        </Button>
      </div>
    </div>
  );
} 