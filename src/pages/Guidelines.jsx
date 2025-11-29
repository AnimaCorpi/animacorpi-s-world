import React, { useState, useEffect } from "react";
import { SiteSettings } from "@/entities/SiteSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function Guidelines() {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGuidelines();
  }, []);

  const loadGuidelines = async () => {
    try {
      const settings = await SiteSettings.filter({ page: "guidelines" });
      if (settings.length > 0) {
        setContent(settings[0].content || getDefaultGuidelines());
      } else {
        setContent(getDefaultGuidelines());
      }
    } catch (error) {
      console.error("Error loading guidelines:", error);
      setContent(getDefaultGuidelines());
    }
    setIsLoading(false);
  };

  const getDefaultGuidelines = () => {
    return `# Community Guidelines

## Welcome to Our Creative Community
These guidelines help ensure Anamaria's World remains a welcoming, creative, and respectful space for everyone.

## Be Respectful
- Treat all members with kindness and respect
- No harassment, bullying, or personal attacks
- Respect different opinions and perspectives
- Use inclusive language

## Content Standards
- Keep content appropriate for the platform
- NSFW content must be properly tagged and is restricted to 18+ users
- No spam, excessive self-promotion, or off-topic posts
- Original content is encouraged; properly credit others' work

## Forum Etiquette
- Stay on topic in discussions
- Use descriptive titles for your threads
- Search before posting to avoid duplicates
- Constructive criticism is welcome; destructive criticism is not

## Creative Sharing
- Share your genuine creative work
- Provide context and stories behind your creations
- Engage meaningfully with others' work
- Ask permission before featuring others' work

## Privacy and Safety
- Don't share personal information (yours or others')
- Report suspicious or inappropriate behavior
- Respect others' privacy and boundaries
- Keep conversations public when possible

## Age-Appropriate Content
- Remember that users as young as 13 may be present
- Clearly mark mature content
- Keep general discussions family-friendly
- NSFW content is for adults only

## Consequences
Violations may result in:
- Content removal
- Temporary suspension
- Permanent account termination
- Reporting to relevant authorities if necessary

## Reporting Issues
If you see content that violates these guidelines:
- Use the report feature
- Contact administrators directly
- Provide specific details about the violation

## Questions?
Contact the admin team if you need clarification on any guidelines.

Remember: This is a creative community built on mutual respect and shared passion for art, stories, and meaningful connections.

Last updated: ${new Date().toLocaleDateString()}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading guidelines...</p>
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
              <Users className="w-6 h-6" />
              <span>Community Guidelines</span>
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