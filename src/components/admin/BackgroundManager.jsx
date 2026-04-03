import React, { useState, useEffect } from "react";
import { BackgroundImage } from "@/entities/BackgroundImage";
import { UploadFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Save, X, Upload, Image as ImageIcon } from "lucide-react";

export default function BackgroundManager() {
  const [backgrounds, setBackgrounds] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBackground, setEditingBackground] = useState(null);
  const [backgroundForm, setBackgroundForm] = useState({
    name: "",
    image_url: "",
    thumbnail_url: "",
    active: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadBackgrounds();
  }, []);

  const loadBackgrounds = async () => {
    try {
      const data = await BackgroundImage.list("-created_date");
      setBackgrounds(data);
    } catch (error) {
      console.error("Error loading backgrounds:", error);
    }
  };

  const handleEdit = (background) => {
    setEditingBackground(background);
    setBackgroundForm({
      name: background.name,
      image_url: background.image_url,
      thumbnail_url: background.thumbnail_url || "",
      active: background.active
    });
    setIsEditing(true);
  };

  const handleNew = () => {
    setEditingBackground(null);
    setBackgroundForm({
      name: "",
      image_url: "",
      thumbnail_url: "",
      active: true
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (editingBackground) {
        await BackgroundImage.update(editingBackground.id, backgroundForm);
      } else {
        await BackgroundImage.create(backgroundForm);
      }
      setIsEditing(false);
      loadBackgrounds();
    } catch (error) {
      console.error("Error saving background:", error);
    }
    setIsLoading(false);
  };

  const handleDelete = async (backgroundId) => {
    if (!confirm("Are you sure you want to delete this background?")) return;
    
    try {
      await BackgroundImage.delete(backgroundId);
      loadBackgrounds();
    } catch (error) {
      console.error("Error deleting background:", error);
    }
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await UploadFile({ file });
      setBackgroundForm(prev => ({ ...prev, [field]: file_url }));
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
            {editingBackground ? "Edit Background" : "Add New Background"}
          </h3>
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <Label htmlFor="bg-name">Background Name</Label>
              <Input
                id="bg-name"
                value={backgroundForm.name}
                onChange={(e) => setBackgroundForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Beautiful sunset..."
              />
            </div>

            <div>
              <Label>Main Background Image</Label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'image_url')}
                  className="hidden"
                  id="main-image-upload"
                />
                <label htmlFor="main-image-upload">
                  <Button variant="outline" asChild disabled={uploadingImage}>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingImage ? "Uploading..." : "Upload Main Image"}
                    </span>
                  </Button>
                </label>
                {backgroundForm.image_url && (
                  <img 
                    src={backgroundForm.image_url} 
                    alt="Main preview" 
                    className="w-20 h-12 object-cover rounded"
                  />
                )}
              </div>
            </div>

            <div>
              <Label>Thumbnail Image (Optional)</Label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'thumbnail_url')}
                  className="hidden"
                  id="thumb-image-upload"
                />
                <label htmlFor="thumb-image-upload">
                  <Button variant="outline" asChild disabled={uploadingImage}>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingImage ? "Uploading..." : "Upload Thumbnail"}
                    </span>
                  </Button>
                </label>
                {backgroundForm.thumbnail_url && (
                  <img 
                    src={backgroundForm.thumbnail_url} 
                    alt="Thumbnail preview" 
                    className="w-16 h-10 object-cover rounded"
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                 If no thumbnail is provided, the main image will be used
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="bg-active"
                checked={backgroundForm.active}
                onChange={(e) => setBackgroundForm(prev => ({ ...prev, active: e.target.checked }))}
              />
              <Label htmlFor="bg-active">Active (visible to users)</Label>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={isLoading || !backgroundForm.name || !backgroundForm.image_url}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : "Save Background"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Background Images</h3>
          <p className="text-sm text-muted-foreground">Manage background images that users can choose from</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Background
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {backgrounds.map((background) => (
          <Card key={background.id} className="overflow-hidden">
            <div className="aspect-video overflow-hidden">
              <img 
                src={background.thumbnail_url || background.image_url} 
                alt={background.name}
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold">{background.name}</h4>
                  <Badge variant={background.active ? "default" : "secondary"} className="mt-1">
                    {background.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(background)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(background.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {backgrounds.length === 0 && (
        <div className="text-center py-12">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Background Images</h3>
          <p className="text-muted-foreground mb-4">Add some beautiful backgrounds for users to choose from</p>
          <Button onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Background
          </Button>
        </div>
      )}
    </div>
  );
}