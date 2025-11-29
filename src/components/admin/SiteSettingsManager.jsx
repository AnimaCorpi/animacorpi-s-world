import React, { useState, useEffect } from "react";
import { SiteSettings } from "@/entities/SiteSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Home, BookOpen, MessageSquare, Phone, Link, Instagram, Globe, FileText, Users } from "lucide-react";

export default function SiteSettingsManager() {
  const [settings, setSettings] = useState({
    home: { tagline: "", message: "" },
    stories: { tagline: "", message: "" },
    forum: { tagline: "", message: "" },
    contact: { tagline: "", message: "" },
    thoughts: { tagline: "", message: "" },
    artwork: { tagline: "", message: "" },
    photography: { tagline: "", message: "" },
    footer: { footer_text: "", instagram_url: "", linkedin_url: "" },
    site_name: { site_name: "" },
    terms: { content: "" },
    guidelines: { content: "" }
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const pages = ["home", "stories", "forum", "contact", "thoughts", "artwork", "photography", "footer", "site_name", "terms", "guidelines"];
      const settingsData = {};
      
      for (const page of pages) {
        const pageSettings = await SiteSettings.filter({ page });
        if (page === "footer") {
          settingsData[page] = pageSettings[0] || { 
            footer_text: "© 2024 Anamaria's World. A space for creativity and connection.",
            instagram_url: "",
            linkedin_url: ""
          };
        } else if (page === "site_name") {
          settingsData[page] = pageSettings[0] || { site_name: "Anamaria's World" };
        } else if (page === "terms" || page === "guidelines") {
          settingsData[page] = pageSettings[0] || { content: "" };
        } else {
          settingsData[page] = pageSettings[0] || { 
            tagline: getDefaultTagline(page), 
            message: getDefaultMessage(page) 
          };
        }
      }
      
      setSettings(settingsData);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const getDefaultTagline = (page) => {
    const defaults = {
      home: "Welcome to My Creative World",
      stories: "Stories from the Heart",
      forum: "Connect & Share",
      contact: "Let's Connect",
      thoughts: "Thoughts & Reflections",
      artwork: "Creative Expressions",
      photography: "Captured Moments"
    };
    return defaults[page] || "";
  };

  const getDefaultMessage = (page) => {
    const defaults = {
      home: "Explore thoughts, artwork, photography, and stories from my heart.",
      stories: "Dive into immersive stories and adventures crafted with love.",
      forum: "Join our creative community and share your thoughts.",
      contact: "I'd love to hear from you. Send me a message anytime!",
      thoughts: "Personal reflections and musings from my creative journey.",
      artwork: "Explore my artistic creations and visual storytelling.",
      photography: "Visual stories through the lens of my camera."
    };
    return defaults[page] || "";
  };

  const handleSave = async (page) => {
    setIsLoading(true);
    try {
      const pageSettings = settings[page];
      const existingSettings = await SiteSettings.filter({ page });
      
      let settingsData = { page };
      
      if (page === "footer") {
        settingsData = {
          ...settingsData,
          footer_text: pageSettings.footer_text,
          instagram_url: pageSettings.instagram_url,
          linkedin_url: pageSettings.linkedin_url
        };
      } else if (page === "site_name") {
        settingsData = {
          ...settingsData,
          site_name: pageSettings.site_name
        };
      } else if (page === "terms" || page === "guidelines") {
        settingsData = {
          ...settingsData,
          content: pageSettings.content
        };
      } else {
        settingsData = {
          ...settingsData,
          tagline: pageSettings.tagline,
          message: pageSettings.message
        };
      }

      if (existingSettings.length > 0) {
        await SiteSettings.update(existingSettings[0].id, settingsData);
      } else {
        await SiteSettings.create(settingsData);
      }
      
      // Reload to get the updated data
      loadSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
    }
    setIsLoading(false);
  };

  const updatePageSetting = (page, field, value) => {
    setSettings(prev => ({
      ...prev,
      [page]: {
        ...prev[page],
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Site Settings</h3>
        <p className="text-sm text-gray-600">Customize all aspects of your site</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
          <TabsTrigger value="legal">Legal</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>Site Identity</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="site-name">Site Name</Label>
                  <Input
                    id="site-name"
                    value={settings.site_name.site_name}
                    onChange={(e) => updatePageSetting('site_name', 'site_name', e.target.value)}
                    placeholder="Your Site Name"
                  />
                </div>
                
                <Button 
                  onClick={() => handleSave('site_name')}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? "Saving..." : "Save Site Name"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Link className="w-5 h-5" />
                  <span>Footer Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="footer-text">Footer Text</Label>
                  <Input
                    id="footer-text"
                    value={settings.footer.footer_text}
                    onChange={(e) => updatePageSetting('footer', 'footer_text', e.target.value)}
                    placeholder="© 2024 Your Site. Description text."
                  />
                </div>
                
                <div>
                  <Label htmlFor="instagram-url">Instagram URL</Label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="instagram-url"
                      value={settings.footer.instagram_url}
                      onChange={(e) => updatePageSetting('footer', 'instagram_url', e.target.value)}
                      placeholder="https://instagram.com/your_username"
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="linkedin-url">LinkedIn URL</Label>
                  <div className="relative">
                    <Link className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="linkedin-url"
                      value={settings.footer.linkedin_url}
                      onChange={(e) => updatePageSetting('footer', 'linkedin_url', e.target.value)}
                      placeholder="https://linkedin.com/in/your_profile"
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={() => handleSave('footer')}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? "Saving..." : "Save Footer Settings"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pages">
          <div className="space-y-6">
            {["home", "contact"].map((page) => (
              <Card key={page}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 capitalize">
                    <Home className="w-5 h-5" />
                    <span>{page} Page Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor={`${page}-tagline`}>Tagline</Label>
                    <Input
                      id={`${page}-tagline`}
                      value={settings[page].tagline}
                      onChange={(e) => updatePageSetting(page, 'tagline', e.target.value)}
                      placeholder={`Enter ${page} page tagline`}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`${page}-message`}>Welcome Message</Label>
                    <Textarea
                      id={`${page}-message`}
                      value={settings[page].message}
                      onChange={(e) => updatePageSetting(page, 'message', e.target.value)}
                      placeholder={`Enter ${page} page welcome message`}
                      rows={4}
                    />
                  </div>
                  
                  <Button 
                    onClick={() => handleSave(page)}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isLoading ? "Saving..." : `Save ${page.charAt(0).toUpperCase() + page.slice(1)} Settings`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="content">
          <div className="space-y-6">
            {["thoughts", "artwork", "photography", "stories"].map((page) => (
              <Card key={page}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 capitalize">
                    <BookOpen className="w-5 h-5" />
                    <span>{page} Page Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor={`${page}-tagline`}>Tagline</Label>
                    <Input
                      id={`${page}-tagline`}
                      value={settings[page].tagline}
                      onChange={(e) => updatePageSetting(page, 'tagline', e.target.value)}
                      placeholder={`Enter ${page} page tagline`}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`${page}-message`}>Welcome Message</Label>
                    <Textarea
                      id={`${page}-message`}
                      value={settings[page].message}
                      onChange={(e) => updatePageSetting(page, 'message', e.target.value)}
                      placeholder={`Enter ${page} page welcome message`}
                      rows={4}
                    />
                  </div>
                  
                  <Button 
                    onClick={() => handleSave(page)}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isLoading ? "Saving..." : `Save ${page.charAt(0).toUpperCase() + page.slice(1)} Settings`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="community">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>Forum Page Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="forum-tagline">Tagline</Label>
                <Input
                  id="forum-tagline"
                  value={settings.forum.tagline}
                  onChange={(e) => updatePageSetting('forum', 'tagline', e.target.value)}
                  placeholder="Enter forum page tagline"
                />
              </div>
              
              <div>
                <Label htmlFor="forum-message">Welcome Message</Label>
                <Textarea
                  id="forum-message"
                  value={settings.forum.message}
                  onChange={(e) => updatePageSetting('forum', 'message', e.target.value)}
                  placeholder="Enter forum page welcome message"
                  rows={4}
                />
              </div>
              
              <Button 
                onClick={() => handleSave('forum')}
                disabled={isLoading}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? "Saving..." : "Save Forum Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Terms of Service</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="terms-content">Terms Content</Label>
                  <Textarea
                    id="terms-content"
                    value={settings.terms.content}
                    onChange={(e) => updatePageSetting('terms', 'content', e.target.value)}
                    placeholder="Enter your terms of service content (supports basic HTML and markdown)"
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You can use # for headings, ## for subheadings, and basic HTML formatting
                  </p>
                </div>
                
                <Button 
                  onClick={() => handleSave('terms')}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? "Saving..." : "Save Terms of Service"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Community Guidelines</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="guidelines-content">Guidelines Content</Label>
                  <Textarea
                    id="guidelines-content"
                    value={settings.guidelines.content}
                    onChange={(e) => updatePageSetting('guidelines', 'content', e.target.value)}
                    placeholder="Enter your community guidelines content (supports basic HTML and markdown)"
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You can use # for headings, ## for subheadings, and basic HTML formatting
                  </p>
                </div>
                
                <Button 
                  onClick={() => handleSave('guidelines')}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? "Saving..." : "Save Community Guidelines"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}