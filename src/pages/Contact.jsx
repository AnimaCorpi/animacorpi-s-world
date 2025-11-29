import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { SiteSettings } from "@/entities/SiteSettings";
import { SendEmail } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Send, Heart } from "lucide-react";

export default function Contact() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsData] = await Promise.all([
        SiteSettings.filter({ page: "contact" })
      ]);
      
      setSettings(settingsData[0] || {
        tagline: "Let's Connect",
        message: "I'd love to hear from you. Send me a message anytime!"
      });

      try {
        const userData = await User.me();
        setUser(userData);
        setFormData(prev => ({
          ...prev,
          name: userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
          email: userData.email || userData.notification_email || ""
        }));
      } catch (error) {
        setUser(null);
      }
    } catch (error) {
      console.error("Error loading contact data:", error);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSending(true);
    setMessage("");
    setError("");

    if (!formData.name || !formData.email || !formData.message) {
      setError("All fields are required.");
      setIsSending(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address.");
      setIsSending(false);
      return;
    }

    try {
      // Get all admin users to send the contact message to
      const admins = await User.filter({ role: 'admin' });
      
      if (admins.length === 0) {
        setError("Unable to send message. Please try again later.");
        setIsSending(false);
        return;
      }

      // Send email to all admins
      for (const admin of admins) {
        await SendEmail({
          to: admin.email,
          subject: `Contact Form Message from ${formData.name}`,
          body: `New contact form submission:

Name: ${formData.name}
Email: ${formData.email}

Message:
${formData.message}

---
Sent from the contact form on ${window.location.origin}`
        });
      }

      setMessage("Thank you for your message! I'll get back to you within 36 hours.");
      setFormData(prev => ({ ...prev, message: "" }));
      
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message. Please try again.");
    }
    setIsSending(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="pastel-gradient py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-6 leading-tight">
            {settings?.tagline || "Let's Connect"}
          </h1>
          <p className="text-xl md:text-2xl text-gray-600">
            {settings?.message || "I'd love to hear from you. Send me a message anytime!"}
          </p>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex items-center justify-center space-x-2">
                <Mail className="w-6 h-6 text-purple-500" />
                <span>Send a Message</span>
              </CardTitle>
              <p className="text-gray-600 mt-2">
                I'll do my best to reply within 36 hours. Your thoughts and feedback mean the world to me!
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {message && (
                  <Alert className="border-green-200 bg-green-50">
                    <Heart className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      {message}
                    </AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div>
                  <Label htmlFor="name">Your Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                    disabled={isSending}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Your Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email address"
                    disabled={isSending}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    I'll use this email to respond to you directly.
                  </p>
                </div>

                <div>
                  <Label htmlFor="message">Your Message *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Share your thoughts, ask a question, or just say hello..."
                    rows={8}
                    disabled={isSending}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-purple-500 hover:bg-purple-600" 
                  disabled={isSending}
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Sending Message...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center mt-8">
            <p className="text-gray-600">
              Thank you for taking the time to reach out. Every message brings joy to my day! 💜
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}