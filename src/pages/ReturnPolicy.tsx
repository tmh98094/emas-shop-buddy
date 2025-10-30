import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { T } from "@/components/T";
import { SafeHtmlContent } from "@/components/SafeHtmlContent";

export default function ReturnPolicy() {
  const { data, isLoading } = useQuery({
    queryKey: ["content", "return_policy"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_pages")
        .select("title, content")
        .eq("key", "return_policy")
        .single();
      if (error) throw error;
      return data as { title: string; content: string } | null;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <GoldPriceBanner />
      <Header />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">{data?.title || <T zh="退换政策" en="Return & Exchange Policy" />}</h1>
        <Card>
          <CardContent className="p-8 prose prose-sm max-w-none">
            {isLoading ? (
              <p className="text-muted-foreground"><T zh="加载中…" en="Loading..." /></p>
            ) : data?.content ? (
              <SafeHtmlContent content={data.content} />
            ) : (
              <p className="text-muted-foreground"><T zh="暂无内容。请在后台内容管理中编辑本页。" en="No content. Please edit this page in Admin Content." /></p>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
