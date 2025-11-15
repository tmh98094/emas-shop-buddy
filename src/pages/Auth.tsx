import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect to homepage immediately - guest mode only
  useEffect(() => {
    toast({
      title: "Guest Mode Only",
      description: "Authentication is temporarily unavailable. Please purchase as a guest.",
      variant: "default",
    });
    navigate("/");
  }, [navigate, toast]);

  return null;
}