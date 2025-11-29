import React, { useState, useEffect } from "react";
import { SiteSettings } from "@/entities/SiteSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function Terms() {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTerms();
  }, []);

  const loadTerms = async () => {
    try {
      const settings = await SiteSettings.filter({ page: "terms" });
      if (settings.length > 0) {
        setContent(settings[0].content || getDefaultTerms());
      } else {
        setContent(getDefaultTerms());
      }
    } catch (error) {
      console.error("Error loading terms:", error);
      setContent(getDefaultTerms());
    }
    setIsLoading(false);
  };

  const getDefaultTerms = () => {
    return `# Terms of Service

## Acceptance of Terms
By accessing and using Anamaria's World, you accept and agree to be bound by the terms and provision of this agreement.

## Use License
Permission is granted to temporarily access Anamaria's World for personal, non-commercial transitory viewing only.

## User Content
You are responsible for any content you post. Content must not be offensive, illegal, or infringe on others' rights.

## Privacy
Your privacy is important to us. We collect minimal information necessary to provide our services.

## Age Requirements
Users must be at least 13 years old to create an account. NSFW content is restricted to users 18 and older.

## Prohibited Uses
You may not use our site for any unlawful purpose or to solicit others to perform unlawful acts.

## Content Ownership
You retain ownership of content you create. By posting, you grant us license to display and share your content on the platform.

## Termination
We may terminate or suspend your account at any time for violations of these terms.

## Changes to Terms
We reserve the right to modify these terms at any time. Continued use constitutes acceptance of modified terms.

## Contact Information
For questions about these terms, please contact us through the site.

Last updated: ${new Date().toLocaleDateString()}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading terms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-6 h-6" />
              <span>Terms of Service</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br>').replace(/# /g, '<h1>').replace(/## /g, '<h2>') }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}