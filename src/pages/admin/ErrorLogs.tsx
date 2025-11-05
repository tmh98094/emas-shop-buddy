import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ErrorLogs() {
  const [selectedError, setSelectedError] = useState<any>(null);

  const { data: errorLogs, isLoading } = useQuery({
    queryKey: ["error-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("error_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const getRouteColor = (route: string) => {
    if (route?.includes("checkout")) return "destructive";
    if (route?.includes("admin")) return "secondary";
    return "default";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Error Logs</h1>
          <p className="text-muted-foreground mt-1">
            Production errors tracked for debugging white screen issues
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {errorLogs?.length || 0} errors logged
        </Badge>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Error Message</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {errorLogs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No errors logged yet - this is good news!</p>
                </TableCell>
              </TableRow>
            ) : (
              errorLogs?.map((log) => (
                <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedError(log)}>
                  <TableCell className="font-mono text-xs">
                    {format(new Date(log.created_at), "MMM dd, HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRouteColor(log.route)}>
                      {log.route || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {log.error_message}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.user_id ? log.user_id.substring(0, 8) + "..." : "Anonymous"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedError(log)}>
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Error Detail Modal */}
      <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1">Timestamp</h3>
                <p className="text-sm">{selectedError && format(new Date(selectedError.created_at), "PPpp")}</p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-1">Route</h3>
                <Badge variant={getRouteColor(selectedError?.route)}>
                  {selectedError?.route || "Unknown"}
                </Badge>
              </div>

              <div>
                <h3 className="font-semibold mb-1">Error Message</h3>
                <p className="text-sm bg-destructive/10 p-3 rounded border border-destructive/20">
                  {selectedError?.error_message}
                </p>
              </div>

              {selectedError?.stack_trace && (
                <div>
                  <h3 className="font-semibold mb-1">Stack Trace</h3>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap">
                    {selectedError.stack_trace}
                  </pre>
                </div>
              )}

              {selectedError?.user_agent && (
                <div>
                  <h3 className="font-semibold mb-1">User Agent</h3>
                  <p className="text-xs text-muted-foreground">{selectedError.user_agent}</p>
                </div>
              )}

              {selectedError?.metadata && (
                <div>
                  <h3 className="font-semibold mb-1">Additional Info</h3>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedError.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
