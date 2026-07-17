import { useAuthContext } from "@/context/AuthContext";

// Clean shorthand hook for any component
export function useAuth() {
  return useAuthContext();
}