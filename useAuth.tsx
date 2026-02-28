import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { api, USE_LOCAL_API } from "@/lib/api";

type AppRole = "admin" | "radiologist" | "technician" | "reception" | "billing";

interface LocalUser {
  id: string;
  email: string;
  fullName: string;
  role: AppRole | null;
}

interface AuthContextType {
  user: User | LocalUser | null;
  session: Session | null;
  loading: boolean;
  userRole: AppRole | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isLocalMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | LocalUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<AppRole | null>(null);

  useEffect(() => {
    if (USE_LOCAL_API) {
      // Local API mode
      initLocalAuth();
    } else {
      // Supabase mode
      initSupabaseAuth();
    }
  }, []);

  const initLocalAuth = async () => {
    const token = api.getToken();
    if (token) {
      try {
        const { user: userData } = await api.getCurrentUser();
        setUser({
          id: userData.id,
          email: userData.email,
          fullName: userData.fullName,
          role: userData.role
        });
        setUserRole(userData.role as AppRole);
      } catch (error) {
        api.setToken(null);
      }
    }
    setLoading(false);
  };

  const initSupabaseAuth = () => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  };

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (!error && data) {
      setUserRole(data.role as AppRole);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (USE_LOCAL_API) {
      try {
        const { user: userData } = await api.signIn(email, password);
        setUser({
          id: userData.id,
          email: userData.email,
          fullName: userData.fullName,
          role: userData.role
        });
        setUserRole(userData.role as AppRole);
        return { error: null };
      } catch (error: any) {
        return { error: new Error(error.message || "فشل تسجيل الدخول") };
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (USE_LOCAL_API) {
      try {
        const { user: userData } = await api.signUp(email, password, fullName);
        setUser({
          id: userData.id,
          email: userData.email,
          fullName: userData.fullName,
          role: null
        });
        return { error: null };
      } catch (error: any) {
        return { error: new Error(error.message || "فشل إنشاء الحساب") };
      }
    } else {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: fullName }
        }
      });
      return { error };
    }
  };

  const signOut = async () => {
    if (USE_LOCAL_API) {
      await api.signOut();
      setUser(null);
      setUserRole(null);
    } else {
      await supabase.auth.signOut();
      setUserRole(null);
    }
  };

  const hasRole = (role: AppRole) => userRole === role;

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      userRole, 
      signIn, 
      signUp, 
      signOut, 
      hasRole,
      isLocalMode: USE_LOCAL_API 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
