
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle } from "lucide-react";
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
              <TableHead className="text-white">✅</TableHead>
              <TableHead className="text-white">Variable Name</TableHead>
              <TableHead className="text-white">Column A (Feed Value)</TableHead>
              <TableHead className="text-white">Column B (OpenAI Suggested - Editable)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templateVariables.map((variable) => {
              const varData = productVariables[variable];
              return (
                <TableRow key={variable} className={varData?.checked ? "bg-green-50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={varData?.checked || false}
                      onCheckedChange={(checked) => 
                        onUpdateProductVariable(variable, 'checked', !!checked)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatVariableName(variable)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {varData?.extracted || "-"}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={varData?.aiSuggested || ""}
                      onChange={(e) => onUpdateProductVariable(variable, 'aiSuggested', e.target.value)}
                      placeholder="Enter value..."
                      className="min-w-[200px]"
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
