// src/components/admin/AdminSettings.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Settings, Shield, Bell, Database, Globe, Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/ui/use-toast';
import { settingsAPI, SystemSetting } from '@/api/settings-client';

interface SettingsFormData {
  [key: string]: string | boolean;
}

export function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<SettingsFormData>({});

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading settings from API...');
      const fetchedSettings = await settingsAPI.getAllSettings();
      console.log('✅ Fetched settings:', fetchedSettings);
      setSettings(fetchedSettings);
      
      // Initialize form data with current settings
      const initialFormData: SettingsFormData = {};
      fetchedSettings.forEach(setting => {
        initialFormData[setting.key] = setting.value;
      });
      setFormData(initialFormData);
    } catch (error) {
      console.error('❌ Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      console.log(' Saving settings...');
      
      // Update all changed settings
      const updatePromises = settings.map(async (setting) => {
        const newValue = formData[setting.key];
        if (newValue !== undefined && newValue !== setting.value) {
          console.log(`🔄 Updating setting ${setting.key}: ${setting.value} -> ${newValue}`);
          return settingsAPI.updateSetting(setting.key, {
            value: String(newValue)
          });
        }
        return null;
      });

      const results = await Promise.all(updatePromises);
      const updatedCount = results.filter(Boolean).length;

      console.log(`✅ Updated ${updatedCount} settings`);
      toast({
        title: 'Success',
        description: `Updated ${updatedCount} settings successfully`,
      });

      // Reload settings to get fresh data
      await loadSettings();
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const getSettingsByCategory = (category: string) => {
    return settings.filter(setting => setting.category === category);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Settings</h2>
          <p className="text-gray-500">Manage system-wide configuration settings</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadSettings} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Settings by Category */}
      {['general', 'security', 'upload', 'email', 'system'].map(category => {
        const categorySettings = getSettingsByCategory(category);
        if (categorySettings.length === 0) return null;

        const categoryIcons = {
          general: Settings,
          security: Shield,
          upload: Database,
          email: Bell,
          system: Globe
        };

        const Icon = categoryIcons[category as keyof typeof categoryIcons];

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Icon className="h-5 w-5" />
                <span>{category.charAt(0).toUpperCase() + category.slice(1)} Settings</span>
              </CardTitle>
              <CardDescription>
                {category} configuration settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {categorySettings.map(setting => (
                <div key={setting.key} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                    <p className="text-sm text-gray-500">{setting.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {setting.value === 'true' || setting.value === 'false' ? (
                      <Switch
                        checked={formData[setting.key] === 'true' || setting.value === 'true'}
                        onCheckedChange={(checked) => handleSettingChange(setting.key, checked)}
                      />
                    ) : (
                      <Input
                        value={String(formData[setting.key] || setting.value)}
                        onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                        className="w-48"
                      />
                    )}
                    <Badge variant={setting.isPublic ? "default" : "secondary"}>
                      {setting.isPublic ? "Public" : "Private"}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Total Settings: {settings.length}
          </p>
          <p className="text-sm text-gray-500">
            Categories: {Array.from(new Set(settings.map(s => s.category))).join(', ')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}