import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Footer } from "@/components/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { T } from "@/components/T";

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["content", "faq"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_pages")
        .select("title, content")
        .eq("key", "faq")
        .single();
      if (error) throw error;
      return data as { title: string; content: string } | null;
    },
  });

  const filteredHtml = data?.content || "";

  return (
    <div className="min-h-screen bg-background">
      <GoldPriceBanner />
      <Header />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{data?.title || <T zh="常见问题" en="Frequently Asked Questions" />}</h1>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索常见问题…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-center">加载中…</p>
        ) : filteredHtml ? (
          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: filteredHtml }} />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground"><T zh="暂无内容。请在后台内容管理中编辑本页。" en="No content. Please edit this page in Admin Content." /></p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
