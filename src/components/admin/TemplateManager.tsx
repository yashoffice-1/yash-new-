import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Users, Eye, Download, Plus, Settings, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { templatesAPI, adminAPI } from '@/api/backend-client';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';

interface HeyGenTemplate {
  template_id: string;
  name: string;
  description?: string;
  thumbnail_image_url?: string;
  aspect_ratio?: string;
  duration?: string;
  category?: string;
}

interface UserTemplateAccess {
  id: string;
  userId: string;
  templateName: string;
  templateDescription?: string;
  thumbnailUrl?: string;
  category?: string;
  aspectRatio?: string;
  canUse: boolean;
  usageCount: number;
  lastUsedAt?: string;
  expiresAt?: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  variables: TemplateVariable[];
}

interface TemplateVariable {
  id: string;
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  charLimit?: number;
  customCharLimit?: number; // Allow admin to override HeyGen limits
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export function TemplateManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('browse');
  const [templates, setTemplates] = useState<HeyGenTemplate[]>([]);
  const [assignments, setAssignments] = useState<UserTemplateAccess[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<HeyGenTemplate | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignForm, setAssignForm] = useState({
    userId: '',
    templateId: '',
    templateName: '',
    templateDescription: '',
    thumbnailUrl: '',
    category: '',
    aspectRatio: '',
    expiresAt: '',
    variables: [] as any[]
  });

  const [variablesLoading, setVariablesLoading] = useState(false);
  const { user } = useAuth();
  // Check if user has admin permissions
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  // Debug: Log current user info

  // Fetch template variables from backend (which proxies HeyGen)
  const fetchTemplateVariables = async (templateId: string) => {
    setVariablesLoading(true);
    try {
      const response = await templatesAPI.getHeyGenTemplateVariables(templateId);
      if (response.data.success && response.data.data) {
        const templateData = response.data.data;
        const variables = templateData.variables || [];
        
        // Update assign form with template details
        setAssignForm(prev => ({
          ...prev,
          templateId: templateData.templateId,
          templateName: templateData.templateName,
          templateDescription: templateData.templateDescription || '',
          thumbnailUrl: templateData.thumbnailUrl || '',
          category: templateData.category || '',
          aspectRatio: templateData.aspectRatio || '',
          variables: variables
        }));
        
        return variables;
      }
    } catch (error) {
      console.error('❌ Error fetching template variables:', error);
    } finally {
      setVariablesLoading(false);
    }
    return [];
  };

  // Fetch HeyGen templates
  const fetchTemplates = async () => {
    console.log('🔍 Fetching HeyGen templates...');
    setLoading(true);
    try {
      const response = await templatesAPI.getHeyGenTemplates();
      console.log('📊 HeyGen templates data:', response.data);
      
      if (response.data.success) {
        setTemplates(response.data.data.templates || []);
        console.log('✅ Templates loaded:', response.data.data.templates?.length || 0);
      } else {
        console.error('❌ Failed to fetch templates:', response.data.error);
        toast({
          title: "Error",
          description: response.data.error || "Failed to fetch templates",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch template assignments
  const fetchAssignments = async () => {
    console.log('🔍 Fetching template assignments...');
    try {
      const response = await templatesAPI.getAllAssignments();
      console.log('📊 Assignments data:', response.data);
      
      if (response.data.success) {
        setAssignments(response.data.data || []);
        console.log('✅ Assignments loaded:', response.data.data?.length || 0);
      } else {
        console.error('❌ Failed to fetch assignments:', response.data.error);
      }
    } catch (error) {
      console.error('❌ Error fetching assignments:', error);
    }
  };

  // Fetch users for assignment
  const fetchUsers = async () => {
    // Debug: Check if token exists
    const token = localStorage.getItem('auth_token');
    
    try {
      const response = await adminAPI.getUsers();
      console.log('📊 Users data:', response.data);
      
      if (response.data.success) {
        setUsers(response.data.data || []);
        console.log('✅ Users loaded:', response.data.data?.length || 0);
      } else {
        console.error('❌ Failed to fetch users:', response.data.error);
      }
    } catch (error: any) {
      console.error('❌ Error fetching users:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      if (error.response?.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please sign in again.",
          variant: "destructive",
        });
      } else if (error.response?.status === 403) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access user data. Please contact an administrator.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch users",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    console.log('🚀 TemplateManager mounted, fetching data...');
    
    // First check if backend is running
    const checkBackendHealth = async () => {
      try {
        const healthResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/health`);
        console.log('🏥 Backend health check:', healthResponse.status);
        if (healthResponse.status === 200) {
          console.log('✅ Backend is running');
          // Now fetch the actual data
          fetchTemplates();
          fetchAssignments();
          fetchUsers();
        } else {
          console.error('❌ Backend health check failed');
          toast({
            title: "Error",
            description: "Backend server is not responding",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('❌ Backend health check error:', error);
        toast({
          title: "Error",
          description: "Cannot connect to backend server",
          variant: "destructive",
        });
      }
    };
    
    checkBackendHealth();
  }, []);

  // Handle template assignment
  const handleAssignTemplate = async () => {
    if (!assignForm.userId || !assignForm.templateId) {
      toast({
        title: "Error",
        description: "Please select both user and template",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Prepare the data, omitting expiresAt if it's empty
      const assignmentData = {
        userId: assignForm.userId,
        templateId: assignForm.templateId,
        templateName: assignForm.templateName,
        templateDescription: assignForm.templateDescription,
        thumbnailUrl: assignForm.thumbnailUrl,
        category: assignForm.category,
        aspectRatio: assignForm.aspectRatio,
        variables: assignForm.variables
      };

      // Only include expiresAt if it's not empty and is a valid date
      if (assignForm.expiresAt && assignForm.expiresAt.trim() !== '') {
        try {
          // Validate that it's a proper datetime
          const date = new Date(assignForm.expiresAt);
          if (isNaN(date.getTime())) {
            throw new Error('Invalid date format');
          }
          // Format as ISO string for backend
          (assignmentData as any).expiresAt = date.toISOString();
        } catch (error) {
          toast({
            title: "Error",
            description: "Please enter a valid expiration date",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      const response = await templatesAPI.assignTemplateToUser(assignmentData);
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Template assigned successfully",
        });
        setShowAssignDialog(false);
        setAssignForm({
          userId: '',
          templateId: '',
          templateName: '',
          templateDescription: '',
          thumbnailUrl: '',
          category: '',
          aspectRatio: '',
          expiresAt: '',
          variables: []
        });
        fetchAssignments();
      } else {
        toast({
          title: "Error",
          description: response.data.error || "Failed to assign template",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Assignment error:', error);
      toast({
        title: "Error",
        description: "Failed to assign template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle template selection for assignment
  const handleSelectTemplateForAssignment = async (template: HeyGenTemplate) => {
    setSelectedTemplate(template);
    const variables = await fetchTemplateVariables(template.template_id);
    setAssignForm({
      userId: '',
      templateId: template.template_id,
      templateName: template.name,
      templateDescription: template.description || '',
      thumbnailUrl: template.thumbnail_image_url || '',
      category: template.category || '',
      aspectRatio: template.aspect_ratio || '',
      expiresAt: '',
      variables: variables
    });
    setShowAssignDialog(true);
  };

  // Handle assignment revocation
  const handleRevokeAssignment = async (assignmentId: string) => {
    try {
      const response = await templatesAPI.deleteTemplateAssignment(assignmentId);
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Template access revoked successfully",
        });
        fetchAssignments();
      } else {
        toast({
          title: "Error",
          description: response.data.error || "Failed to revoke access",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revoke access",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Template Management</h2>
          <p className="text-gray-600">
            Browse, assign, and manage video templates for your users
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {templates.length}
              </div>
              <div className="text-sm text-gray-500">Templates</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {assignments.length}
              </div>
              <div className="text-sm text-gray-500">Assignments</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">
                {users.length}
              </div>
              <div className="text-sm text-gray-500">Users</div>
            </div>
          </div>
          <div className="h-8 w-px bg-gray-300"></div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                setLoading(true);
                const response = await templatesAPI.cleanupExpiredTemplates();
                if (response.data.success) {
                  toast({
                    title: "Cleanup Complete",
                    description: response.data.message,
                  });
                  fetchAssignments(); // Refresh assignments
                }
              } catch (error) {
                toast({
                  title: "Cleanup Failed",
                  description: "Failed to clean up expired templates",
                  variant: "destructive",
                });
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Settings className="h-4 w-4" />
            )}
            <span className="ml-2">Cleanup Expired</span>
          </Button>
        </div>
      </div>

      {!isAdmin ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-800">Access Denied</h3>
                <p className="text-sm text-red-700">
                  You need admin permissions to manage templates. Current role: {user?.role || 'unknown'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="browse">Browse Templates</TabsTrigger>
              <TabsTrigger value="assign">Assign Templates</TabsTrigger>
              <TabsTrigger value="manage">Manage Assignments</TabsTrigger>
            </TabsList>

            {/* Browse Templates Tab */}
            <TabsContent value="browse" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Available Templates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2">Loading templates...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {templates.map((template) => (
                        <Card key={template.template_id} className="overflow-hidden hover:shadow-lg transition-all duration-200 border-0 shadow-md group">
                          <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 relative">
                            {template.thumbnail_image_url ? (
                              <img
                                src={template.thumbnail_image_url}
                                alt={template.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center">
                                  <Eye className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                  <span className="text-gray-500 text-sm">No Preview</span>
                                </div>
                              </div>
                            )}
                            <div className="absolute top-2 right-2">
                              <Badge variant="secondary" className="text-xs bg-white/90 backdrop-blur">
                                HeyGen
                              </Badge>
                            </div>
                          </div>
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="font-semibold text-gray-900 line-clamp-2 leading-tight">
                                {template.name}
                              </h3>
                            </div>
                            
                            {template.description && (
                              <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                                {template.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 mb-4">
                              {template.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {template.category}
                                </Badge>
                              )}
                              {template.aspect_ratio && (
                                <Badge variant="outline" className="text-xs">
                                  {template.aspect_ratio}
                                </Badge>
                              )}
                              {template.duration && (
                                <Badge variant="outline" className="text-xs">
                                  {template.duration}s
                                </Badge>
                              )}
                            </div>

                            <Button
                              size="sm"
                              onClick={() => handleSelectTemplateForAssignment(template)}
                              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all duration-200"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Assign Template
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Assign Templates Tab */}
            <TabsContent value="assign" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Assign Templates to Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Select a template and user to assign access. Users will only see templates assigned to them.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Template</Label>
                      <Select
                        value={assignForm.templateId}
                        onValueChange={async (value) => {
                          const template = templates.find(t => t.template_id === value);
                          if (template) {
                            const variables = await fetchTemplateVariables(template.template_id);
                            setAssignForm({
                              ...assignForm,
                              templateId: value,
                              templateName: template.name,
                              templateDescription: template.description || '',
                              thumbnailUrl: template.thumbnail_image_url || '',
                              category: template.category || '',
                              aspectRatio: template.aspect_ratio || '',
                              variables: variables
                            });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.template_id} value={template.template_id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>User</Label>
                      <Select
                        value={assignForm.userId}
                        onValueChange={(value) => setAssignForm({ ...assignForm, userId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label>Expiration Date (Optional)</Label>
                    <Input
                      type="datetime-local"
                      value={assignForm.expiresAt}
                      onChange={(e) => setAssignForm({ ...assignForm, expiresAt: e.target.value })}
                    />
                  </div>

                  {/* Template Variables Section */}
                  <div className="mt-4">
                    <Label>Template Variables (Auto-fetched from HeyGen)</Label>
                    <p className="text-sm text-gray-600 mb-2">
                      Variables are automatically fetched from the HeyGen template. These will be available to users when they generate content.
                    </p>
                    <div className="space-y-2">
                      {variablesLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm text-gray-500">Loading variables...</span>
                        </div>
                      ) : assignForm.variables.length > 0 ? (
                        assignForm.variables.map((variable, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 border rounded bg-gray-50">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{variable.name}</p>
                              <p className="text-xs text-gray-500">Type: {variable.type}</p>
                              {variable.defaultValue && (
                                <p className="text-xs text-gray-500">Default: {variable.defaultValue}</p>
                              )}
                            </div>
                            <Badge variant={variable.required ? "default" : "secondary"}>
                              {variable.required ? "Required" : "Optional"}
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 italic">No variables found for this template</p>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={handleAssignTemplate}
                    disabled={loading || !assignForm.userId || !assignForm.templateId}
                    className="mt-4"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Assign Template
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Manage Assignments Tab */}
            <TabsContent value="manage" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Current Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {assignments.map((assignment) => (
                      <Card key={assignment.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{assignment.templateName}</h3>
                              <Badge variant={assignment.canUse ? "default" : "secondary"}>
                                {assignment.canUse ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              Assigned to: {assignment.user.firstName} {assignment.user.lastName} ({assignment.user.email})
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Usage: {assignment.usageCount} times</span>
                              {assignment.lastUsedAt && (
                                <span>Last used: {new Date(assignment.lastUsedAt).toLocaleDateString()}</span>
                              )}
                              {assignment.expiresAt && (
                                <span>Expires: {new Date(assignment.expiresAt).toLocaleDateString()}</span>
                              )}
                            </div>
                            {assignment.variables && assignment.variables.length > 0 && (
                              <div className="mt-2">
                                <h4 className="font-semibold text-xs text-gray-700 mb-1">Variables:</h4>
                                <ul className="list-disc list-inside text-xs text-gray-600">
                                  {assignment.variables.map((variable, vIndex) => (
                                    <li key={vIndex}>
                                      {variable.name} ({variable.type})
                                      {variable.required && ' (Required)'}
                                      {variable.defaultValue && ` (Default: ${variable.defaultValue})`}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRevokeAssignment(assignment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                    
                    {assignments.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No template assignments found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Assignment Dialog */}
          <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                  <Plus className="h-5 w-5 text-blue-600" />
                  Assign Template to User
                </DialogTitle>
                <p className="text-sm text-gray-600">
                  Give a user access to this template for video generation
                </p>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Template Info Section */}
                {selectedTemplate && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-start gap-4">
                      {selectedTemplate.thumbnail_image_url && (
                        <div className="w-20 h-15 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                          <img
                            src={selectedTemplate.thumbnail_image_url}
                            alt={selectedTemplate.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {selectedTemplate.name}
                        </h3>
                        {selectedTemplate.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {selectedTemplate.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          {selectedTemplate.category && (
                            <Badge variant="secondary" className="text-xs">
                              {selectedTemplate.category}
                            </Badge>
                          )}
                          {selectedTemplate.aspect_ratio && (
                            <Badge variant="outline" className="text-xs">
                              {selectedTemplate.aspect_ratio}
                            </Badge>
                          )}
                          {selectedTemplate.duration && (
                            <Badge variant="outline" className="text-xs">
                              {selectedTemplate.duration}s
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* User Selection Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <Label className="text-base font-medium">Select User</Label>
                  </div>
                  <Select
                    value={assignForm.userId}
                    onValueChange={(value) => setAssignForm({ ...assignForm, userId: value })}
                  >
                    <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="Choose a user to assign this template to" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id} className="cursor-pointer">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-700">
                                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium">{user.firstName} {user.lastName}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {users.length === 0 && (
                    <p className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                      No users found. Make sure users are registered in the system.
                    </p>
                  )}
                </div>

                {/* Expiration Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                    <Label className="text-base font-medium">Access Duration</Label>
                    <Badge variant="outline" className="text-xs">Optional</Badge>
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="datetime-local"
                      value={assignForm.expiresAt}
                      onChange={(e) => setAssignForm({ ...assignForm, expiresAt: e.target.value })}
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500">
                      Leave empty for unlimited access, or set an expiration date
                    </p>
                  </div>
                </div>

                {/* Template Variables Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <Label className="text-base font-medium">Template Variables</Label>
                    <Badge variant="outline" className="text-xs">
                      Auto-fetched from HeyGen
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {variablesLoading ? (
                      <div className="flex items-center justify-center py-6 bg-gray-50 rounded-lg">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
                        <span className="text-sm text-gray-600">Fetching template variables...</span>
                      </div>
                    ) : assignForm.variables.length > 0 ? (
                      <div className="grid gap-2">
                        {assignForm.variables.map((variable, index) => (
                          <div key={index} className="flex items-start gap-3 p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors shadow-sm">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-sm font-semibold text-gray-900">{variable.name}</h4>
                                <Badge variant={variable.required ? "default" : "secondary"} className="text-xs">
                                  {variable.required ? "Required" : "Optional"}
                                </Badge>
                                <Badge variant="outline" className="text-xs text-gray-600 bg-gray-50">
                                  {variable.type}
                                </Badge>
                              </div>
                              
                              <div className="space-y-1">
                                {variable.charLimit && (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs text-blue-600 bg-blue-50">
                                      HeyGen: {variable.charLimit} chars
                                    </Badge>
                                    {variable.customCharLimit && (
                                      <Badge variant="outline" className="text-xs text-green-600 bg-green-50">
                                        Custom: {variable.customCharLimit} chars
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                {!variable.charLimit && variable.customCharLimit && (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs text-green-600 bg-green-50">
                                      Custom: {variable.customCharLimit} chars
                                    </Badge>
                                  </div>
                                )}
                                
                                {variable.defaultValue && (
                                  <p className="text-xs text-gray-500">
                                    Default: <span className="font-mono bg-gray-100 px-1 rounded text-xs">{variable.defaultValue}</span>
                                  </p>
                                )}
                              </div>
                              
                              {/* Custom Character Limit Input for Text Variables */}
                              {variable.type === 'text' && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <Label className="text-sm font-medium text-gray-700">
                                      Custom Character Limit (Max: {variable.charLimit || 500})
                                    </Label>
                                    <Badge variant="outline" className="text-xs">
                                      {variable.customCharLimit || variable.charLimit || 'Default'} chars
                                    </Badge>
                                  </div>
                                  
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                                                              <Input
                                          type="number"
                                          min="1"
                                          max={variable.charLimit || 500}
                                          placeholder={`Max ${variable.charLimit || 500} chars`}
                                          value={variable.customCharLimit || ''}
                                          onChange={(e) => {
                                            const value = e.target.value ? parseInt(e.target.value) : undefined;
                                            const maxAllowed = variable.charLimit || 500;
                                            
                                            // Don't allow custom limit to exceed HeyGen limit or system default
                                            if (value && value > maxAllowed) {
                                              return; // Don't update if over limit
                                            }
                                            
                                            const updatedVariables = [...assignForm.variables];
                                            updatedVariables[index] = {
                                              ...variable,
                                              customCharLimit: value
                                            };
                                            setAssignForm({
                                              ...assignForm,
                                              variables: updatedVariables
                                            });
                                          }}
                                          className="h-8 text-sm"
                                        />
                                    </div>
                                    
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const updatedVariables = [...assignForm.variables];
                                        updatedVariables[index] = {
                                          ...variable,
                                          customCharLimit: undefined
                                        };
                                        setAssignForm({
                                          ...assignForm,
                                          variables: updatedVariables
                                        });
                                      }}
                                      className="h-8 px-2 text-xs"
                                    >
                                      Reset
                                    </Button>
                                  </div>
                                  
                                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                    <span>HeyGen limit: {variable.charLimit || 'Not set'}</span>
                                    {variable.customCharLimit && (
                                      <Badge variant="outline" className="text-xs text-green-600">
                                        Custom: {variable.customCharLimit} chars
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-xs text-gray-500">?</span>
                        </div>
                        <p className="text-sm text-gray-500">No variables found for this template</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <Button
                    onClick={handleAssignTemplate}
                    disabled={loading || !assignForm.userId}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Assigning Template...
                      </>
                    ) : (
                      <>
                        <Plus className="h-5 w-5 mr-2" />
                        Assign Template
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAssignDialog(false)}
                    size="lg"
                    className="px-6"
                  >
                    Cancel
                  </Button>
                </div>

                {/* Assignment Status */}
                {loading && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">Assigning template...</p>
                        <p className="text-sm text-blue-700">
                          Setting up access for the selected user
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
} 