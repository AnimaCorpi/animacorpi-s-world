import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserPlus, Calendar, User as UserIcon } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function Registration() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    birthdate: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        if (userData.username && userData.birthdate) {
          window.location.href = createPageUrl("Home");
          return;
        }
        
        setFormData({
          first_name: userData.first_name || userData.full_name?.split(' ')[0] || "",
          last_name: userData.last_name || userData.full_name?.split(' ').slice(1).join(' ') || "",
          username: userData.username || "",
          birthdate: userData.birthdate || "",
        });
      } catch (e) {
        window.location.href = createPageUrl("Home");
      }
    };
    fetchUser();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    if (!formData.first_name || !formData.username || !formData.birthdate) {
      setError("First Name, Username, and Birthdate are required.");
      setIsSaving(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setError("Username can only contain letters, numbers, and underscores.");
      setIsSaving(false);
      return;
    }
    
    const today = new Date();
    const birthDate = new Date(formData.birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    if (age < 13) {
      setError("You must be at least 13 years old to register.");
      setIsSaving(false);
      return;
    }

    try {
      // *** THIS IS THE FIX ***
      // REMOVED: The illegal User.filter() call that was causing the 401 error.
      // We will now rely on the backend to handle the uniqueness check.

      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        username: formData.username.toLowerCase(),
        birthdate: formData.birthdate,
      };

      await base44.auth.updateMe(updateData);
      
      // Send welcome email only if this is first time completing registration
      if (!user.username) {
        try {
          await base44.integrations.Core.SendEmail({
            to: user.email,
            subject: "Welcome to Anamaria's World!",
            body: `Hi ${formData.first_name},

Welcome to my little world! I'm so glad you're here. Feel free to explore, enjoy the stories, art, and photography, and don't hesitate to send me a message anytime—you're always welcome. I'll do my best to reply within 36 hours. Thanks so much for being part of this creative journey. If you enjoy what you see, I hope you'll share it with a friend!

Warmly,
Anamaria

---
Your username: ${formData.username}
Visit your account: ${window.location.origin}`
          });

          const admins = await base44.entities.User.filter({ role: 'admin' });
          for (const admin of admins) {
            await base44.entities.Notification.create({
              user_id: admin.id,
              type: "admin_message",
              title: "New User Registration",
              message: `${formData.first_name} ${formData.last_name || ''} (@${formData.username.toLowerCase()}) has joined. Age: ${age}`,
              related_id: user.id,
              action_url: `/Admin`
            });
          }
        } catch (notificationError) {
          console.error("Error sending notifications, but registration was successful:", notificationError);
        }
      }

      window.location.href = createPageUrl("Home");

    } catch (err) {
      console.error("Registration failed:", err);
      // Check for specific duplicate username error message from the server
      if (err.message && err.message.toLowerCase().includes('duplicate')) {
          setError("Username already taken. Please choose another.");
      } else {
          setError("An error occurred while saving your profile. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
          <p className="text-gray-600">Just a few more details to get you started.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input 
                id="first_name" 
                required 
                value={formData.first_name} 
                onChange={(e) => setFormData(p => ({...p, first_name: e.target.value}))} 
                placeholder="Enter your first name"
                disabled={isSaving}
              />
            </div>
            
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input 
                id="last_name" 
                value={formData.last_name} 
                onChange={(e) => setFormData(p => ({...p, last_name: e.target.value}))} 
                placeholder="Enter your last name (optional)"
                disabled={isSaving}
              />
            </div>

            <div>
              <Label htmlFor="username">Username *</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  id="username" 
                  required 
                  className="pl-10" 
                  value={formData.username} 
                  onChange={(e) => setFormData(p => ({...p, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '')}))} 
                  placeholder="Choose a unique username"
                  disabled={isSaving}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Only letters, numbers, and underscores allowed.</p>
            </div>

            <div>
              <Label htmlFor="birthdate">Birthdate *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  id="birthdate" 
                  type="date" 
                  required 
                  className="pl-10" 
                  value={formData.birthdate} 
                  onChange={(e) => setFormData(p => ({...p, birthdate: e.target.value}))} 
                  disabled={isSaving}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">You must be at least 13 years old.</p>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-purple-500 hover:bg-purple-600" 
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                "Complete Registration"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}