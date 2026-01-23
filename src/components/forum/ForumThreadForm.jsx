import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Plus, Upload, Image as ImageIcon, AlertTriangle } from "lucide-react";

export default function ForumThreadForm({ user, canCreateNSFW, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    image_url: "",
    tags: [],
    is_nsfw: false
  });
  const [newTag, setNewTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [nsfwDetected, setNsfwDetected] = useState(false);

  // NSFW detection keywords
  const nsfwKeywords = [
    "nsfw", "not safe for work", "18+", "lewd", "risque", "nude", "nudes", "uncensored", 
    "explicit", "suggestive", "mature", "smut", "xxx", "adult content", "softcore", 
    "hardcore", "porn", "pornography", "sex", "sexual", "sex scene", "fetish", 
    "after dark", "bdsm", "sexy", "thirst trap", "lingerie", "swimsuit", "bikini", 
    "booty", "cleavage", "underboob", "sideboob", "shirtless", "wet look", "cameltoe", 
    "bulge", "posing sexy", "seductive", "provocative", "erotica", "erotic story", 
    "lemon", "lime", "smut fic", "nsfw rp", "roleplay 18+", "dirty talk", "kink", 
    "pwp", "feet", "foot fetish", "bondage", "dom/sub", "dd/lg", "daddy dom/little girl", 
    "age play", "choking", "spanking", "public play", "voyeur", "exhibitionism", 
    "latex", "leather", "furry nsfw", "yiff", "rule34", "boobs", "tits", "nipples", 
    "ass", "butt", "thighs", "twerking", "spread", "pov", "doggystyle", "cowgirl", 
    "missionary", "oral", "cum", "ejaculation", "penetration", "genitals", "vagina", 
    "penis", "cock", "dick", "pussy", "onlyfans", "fansly", "camgirl", "camboy", 
    "webcam", "nudes4sale", "premium snap", "leak", "lewd edit", "nsfw ai", "deepnude", 
    "deepfake", "uncensored version", "nsf", "s3xy", "n@ked", "th1rst", "p0rn", 
    "lewds", "sp1cy", "s3x", "🍑", "🍆", "💦", "🔥", "👅💦"
  ];

  const detectNSFW = (text) => {
    const lowerText = text.toLowerCase();
    return nsfwKeywords.some(keyword => lowerText.includes(keyword));
  };

  const handleContentChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Check for NSFW content
    const allText = `${field === 'title' ? value : formData.title} ${field === 'content' ? value : formData.content} ${formData.tags.join(' ')}`;
    const isNSFW = detectNSFW(allText);
    
    setNsfwDetected(isNSFW);
    if (isNSFW) {
      setFormData(prev => ({ ...prev, is_nsfw: true }));
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      const updatedTags = [...formData.tags, newTag.trim()];
      setFormData(prev => ({ ...prev, tags: updatedTags }));
      
      // Check if new tag contains NSFW content
      const allText = `${formData.title} ${formData.content} ${updatedTags.join(' ')}`;
      const isNSFW = detectNSFW(allText);
      
      setNsfwDetected(isNSFW);
      if (isNSFW) {
        setFormData(prev => ({ ...prev, is_nsfw: true }));
      }
      
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    const updatedTags = formData.tags.filter(tag => tag !== tagToRemove);
    setFormData(prev => ({ ...prev, tags: updatedTags }));
    
    // Recheck NSFW after tag removal
    const allText = `${formData.title} ${formData.content} ${updatedTags.join(' ')}`;
    const isNSFW = detectNSFW(allText);
    setNsfwDetected(isNSFW);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, image_url: file_url }));
    } catch (error) {
      setError("Failed to upload image. Please try again.");
      console.error("Error uploading image:", error);
    }
    setUploadingImage(false);
  };

  const calculateAge = (birthdate) => {
    if (!birthdate) return 0;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (!formData.title.trim() || !formData.content.trim()) {
      setError("Title and content are required.");
      setIsSubmitting(false);
      return;
    }

    if (formData.content.length > 5000) {
      setError("Content must be 5000 characters or less.");
      setIsSubmitting(false);
      return;
    }

    // Check if user can create NSFW content
    if (formData.is_nsfw || nsfwDetected) {
      const userAge = calculateAge(user.birthdate);
      if (user.role !== 'admin' && userAge < 18) {
        setError("You must be 18+ to create NSFW content.");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const threadData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        image_url: formData.image_url || "",
        tags: formData.tags,
        is_nsfw: formData.is_nsfw || nsfwDetected,
        author_id: user.id,
        author_username: user.username
      };

      await base44.entities.ForumThread.create(threadData);
      onSuccess();
    } catch (error) {
      setError("Failed to create thread. Please try again.");
      console.error("Error creating thread:", error);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">Create New Discussion</CardTitle>
              <Button variant="outline" onClick={onCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {nsfwDetected && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    NSFW content detected. This post will be automatically marked as NSFW and restricted to users 18+.
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleContentChange('title', e.target.value)}
                  placeholder="What would you like to discuss?"
                  maxLength={200}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.title.length}/200 characters
                </p>
              </div>

              <div>
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => handleContentChange('content', e.target.value)}
                  placeholder="Share your thoughts..."
                  rows={8}
                  maxLength={5000}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.content.length}/5000 characters
                </p>
              </div>

              <div>
                <Label>Image (Optional)</Label>
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={uploadingImage}
                  />
                  <label htmlFor="image-upload">
                    <Button variant="outline" asChild disabled={uploadingImage}>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingImage ? "Uploading..." : "Upload Image"}
                      </span>
                    </Button>
                  </label>
                  {formData.image_url && (
                    <div className="flex items-center space-x-2">
                      <ImageIcon className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">Image uploaded</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, image_url: "" }))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex items-center space-x-2 mb-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {canCreateNSFW && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_nsfw"
                    checked={formData.is_nsfw || nsfwDetected}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_nsfw: e.target.checked }))}
                    disabled={nsfwDetected}
                  />
                  <Label htmlFor="is_nsfw" className="text-sm">
                    Mark as NSFW (18+ only) {nsfwDetected && "(Auto-detected)"}
                  </Label>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !formData.title.trim() || !formData.content.trim()}
                  className="bg-purple-500 hover:bg-purple-600"
                >
                  {isSubmitting ? "Creating..." : "Create Discussion"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}