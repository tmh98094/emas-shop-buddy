import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface ContentPage {
  id: string;
  key: string;
  title: string;
  content: string;
}

const contentKeys = [
  { key: "privacy_policy", label: "Privacy Policy" },
  { key: "terms_of_service", label: "Terms of Service" },
  { key: "shipping_policy", label: "Shipping Policy" },
  { key: "return_policy", label: "Return Policy" },
  { key: "faq", label: "FAQ" },
  { key: "shop_page_intro", label: "Shop Page Intro" },
  { key: "categories_page_intro", label: "Categories Page Intro" },
  { key: "order_confirmation_message", label: "Order Confirmation Message" },
];

export default function ContentManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [contents, setContents] = useState<Record<string, ContentPage>>({});

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("content_pages")
        .select("*");

      if (error) throw error;

      const contentMap: Record<string, ContentPage> = {};
      data?.forEach((page) => {
        contentMap[page.key] = page;
      });
      setContents(contentMap);
    } catch (error: any) {
      toast({
        title: "Error loading content",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      const content = contents[key];
      if (!content) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("content_pages")
        .update({
          title: content.title,
          content: content.content,
          updated_by: user.id,
        })
        .eq("key", key);

      if (error) throw error;

      toast({
        title: "Content saved",
        description: "Your changes have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving content",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const handleContentChange = (key: string, field: "title" | "content", value: string) => {
    setContents((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Content Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage all text content across your website, including policies, FAQs, and notifications.
        </p>
      </div>

      <Tabs defaultValue="privacy_policy" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          {contentKeys.map((item) => (
            <TabsTrigger key={item.key} value={item.key}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {contentKeys.map((item) => (
          <TabsContent key={item.key} value={item.key}>
            <Card>
              <CardHeader>
                <CardTitle>{item.label}</CardTitle>
                <CardDescription>
                  Edit the content for {item.label.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`title-${item.key}`}>Title</Label>
                  <Input
                    id={`title-${item.key}`}
                    value={contents[item.key]?.title || ""}
                    onChange={(e) =>
                      handleContentChange(item.key, "title", e.target.value)
                    }
                    placeholder="Page title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`content-${item.key}`}>Content</Label>
                  <ReactQuill
                    theme="snow"
                    value={contents[item.key]?.content || ""}
                    onChange={(value) =>
                      handleContentChange(item.key, "content", value)
                    }
                    modules={{
                      toolbar: [
                        [{ header: [1, 2, 3, false] }],
                        ["bold", "italic", "underline", "strike"],
                        [{ list: "ordered" }, { list: "bullet" }],
                        ["link"],
                        ["clean"],
                      ],
                    }}
                    className="bg-background"
                  />
                </div>

                <Button
                  onClick={() => handleSave(item.key)}
                  disabled={saving === item.key}
                  className="w-full sm:w-auto"
                >
                  {saving === item.key ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
