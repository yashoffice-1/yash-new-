
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/data_display/table";
import { Input } from "@/components/ui/forms/input";
import { Button } from "@/components/ui/forms/button";
import { CheckCircle, Check } from "lucide-react";
import { ProductVariableState, InventoryItem } from './utils/types';
import { formatVariableName } from './utils/utils';
import { useTheme } from "@/contexts/ThemeContext";

interface ProductVariableTableProps {
  selectedProduct: InventoryItem;
  templateVariables: string[];
  productVariables: Record<string, ProductVariableState>;
  onUpdateProductVariable: (variable: string, field: keyof ProductVariableState, value: string | boolean) => void;
}

export function ProductVariableTable({
  selectedProduct,
  templateVariables,
  productVariables,
  onUpdateProductVariable
}: ProductVariableTableProps) {
  const { theme } = useTheme();
  
  const getCheckedCount = () => {
    return templateVariables.filter(variable => productVariables[variable]?.checked === true).length;
  };

  if (templateVariables.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>Product: {selectedProduct.name}</h3>
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className={`text-sm ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>{getCheckedCount()} / {templateVariables.length} completed</span>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-700">
              <TableHead className="text-white w-24">Status</TableHead>
              <TableHead className="text-white w-48">Variable Name</TableHead>
              <TableHead className="text-white w-1/4">Column A (Feed Value)</TableHead>
              <TableHead className="text-white w-1/3">Column B (OpenAI Suggested - Editable)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templateVariables.map((variable) => {
              const varData = productVariables[variable];
              return (
                <TableRow key={variable} className={varData?.checked ? 
                  theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50' 
                  : ''
                }>
                  <TableCell className="w-24">
                    <Button
                      variant={varData?.checked ? "default" : "outline"}
                      size="sm"
                      onClick={() => onUpdateProductVariable(variable, 'checked', !varData?.checked)}
                      className={`w-20 h-8 text-xs font-medium ${
                        varData?.checked 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'border-2 hover:border-green-500 hover:text-green-600'
                      }`}
                    >
                      {varData?.checked ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Checked
                        </>
                      ) : (
                        'Check'
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium w-48">
                    <div className="break-words text-sm leading-tight">
                      {formatVariableName(variable)}
                    </div>
                  </TableCell>
                  <TableCell className={`text-sm w-1/4 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    <div className={`break-words whitespace-normal text-xs leading-relaxed p-2 rounded min-h-[2rem] max-h-20 overflow-y-auto ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                      {varData?.extracted || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="w-1/3">
                    <textarea
                      value={varData?.aiSuggested || ""}
                      onChange={(e) => onUpdateProductVariable(variable, 'aiSuggested', e.target.value)}
                      placeholder="Enter value..."
                      className={`w-full min-h-[3rem] max-h-24 p-2 text-xs border rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        theme === 'dark' 
                          ? 'border-gray-600 bg-gray-800 text-white' 
                          : 'border-gray-300 bg-white text-gray-900'
                      }`}
                      style={{ 
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        whiteSpace: 'pre-wrap'
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
