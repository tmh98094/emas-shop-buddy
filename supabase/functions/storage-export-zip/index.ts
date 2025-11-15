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
  maxFolders?: number;
  cursor?: number;
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

    const requestBody: ExportRequest = await req.json();
    const { bucket, prefix = "", maxFolders: bodyMaxFolders, cursor: bodyCursor } = requestBody;
    
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

    // Timing and batching controls
    const startTime = Date.now();
    const TIME_BUDGET_MS = Number(Deno.env.get("STORAGE_EXPORT_TIME_LIMIT_MS") ?? "50000");

    // Parse optional batching options
    const MAX_FOLDERS = Math.max(1, Math.min(50, bodyMaxFolders ?? 6));
    let cursor = Number.isFinite(Number(bodyCursor)) ? Number(bodyCursor) : 0;

    // Helper: Add single file to zip
    async function addFileToZip(fullPath: string) {
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(bucket)
          .download(fullPath);

        if (downloadError) {
          console.error(`Error downloading ${fullPath}:`, downloadError);
          return;
        }

        if (fileData) {
          const arrayBuffer = await fileData.arrayBuffer();
          zip.file(fullPath, arrayBuffer);
          fileCount++;
          totalSize += arrayBuffer.byteLength;

          if (fileCount % 10 === 0) {
            console.log(
              `Added ${fileCount} files to zip (${(totalSize / 1024 / 1024).toFixed(2)} MB)`
            );
          }
        }
      } catch (error) {
        console.error(`Failed to process ${fullPath}:`, error);
      }
    }

    // Recursive function to process all files in a path with time budget
    async function processPath(currentPrefix: string) {
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        if (Date.now() - startTime > TIME_BUDGET_MS) {
          console.log("Time budget reached while processing path, stopping early");
          break;
        }

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

        console.log(
          `Processing ${objects.length} objects in ${currentPrefix || "(root)"} (offset: ${offset})`
        );

        for (const obj of objects) {
          if (Date.now() - startTime > TIME_BUDGET_MS) {
            console.log("Time budget reached during object processing, stopping early");
            hasMore = false;
            break;
          }

          const fullPath = currentPrefix ? `${currentPrefix}/${obj.name}` : obj.name;

          if (obj.id === null) {
            // Folder
            await processPath(fullPath);
          } else {
            // File
            await addFileToZip(fullPath);
          }
        }

        offset += limit;
        if (objects.length < limit) {
          hasMore = false;
        }
      }
    }

    // If a prefix is provided, export that subtree directly (no chunking)
    if (prefix && prefix.length > 0) {
      await processPath(prefix);

      if (fileCount === 0) {
        return new Response(
          JSON.stringify({ error: "No files found in bucket" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(
        `Generating zip with ${fileCount} files (${(totalSize / 1024 / 1024).toFixed(2)} MB)`
      );

      const zipBlob = await zip.generateAsync({
        type: "arraybuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      return new Response(zipBlob, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${bucket}${prefix ? `-${prefix.split('/').join('_')}` : ""}-export.zip"`,
          "Content-Length": zipBlob.byteLength.toString(),
          "X-Export-Has-More": "false",
          "X-Export-Next-Offset": "0",
        },
      });
    }

    // No prefix: Chunk by top-level folders to avoid runtime limits
    let processedFolders = 0;
    let scannedObjects = 0;
    const limit = 100;
    let hasMoreTop = true;

    while (processedFolders < MAX_FOLDERS && hasMoreTop) {
      if (Date.now() - startTime > TIME_BUDGET_MS) {
        console.log("Time budget reached before collecting requested folders");
        break;
      }

      const { data: objects, error: listError } = await supabase.storage
        .from(bucket)
        .list("", {
          limit,
          offset: cursor,
          sortBy: { column: "name", order: "asc" },
        });

      if (listError) {
        console.error("Error listing top-level:", listError);
        throw new Error(`Failed to list objects: ${listError.message}`);
      }

      if (!objects || objects.length === 0) {
        hasMoreTop = false;
        break;
      }

      console.log(`Scanning ${objects.length} top-level objects from offset ${cursor}`);

      // Iterate this slice and collect work
      for (const obj of objects) {
        if (Date.now() - startTime > TIME_BUDGET_MS) {
          console.log("Time budget reached during top-level scan, stopping early");
          break;
        }

        scannedObjects++;
        const fullPath = obj.name; // top-level

        if (obj.id === null) {
          // Folder
          console.log(`Entering folder (batched): ${fullPath}`);
          await processPath(fullPath);
          processedFolders++;

          if (processedFolders >= MAX_FOLDERS) break;
        } else {
          // Top-level file
          await addFileToZip(fullPath);
        }
      }

      cursor += objects.length;

      if (objects.length < limit) {
        hasMoreTop = false;
      }

      if (processedFolders >= MAX_FOLDERS) break;
    }

    // If still no files but there might be more, peek to see if more objects exist
    let hasMore = false;
    if (hasMoreTop) {
      const { data: peek } = await supabase.storage
        .from(bucket)
        .list("", { limit: 1, offset: cursor, sortBy: { column: "name", order: "asc" } });
      hasMore = !!(peek && peek.length > 0);
    }

    // If we found nothing at all, return 404 like before
    if (fileCount === 0) {
      console.log("No files found in current chunk");
      return new Response(
        JSON.stringify({ error: "No files found in bucket" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(
      `Generating zip chunk with ${fileCount} files (${(totalSize / 1024 / 1024).toFixed(2)} MB)`
    );

    const zipBlob = await zip.generateAsync({
      type: "arraybuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    return new Response(zipBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${bucket}-chunk.zip"`,
        "Content-Length": zipBlob.byteLength.toString(),
        "X-Export-Has-More": hasMoreTop ? "true" : "false",
        "X-Export-Next-Offset": String(cursor),
        "X-Export-Processed-Folders": String(processedFolders),
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
