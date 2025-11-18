"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AlertCircle, ArrowLeft } from "lucide-react"

const errorMessages: Record<string, string> = {
  Configuration: "There is a problem with the server configuration. Please contact support.",
  AccessDenied: "Access was denied. You may not have permission to sign in.",
  Verification: "The verification link may have expired or already been used.",
  OAuthSignin: "Error occurred while trying to sign in with OAuth provider.",
  OAuthCallback: "Error occurred while handling the OAuth callback.",
  OAuthCreateAccount: "Could not create OAuth account. The email may already be in use.",
  EmailCreateAccount: "Could not create email account. The email may already be in use.",
  Callback: "Error occurred during the authentication callback.",
  OAuthAccountNotLinked: "This email is already associated with another account. Please sign in using your original method.",
  EmailSignin: "Error sending the verification email. Please try again.",
  CredentialsSignin: "Sign in failed. Please check your credentials and try again.",
  SessionRequired: "Please sign in to access this page.",
  Default: "An unexpected error occurred. Please try again.",
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error") || "Default"

  const errorMessage = errorMessages[error] || errorMessages.Default

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-200px)] py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Authentication Error</CardTitle>
          <CardDescription className="text-center">
            Something went wrong during sign in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {errorMessage}
          </div>
          {error === "OAuthAccountNotLinked" && (
            <p className="mt-4 text-sm text-muted-foreground text-center">
              Try signing in with the same method you used when you first created your account.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button asChild className="w-full">
            <Link href="/auth/signin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            If this problem persists, please{" "}
            <Link href="/contact" className="text-primary hover:underline">
              contact support
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
