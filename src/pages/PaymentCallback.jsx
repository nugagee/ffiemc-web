import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { CheckCircle2 } from "lucide-react";

/** Kept for route compatibility; Paystack callback can be wired via Edge Functions later. */
export const PaymentCallback = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 bg-gradient-to-br from-red-50 via-white to-orange-50">
      <Card className="max-w-md w-full border-0 shadow-xl text-center">
        <CardHeader>
          <CheckCircle2 className="h-12 w-12 text-red-600 mx-auto mb-2" />
          <CardTitle>Thank you for giving</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            If you submitted a gift intent, our team will follow up shortly. God
            bless you.
          </p>
          <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
            <Link to="/">Back to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
