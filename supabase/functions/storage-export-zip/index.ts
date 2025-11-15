import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

interface ExportRequest {
  bucket: string;
  prefix?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin token
    const adminToken = req.headers.get("x-admin-token");
    const expectedToken = Deno.env.get("STORAGE_EXPORT_TOKEN");
    
    if (!adminToken || adminToken !== expectedToken) {
      console.error("Unauthorized: Invalid or missing admin token");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { bucket, prefix = "" }: ExportRequest = await req.json();
    
    if (!bucket) {
      return new Response(
        JSON.stringify({ error: "Bucket name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting export for bucket: ${bucket}, prefix: ${prefix || '(root)'}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const zip = new JSZip();
    let fileCount = 0;
    let totalSize = 0;

    // Recursive function to process all files in a path
    async function processPath(currentPrefix: string) {
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const { data: objects, error: listError } = await supabase.storage
          .from(bucket)
          .list(currentPrefix, {
            limit,
            offset,
            sortBy: { column: "name", order: "asc" },
          });

        if (listError) {
          console.error(`Error listing ${currentPrefix}:`, listError);
          throw new Error(`Failed to list objects: ${listError.message}`);
        }

        if (!objects || objects.length === 0) {
          hasMore = false;
          break;
        }

        console.log(`Processing ${objects.length} objects in ${currentPrefix || '(root)'} (offset: ${offset})`);

        // Process each object
        for (const obj of objects) {
          const fullPath = currentPrefix ? `${currentPrefix}/${obj.name}` : obj.name;
          
          // If it's a folder (id is null), recursively process it
          if (obj.id === null) {
            console.log(`Entering folder: ${fullPath}`);
            await processPath(fullPath);
            continue;
          }

          // It's a file, download and add to zip
          try {
            const { data: fileData, error: downloadError } = await supabase.storage
              .from(bucket)
              .download(fullPath);

            if (downloadError) {
              console.error(`Error downloading ${fullPath}:`, downloadError);
              continue;
            }

            if (fileData) {
              const arrayBuffer = await fileData.arrayBuffer();
              zip.file(fullPath, arrayBuffer);
              fileCount++;
              totalSize += arrayBuffer.byteLength;
              
              if (fileCount % 10 === 0) {
                console.log(`Added ${fileCount} files to zip (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
              }
            }
          } catch (error) {
            console.error(`Failed to process ${fullPath}:`, error);
          }
        }

        offset += limit;
        
        if (objects.length < limit) {
          hasMore = false;
        }
      }
    }

    // Start processing from the root or specified prefix
    await processPath(prefix);

    if (fileCount === 0) {
      console.log("No files found in bucket");
      return new Response(
        JSON.stringify({ error: "No files found in bucket" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating zip with ${fileCount} files (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);

    // Generate zip
    const zipBlob = await zip.generateAsync({
      type: "arraybuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    console.log(`Zip generated: ${(zipBlob.byteLength / 1024 / 1024).toFixed(2)} MB`);

    return new Response(zipBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${bucket}-export.zip"`,
        "Content-Length": zipBlob.byteLength.toString(),
      },
    });
  } catch (error: any) {
    console.error("Error in storage-export-zip:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
