import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const StorageExport = () => {
  const [exporting, setExporting] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [prefixes, setPrefixes] = useState<Record<string, string>>({});

  const exportBucket = async (bucket: string) => {
    setExporting(bucket);
    try {
      const token = prompt(`Enter admin export token for ${bucket}:`);
      if (!token) {
        toast.error("Export cancelled");
        setExporting(null);
        return;
      }

      const prefix = prefixes[bucket] || "";
      const chunked = !prefix; // auto-chunk when no prefix provided
      const maxFolders = 6; // process 6 top-level folders per chunk

      toast.info(
        `Starting export of ${bucket}${prefix ? `/${prefix}` : ""}${chunked ? " (auto-chunked)" : ""}...`
      );

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      let part = 1;
      let cursor = 0;
      let totalFiles = 0;
      let downloadedAny = false;

      do {
        const response = await fetch(`${supabaseUrl}/functions/v1/storage-export-zip`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": token,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ bucket, prefix, ...(chunked ? { maxFolders, cursor } : {}) }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Export failed on part ${part}`);
        }

        // Read continuation headers BEFORE consuming the body
        const hasMore = response.headers.get("X-Export-Has-More") === "true";
        const nextOffset = parseInt(response.headers.get("X-Export-Next-Offset") || "0", 10);

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${bucket}${prefix ? `-${(prefix as string).split('/').join('_')}` : ""}${chunked ? `-part-${String(part).padStart(3, "0")}` : ""}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        downloadedAny = true;
        totalFiles += 1; // we don't know exact file count here, just track parts
        toast.success(`Downloaded ${chunked ? `part ${part}` : `export`} for ${bucket}`);

        if (chunked && hasMore) {
          part += 1;
          cursor = Number.isFinite(nextOffset) ? nextOffset : 0;
          toast.message(`Continuing export... (${part - 1} part${part - 1 > 1 ? "s" : ""} done)`);
        } else {
          break;
        }
      } while (true);

      if (!downloadedAny) {
        throw new Error("No files were downloaded");
      }

      setCompleted([...completed, bucket]);
      toast.success(`${bucket} export completed${chunked ? ` in ${part} part${part > 1 ? "s" : ""}` : ""}!`);
    } catch (error: any) {
      console.error(`Error exporting ${bucket}:`, error);
      toast.error(`Failed to export ${bucket}: ${error.message}`);
    } finally {
      setExporting(null);
    }
  };

  const buckets = [
    { name: "product-images", description: "All product images (public)" },
    { name: "payment-receipts", description: "Payment receipt uploads (private)" },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Storage Export</h1>
        <p className="text-muted-foreground">
          Export storage buckets as ZIP files for migration. This is a temporary feature for moving data to your new backend.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {buckets.map((bucket) => {
          const isExporting = exporting === bucket.name;
          const isCompleted = completed.includes(bucket.name);

          return (
            <Card key={bucket.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {bucket.name}
                  {isCompleted && <CheckCircle className="h-5 w-5 text-green-500" />}
                </CardTitle>
                <CardDescription>{bucket.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Input
                    placeholder="Optional prefix (e.g. product-id folder)"
                    value={prefixes[bucket.name] || ""}
                    onChange={(e) => setPrefixes((p) => ({ ...p, [bucket.name]: e.target.value }))}
                    disabled={isExporting}
                  />
                  <Button
                    onClick={() => exportBucket(bucket.name)}
                    disabled={isExporting}
                    className="w-full"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : isCompleted ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Re-export
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Export ZIP
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
            <AlertCircle className="h-5 w-5" />
            Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• You'll need to enter the admin export token for each bucket</p>
          <p>• Large buckets may take several minutes to export</p>
          <p>• Keep the downloaded ZIP files safe - you'll need them for Phase B</p>
          <p>• After migration is complete, this feature will be removed</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StorageExport;
