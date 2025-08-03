// app/error.tsx
"use client"; // Error components must be Client Components

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
    // TODO: Integrate with a logging service (see step 4)
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Application Error</CardTitle>
          <CardDescription>
            Sorry, something went wrong on our end.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>An unexpected error occurred. Please try again.</p>
          {/* For developers, you might show the error message in a development environment */}
          {process.env.NODE_ENV === "development" && (
            <pre className="mt-4 p-2 bg-muted rounded-md text-xs overflow-auto">
              {error.message}
            </pre>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={() => reset()}>Try again</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
