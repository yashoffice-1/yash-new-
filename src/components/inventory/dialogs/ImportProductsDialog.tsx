import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, AlertCircle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/ui/use-toast";

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
  const [importMethod, setImportMethod] = useState<'json' | 'csv' | 'file'>('json');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  const detectDelimiter = (csvContent: string): string => {
    const firstLine = csvContent.split('\n')[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    
    console.log(`Delimiter detection - Commas: ${commaCount}, Semicolons: ${semicolonCount}`);
    
    // Return the delimiter with more occurrences
    return semicolonCount > commaCount ? ';' : ',';
  };

  const parseCSVLine = (line: string, delimiter: string = ','): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last field
    result.push(current.trim());
    return result;
  };

  const mapGoogleShoppingFields = (headers: string[], values: string[]) => {
    const product: any = { status: 'active', images: [], metadata: {} };

    console.log('Mapping headers:', headers);
    console.log('Mapping values:', values);

    headers.forEach((header, index) => {
      const value = values[index] ? values[index].trim() : '';
      const lowerHeader = header.toLowerCase().trim();
      
      console.log(`Processing header: "${lowerHeader}" with value: "${value}"`);
      
      // Map Google Shopping fields to our schema
      switch (lowerHeader) {
        case 'title':
        case 'name':
          product.name = value;
          console.log(`Set name to: ${value}`);
          break;
        case 'description':
          product.description = value || null;
          break;
        case 'price':
        case 'sale price':
          if (value && !isNaN(parseFloat(value.replace(/[^\d.-]/g, '')))) {
            product.price = parseFloat(value.replace(/[^\d.-]/g, ''));
          }
          break;
        case 'id':
        case 'sku':
        case 'mpn':
          product.sku = value || null;
          break;
        case 'product type':
        case 'google product category':
          product.category = value || null;
          break;
        case 'brand':
          product.brand = value || null;
          break;
        case 'image link':
        case 'image_link':
          if (value) {
            product.images = [value];
          }
          break;
        case 'additional image link':
        case 'additional_image_link':
          if (value && product.images.length > 0) {
            // Split multiple additional images by semicolon or pipe
            const additionalImages = value.split(/[;|]/).map((url: string) => url.trim()).filter((url: string) => url !== '');
            product.images = [...product.images, ...additionalImages];
          }
          break;
        case 'images':
          if (value) {
            // Split by semicolon and filter out empty strings
            product.images = value.split(';').map((url: string) => url.trim()).filter((url: string) => url !== '');
          }
          break;
        default:
          // Add other fields to metadata for reference
          if (value) {
            product.metadata[header] = value;
          }
      }
    });

    console.log('Final mapped product:', product);
    return product;
  };

  const handleJsonImport = async () => {
    try {
      console.log('Starting JSON import...');
      const products = JSON.parse(jsonData);
      
      if (!Array.isArray(products)) {
        throw new Error("JSON data must be an array of products");
      }

      console.log(`Parsed ${products.length} products from JSON`);

      // Validate and transform products
      const validProducts = products.map((product, index) => {
        if (!product.name && !product.title) {
          throw new Error(`Product at index ${index} is missing required 'name' or 'title' field`);
        }

        return {
          name: product.name || product.title,
          description: product.description || null,
          price: product.price ? parseFloat(product.price) : null,
          sku: product.sku || product.id || null,
          category: product.category || product.product_type || null,
          brand: product.brand || null,
          images: Array.isArray(product.images) ? product.images : 
                 product.image_link ? [product.image_link] : [],
          metadata: product.metadata || {},
          status: 'active',
        };
      });

      console.log('Validated products:', validProducts);

      // Insert products into database
      const { error } = await supabase
        .from('inventory')
        .insert(validProducts);

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

      return validProducts.length;
    } catch (error: any) {
      console.error('JSON Import Error:', error);
      throw new Error(`JSON Import Error: ${error.message}`);
    }
  };

  const handleCsvImport = async (csvContent: string) => {
    try {
      console.log('Starting CSV import...');
      console.log('CSV content preview:', csvContent.substring(0, 500));
      
      // Detect delimiter
      const delimiter = detectDelimiter(csvContent);
      console.log(`Using delimiter: "${delimiter}"`);
      
      const lines = csvContent.trim().split('\n').filter(line => line.trim() !== '');
      console.log(`Found ${lines.length} lines in CSV`);
      
      if (lines.length < 2) {
        throw new Error("CSV must have at least a header row and one data row");
      }

      const headers = parseCSVLine(lines[0], delimiter).map(h => h.trim());
      console.log('Parsed headers:', headers);
      
      const products = [];

      // Check if required fields exist (flexible for Google Shopping feeds)
      const hasName = headers.some(h => ['name', 'title'].includes(h.toLowerCase()));
      if (!hasName) {
        throw new Error("CSV must contain a 'name' or 'title' column");
      }

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = parseCSVLine(lines[i], delimiter);
          console.log(`Processing row ${i + 1}:`, values);

          // Use the Google Shopping field mapper
          const product = mapGoogleShoppingFields(headers, values);

          if (!product.name || product.name === '') {
            console.warn(`Row ${i + 1} is missing required name/title field or it is empty`);
            continue; // Skip this row instead of throwing error
          }

          console.log(`Successfully processed product for row ${i + 1}:`, product);
          products.push(product);
        } catch (rowError: any) {
          console.error(`Error processing row ${i + 1}:`, rowError);
          throw new Error(`Error in row ${i + 1}: ${rowError.message}`);
        }
      }

      if (products.length === 0) {
        throw new Error("No valid products found in CSV. Please check that your CSV has the required 'name' or 'title' column with data.");
      }

      console.log(`Prepared ${products.length} products for database insertion`);

      // Insert products into database
      const { data, error } = await supabase
        .from('inventory')
        .insert(products)
        .select();

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

      console.log('Successfully inserted products:', data);
      return products.length;
    } catch (error: any) {
      console.error('CSV Import Error:', error);
      setDebugInfo(`CSV Import Debug Info:
Headers found: ${error.headers || 'Not available'}
Error: ${error.message}
Stack: ${error.stack || 'Not available'}`);
      throw new Error(`CSV Import Error: ${error.message}`);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      
      // Read file content
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        console.log('File uploaded, content length:', content.length);
        setCsvData(content);
      };
      reader.onerror = (e) => {
        console.error('File reading error:', e);
        toast({
          title: "File Reading Error",
          description: "Failed to read the CSV file. Please try again.",
          variant: "destructive",
        });
      };
      reader.readAsText(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid CSV file.",
        variant: "destructive",
      });
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

    if ((importMethod === 'csv' || importMethod === 'file') && !csvData.trim()) {
      toast({
        title: "Error",
        description: "Please enter CSV data or upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setDebugInfo(""); // Clear previous debug info

    try {
      console.log(`Starting ${importMethod} import process...`);
      const count = importMethod === 'json' ? await handleJsonImport() : await handleCsvImport(csvData);
      
      console.log(`Import completed successfully. Imported ${count} products.`);
      
      onProductsImported(count);
      setJsonData("");
      setCsvData("");
      setCsvFile(null);
      setDebugInfo("");
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${count} products.`,
      });
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

  const googleShoppingExample = `title,id,price,brand,description,image link,additional image link,product type
Premium Headphones,HP001,199.99,AudioTech,High-quality wireless headphones,https://example.com/image1.jpg,https://example.com/image2.jpg,Electronics > Audio
Smart Watch,SW001,299.99,TechWear,Fitness tracking smartwatch,https://example.com/watch.jpg,,Electronics > Wearables`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Import Products</span>
          </DialogTitle>
          <DialogDescription>
            Import multiple products from JSON, CSV data, or upload a CSV file. Supports Google Shopping feeds and custom formats. Automatically detects comma (,) or semicolon (;) delimited files.
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
              <span>CSV Text</span>
            </Button>
            <Button
              type="button"
              variant={importMethod === 'file' ? 'default' : 'outline'}
              onClick={() => setImportMethod('file')}
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>CSV File</span>
            </Button>
          </div>

          {/* Google Shopping Feed Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Multiple Formats Supported:</strong> This importer automatically detects comma (,) or semicolon (;) delimited CSV files and maps Google Shopping feed columns like 'title', 'image link', 'additional image link', 'product type', and others to the appropriate inventory fields.
            </AlertDescription>
          </Alert>

          {/* Debug Info Display */}
          {debugInfo && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Debug Information:</strong>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                  {debugInfo}
                </pre>
              </AlertDescription>
            </Alert>
          )}

          {importMethod === 'json' && (
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
          )}

          {importMethod === 'csv' && (
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
                  <strong>CSV Format Examples:</strong>
                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="text-xs font-medium">Standard Format (Comma-delimited):</p>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {csvExample}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-medium">Google Shopping Feed Format (Semicolon-delimited):</p>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {googleShoppingExample.replace(/,/g, ';')}
                      </pre>
                    </div>
                  </div>
                  <p className="mt-2 text-xs">
                    • Supports both comma (,) and semicolon (;) delimited files<br/>
                    • Separate multiple image URLs with semicolons (;)<br/>
                    • Required: 'name' or 'title' column<br/>
                    • Values with delimiters should be enclosed in quotes<br/>
                    • Automatically detects and maps Google Shopping feed columns
                  </p>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {importMethod === 'file' && (
            <div className="space-y-2">
              <Label htmlFor="csv-file">Upload CSV File</Label>
              <input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {csvFile && (
                <p className="text-sm text-green-600">
                  File selected: {csvFile.name}
                </p>
              )}
              {csvData && (
                <div className="mt-4">
                  <Label>File Preview:</Label>
                  <Textarea
                    value={csvData.substring(0, 500) + (csvData.length > 500 ? '...' : '')}
                    readOnly
                    rows={8}
                    className="font-mono text-xs bg-gray-50"
                  />
                </div>
              )}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>CSV File Requirements:</strong>
                  <p className="mt-2 text-xs">
                    • First row must contain column headers<br/>
                    • Required: 'name' or 'title' column<br/>
                    • Supports both comma (,) and semicolon (;) delimited files<br/>
                    • Supported columns: name, title, description, price, sku, id, category, product_type, brand, images, image_link, additional_image_link<br/>
                    • Separate multiple image URLs with semicolons (;)<br/>
                    • Google Shopping feed formats are automatically detected and mapped
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
