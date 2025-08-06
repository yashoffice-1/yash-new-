
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/forms/button";
import { Badge } from "@/components/ui/data_display/badge";
import { Progress } from "@/components/ui/data_display/progress";
import { CreditCard, Download, Eye } from "lucide-react";

export function BillingSection() {
  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your subscription and usage details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Professional Plan</h3>
              <p className="text-sm text-gray-600">$49/month • Billed monthly</p>
            </div>
            <Badge variant="default">Active</Badge>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Video generations used</span>
              <span>45 / 100</span>
            </div>
            <Progress value={45} className="w-full" />
          </div>

          <div className="flex space-x-2">
            <Button className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <span>Upgrade Plan</span>
            </Button>
            <Button variant="outline">
              Manage Subscription
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>Manage your payment information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4 p-4 border rounded-lg">
            <CreditCard className="h-8 w-8 text-gray-400" />
            <div className="flex-1">
              <p className="font-medium">•••• •••• •••• 4242</p>
              <p className="text-sm text-gray-600">Expires 12/25</p>
            </div>
            <Button variant="outline" size="sm">Update</Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>Download your past invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { date: "Dec 1, 2024", amount: "$49.00", status: "Paid" },
              { date: "Nov 1, 2024", amount: "$49.00", status: "Paid" },
              { date: "Oct 1, 2024", amount: "$49.00", status: "Paid" }
            ].map((invoice, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{invoice.date}</p>
                  <p className="text-sm text-gray-600">{invoice.amount}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{invoice.status}</Badge>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
