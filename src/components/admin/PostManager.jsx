import React, { useState, useEffect } from "react";
import { Post } from "@/entities/Post";
import { UploadFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Save, X, Upload, Clock } from "lucide-react";
import { format } from "date-fns";
import ReactQuill from 'react-quill';

export default function PostManager({ onStatsUpdate }) {
  const [posts, setPosts] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "",
    excerpt: "",
    tags: "",
    image_url: "",
    published: true,
    publish_at: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const data = await Post.list("-created_date");
      setPosts(data);
    } catch (error) {
      console.error("Error loading posts:", error);
    }
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      category: post.category,
      excerpt: post.excerpt || "",
      tags: post.tags ? post.tags.join(", ") : "",
      image_url: post.image_url || "",
      published: post.published,
      publish_at: post.publish_at ? post.publish_at.substring(0, 16) : ""
    });
    setIsEditing(true);
  };

  const handleNew = () => {
    setEditingPost(null);
    setFormData({
      title: "",
      content: "",
      category: "",
      excerpt: "",
      tags: "",
      image_url: "",
      published: true,
      publish_at: ""
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const postData = {
        ...formData,
        tags: formData.tags.split(",").map(tag => tag.trim()).filter(tag => tag),
        publish_at: formData.publish_at ? new Date(formData.publish_at).toISOString() : null
      };

      if (editingPost) {
        await Post.update(editingPost.id, postData);
      } else {
        await Post.create(postData);
      }

      setIsEditing(false);
      loadPosts();
      onStatsUpdate?.();
    } catch (error) {
      console.error("Error saving post:", error);
    }
    setIsLoading(false);
  };

  const handleDelete = async (postId) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    
    try {
      await Post.delete(postId);
      loadPosts();
      onStatsUpdate?.();
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, image_url: file_url }));
    } catch (error) {
      console.error("Error uploading image:", error);
    }
    setUploadingImage(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {editingPost ? "Edit Post" : "Create New Post"}
          </h3>
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>

        <div className="grid gap-6">
          {/* ... other form fields ... */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Post title"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thoughts">Thoughts</SelectItem>
                  <SelectItem value="artwork">Artwork</SelectItem>
                  <SelectItem value="photography">Photography</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
              placeholder="Brief description (optional)"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="content">Content</Label>
            <ReactQuill
              value={formData.content}
              onChange={(content) => setFormData(prev => ({ ...prev, content }))}
              style={{ height: "300px", marginBottom: "50px" }}
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="tag1, tag2, tag3"
            />
          </div>

          <div>
            <Label>Featured Image</Label>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
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
                <img 
                  src={formData.image_url} 
                  alt="Preview" 
                  className="w-16 h-16 object-cover rounded"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <Label htmlFor="publish_at">Publish At (optional)</Label>
              <Input
                id="publish_at"
                type="datetime-local"
                value={formData.publish_at}
                onChange={(e) => setFormData(prev => ({ ...prev, publish_at: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">Leave blank to publish immediately</p>
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="published"
                checked={formData.published}
                onChange={(e) => setFormData(prev => ({ ...prev, published: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="published">Published</Label>
            </div>
          </div>

          <Button onClick={handleSave} disabled={isLoading || !formData.title || !formData.content}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? "Saving..." : "Save Post"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h3 className="text-lg font-semibold">Posts Management</h3>
        <Button onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Button>
      </div>

      <div className="grid gap-4">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-wrap sm:flex-nowrap gap-4 justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start gap-2 mb-2 sm:items-center">
                    <h4 className="font-semibold break-words">{post.title}</h4>
                    <Badge variant={post.published ? "default" : "secondary"} className="shrink-0">
                      {post.published ? "Published" : "Draft"}
                    </Badge>
                    <Badge variant="outline" className="shrink-0">{post.category}</Badge>
                    {post.publish_at && new Date(post.publish_at) > new Date() && (
                      <Badge variant="outline" className="flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        Scheduled for {format(new Date(post.publish_at), "MMM d, h:mm a")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2 break-words">
                    {post.excerpt || post.content.substring(0, 100).replace(/<[^>]*>/g, '') + "..."}
                  </p>
                  <p className="text-xs text-gray-500">
                    Created: {format(new Date(post.created_date), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(post)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(post.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No posts created yet.</p>
        </div>
      )}
    </div>
  );
}