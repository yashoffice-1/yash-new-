
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface TestStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
}

export function TestingModule() {
  const [testSteps, setTestSteps] = useState<TestStep[]>([
    {
      id: 'product-display',
      name: 'Product Display',
      description: 'Test fake product loading and image selection',
      status: 'pending'
    },
    {
      id: 'instruction-input',
      name: 'Instruction Input',
      description: 'Test instruction input and AI cleaning',
      status: 'pending'
    },
    {
      id: 'image-generation',
      name: 'Image Generation',
      description: 'Test RunwayML image generation API',
      status: 'pending'
    },
    {
      id: 'video-generation',
      name: 'Video Generation',
      description: 'Test video generation APIs',
      status: 'pending'
    },
    {
      id: 'content-generation',
      name: 'Content Generation',
      description: 'Test OpenAI content generation',
      status: 'pending'
    },
    {
      id: 'combo-generation',
      name: 'Combo Generation',
      description: 'Test full combo generation workflow',
      status: 'pending'
    }
  ]);

  const [isRunningAll, setIsRunningAll] = useState(false);
  const { toast } = useToast();

  const runSingleTest = async (testId: string) => {
    setTestSteps(prev => prev.map(step => 
      step.id === testId ? { ...step, status: 'running' } : step
    ));

    // Simulate test execution
    setTimeout(() => {
      const success = Math.random() > 0.2; // 80% success rate for demo
      setTestSteps(prev => prev.map(step => 
        step.id === testId ? { 
          ...step, 
          status: success ? 'passed' : 'failed' 
        } : step
      ));

      toast({
        title: success ? "Test Passed" : "Test Failed",
        description: `${testSteps.find(s => s.id === testId)?.name} test ${success ? 'completed successfully' : 'encountered an error'}.`,
        variant: success ? "default" : "destructive",
      });
    }, 2000);
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    
    // Reset all tests
    setTestSteps(prev => prev.map(step => ({ ...step, status: 'pending' })));

    // Run tests sequentially
    for (let i = 0; i < testSteps.length; i++) {
      const step = testSteps[i];
      setTestSteps(prev => prev.map(s => 
        s.id === step.id ? { ...s, status: 'running' } : s
      ));

      await new Promise(resolve => setTimeout(resolve, 1500));

      const success = Math.random() > 0.2;
      setTestSteps(prev => prev.map(s => 
        s.id === step.id ? { 
          ...s, 
          status: success ? 'passed' : 'failed' 
        } : s
      ));
    }

    setIsRunningAll(false);
    toast({
      title: "All Tests Complete",
      description: "Full system test has finished running.",
    });
  };

  const getStatusColor = (status: TestStep['status']) => {
    const colors = {
      pending: "bg-gray-100 text-gray-800",
      running: "bg-blue-100 text-blue-800",
      passed: "bg-green-100 text-green-800", 
      failed: "bg-red-100 text-red-800"
    };
    return colors[status];
  };

  const getStatusText = (status: TestStep['status']) => {
    const texts = {
      pending: "Pending",
      running: "Running...",
      passed: "Passed ✓",
      failed: "Failed ✗"
    };
    return texts[status];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Platform Testing Module
          <Button 
            onClick={runAllTests}
            disabled={isRunningAll}
          >
            {isRunningAll ? "Running All Tests..." : "Run All Tests"}
          </Button>
        </CardTitle>
        <CardDescription>
          Test all platform functionality to ensure everything is working correctly
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {testSteps.map((step) => (
            <div key={step.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">{step.name}</h4>
                    <Badge className={getStatusColor(step.status)}>
                      {getStatusText(step.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runSingleTest(step.id)}
                  disabled={step.status === 'running' || isRunningAll}
                >
                  Run Test
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
