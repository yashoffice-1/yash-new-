
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle, Check } from "lucide-react";
import { ProductVariableState, InventoryItem } from './types';
import { formatVariableName } from './utils';

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
  const getCheckedCount = () => {
    return templateVariables.filter(variable => productVariables[variable]?.checked === true).length;
  };

  if (templateVariables.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Product: {selectedProduct.name}</h3>
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm">{getCheckedCount()} / {templateVariables.length} completed</span>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-700">
              <TableHead className="text-white w-24">Status</TableHead>
              <TableHead className="text-white w-48">Variable Name</TableHead>
              <TableHead className="text-white">Column A (Feed Value)</TableHead>
              <TableHead className="text-white">Column B (OpenAI Suggested - Editable)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templateVariables.map((variable) => {
              const varData = productVariables[variable];
              return (
                <TableRow key={variable} className={varData?.checked ? "bg-green-50" : ""}>
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
                    <div className="break-words">
                      {formatVariableName(variable)}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-xs">
                    <div className="break-words whitespace-normal">
                      {varData?.extracted || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <Input
                      value={varData?.aiSuggested || ""}
                      onChange={(e) => onUpdateProductVariable(variable, 'aiSuggested', e.target.value)}
                      placeholder="Enter value..."
                      className="w-full break-words"
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
