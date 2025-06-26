
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImportProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductsImported: (count: number) => void;
}

export function ImportProductsDialog({ open, onOpenChange, onProductsImported }: ImportProductsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [jsonData, setJsonData] = useState("");
  const [csvData, setCsvData] = useState("");
  const [importMethod, setImportMethod] = useState<'json' | 'csv'>('json');

  const handleJsonImport = async () => {
    try {
      const products = JSON.parse(jsonData);
      
      if (!Array.isArray(products)) {
        throw new Error("JSON data must be an array of products");
      }

      // Validate and transform products
      const validProducts = products.map((product, index) => {
        if (!product.name) {
          throw new Error(`Product at index ${index} is missing required 'name' field`);
        }

        return {
          name: product.name,
          description: product.description || null,
          price: product.price ? parseFloat(product.price) : null,
          sku: product.sku || null,
          category: product.category || null,
          brand: product.brand || null,
          images: Array.isArray(product.images) ? product.images : [],
          metadata: product.metadata || {},
          status: 'active',
        };
      });

      // Insert products into database
      const { error } = await supabase
        .from('inventory')
        .insert(validProducts);

      if (error) throw error;

      return validProducts.length;
    } catch (error: any) {
      throw new Error(`JSON Import Error: ${error.message}`);
    }
  };

  const handleCsvImport = async () => {
    try {
      const lines = csvData.trim().split('\n');
      
      if (lines.length < 2) {
        throw new Error("CSV must have at least a header row and one data row");
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const products = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const product: any = { status: 'active', images: [], metadata: {} };

        headers.forEach((header, index) => {
          const value = values[index] || null;
          
          switch (header) {
            case 'name':
              product.name = value;
              break;
            case 'description':
              product.description = value;
              break;
            case 'price':
              product.price = value ? parseFloat(value) : null;
              break;
            case 'sku':
              product.sku = value;
              break;
            case 'category':
              product.category = value;
              break;
            case 'brand':
              product.brand = value;
              break;
            case 'images':
              product.images = value ? value.split(';').map((url: string) => url.trim()) : [];
              break;
            default:
              product.metadata[header] = value;
          }
        });

        if (!product.name) {
          throw new Error(`Row ${i + 1} is missing required 'name' field`);
        }

        products.push(product);
      }

      // Insert products into database
      const { error } = await supabase
        .from('inventory')
        .insert(products);

      if (error) throw error;

      return products.length;
    } catch (error: any) {
      throw new Error(`CSV Import Error: ${error.message}`);
    }
  };

  const handleImport = async () => {
    if (importMethod === 'json' && !jsonData.trim()) {
      toast({
        title: "Error",
        description: "Please enter JSON data to import.",
        variant: "destructive",
      });
      return;
    }

    if (importMethod === 'csv' && !csvData.trim()) {
      toast({
        title: "Error",
        description: "Please enter CSV data to import.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const count = importMethod === 'json' ? await handleJsonImport() : await handleCsvImport();
      
      onProductsImported(count);
      setJsonData("");
      setCsvData("");
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const jsonExample = `[
  {
    "name": "Premium Headphones",
    "description": "High-quality wireless headphones",
    "price": 199.99,
    "sku": "HP001",
    "category": "Electronics",
    "brand": "AudioTech",
    "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
  }
]`;

  const csvExample = `name,description,price,sku,category,brand,images
Premium Headphones,High-quality wireless headphones,199.99,HP001,Electronics,AudioTech,https://example.com/image1.jpg;https://example.com/image2.jpg
Smart Watch,Fitness tracking smartwatch,299.99,SW001,Electronics,TechWear,https://example.com/watch.jpg`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Import Products</span>
          </DialogTitle>
          <DialogDescription>
            Import multiple products from JSON or CSV data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Import Method Selection */}
          <div className="flex space-x-4">
            <Button
              type="button"
              variant={importMethod === 'json' ? 'default' : 'outline'}
              onClick={() => setImportMethod('json')}
              className="flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>JSON Import</span>
            </Button>
            <Button
              type="button"
              variant={importMethod === 'csv' ? 'default' : 'outline'}
              onClick={() => setImportMethod('csv')}
              className="flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>CSV Import</span>
            </Button>
          </div>

          {importMethod === 'json' ? (
            <div className="space-y-2">
              <Label htmlFor="json-data">JSON Data</Label>
              <Textarea
                id="json-data"
                value={jsonData}
                onChange={(e) => setJsonData(e.target.value)}
                placeholder="Paste your JSON data here..."
                rows={12}
                className="font-mono text-sm"
              />
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>JSON Format Example:</strong>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {jsonExample}
                  </pre>
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="csv-data">CSV Data</Label>
              <Textarea
                id="csv-data"
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                placeholder="Paste your CSV data here..."
                rows={12}
                className="font-mono text-sm"
              />
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>CSV Format Example:</strong>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {csvExample}
                  </pre>
                  <p className="mt-2 text-xs">
                    Separate multiple image URLs with semicolons (;)
                  </p>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={loading}>
            {loading ? "Importing..." : "Import Products"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
