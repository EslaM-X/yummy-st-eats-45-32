import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'; 
import { supabase } from '@/integrations/supabase/client'; 
import { Session, User } from '@supabase/supabase-js'; 
import { useToast } from '@/components/ui/use-toast'; 

interface AuthContextType { 
  session: Session | null; 
  user: User | null; 
  signIn: (email: string, password: string) => Promise<{ error: any }>; 
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any, data: any }>; 
  signOut: () => Promise<void>; 
  loading: boolean; 
  isAdmin: boolean; 
  profile: any; 
  refreshProfile: () => Promise<void>; 
  isLoading: boolean; 
} 

const AuthContext = createContext<AuthContextType | undefined>(undefined); 

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => { 
  const [session, setSession] = useState<Session | null>(null); 
  const [user, setUser] = useState<User | null>(null); 
  const [loading, setLoading] = useState(true); 
  const [isAdmin, setIsAdmin] = useState(false); 
  const [profile, setProfile] = useState<any>(null); 
  const [isLoading, setIsLoading] = useState(true); 
  const { toast } = useToast(); 

  useEffect(() => { 
    // Get initial session 
    supabase.auth.getSession().then(({ data: { session } }) => { 
      setSession(session); 
      setUser(session?.user ?? null); 
      if (session?.user) { 
        fetchProfile(session.user.id); 
        checkUserRole(session.user.id); 
      } 
      setLoading(false); 
      setIsLoading(false); 
    }); 

    // Listen for auth changes 
    const { data: { subscription } } = supabase.auth.onAuthStateChange( 
      async (event, session) => { 
        setSession(session); 
        setUser(session?.user ?? null); 
        
        if (session?.user) { 
          fetchProfile(session.user.id); 
          checkUserRole(session.user.id); 
        } 
        
        if (event === "SIGNED_OUT") { 
          setIsAdmin(false); 
          setProfile(null); 
        } 
        
        setLoading(false); 
        setIsLoading(false); 
      } 
    ); 

    return () => { 
      subscription.unsubscribe(); 
    }; 
  }, []); 

  const fetchProfile = async (userId: string) => { 
    try { 
      const { data, error } = await supabase 
        .from('profiles') 
        .select('*') 
        .eq('id', userId) 
        .single(); 
      
      if (error) throw error; 
      
      setProfile(data); 
    } catch (error) { 
      console.error('Error fetching profile:', error); 
    } 
  }; 

  const refreshProfile = async () => { 
    if (!user) return; 
    await fetchProfile(user.id); 
  }; 

  const checkUserRole = async (userId: string | undefined) => { 
    if (!userId) return; 
    
    try { 
      const { data, error } = await supabase 
        .from('profiles') 
        .select('user_type') 
        .eq('id', userId) 
        .single(); 
      
      if (error) throw error; 
      
      setIsAdmin(data?.user_type === 'admin'); 
    } catch (error) { 
      console.error('Error checking user role:', error); 
    } 
  }; 

  const signIn = async (email: string, password: string) => { 
    try { 
      const { error } = await supabase.auth.signInWithPassword({ email, password }); 
      if (error) throw error; 
      return { error: null }; 
    } catch (error: any) { 
      toast({ 
        title: "auth.login_failed", 
        description: error.message, 
        variant: "destructive", 
      }); 
      return { error }; 
    } 
  }; 

  const signUp = async (email: string, password: string, metadata?: any) => { 
    try {
      // التحقق من وجود البريد الإلكتروني أولاً
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking existing user:', checkError);
      }
      
      if (existingUser) {
        toast({
          title: "auth.registration_failed",
          description: "auth.email_already_exists",
          variant: "destructive",
        });
        return { error: { message: "auth.email_already_exists" }, data: null };
      }
      
      // إنشاء المستخدم
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password, 
        options: { 
          data: metadata, 
        }, 
      }); 
      
      if (error) throw error; 
      
      // إنشاء سجل الملف الشخصي
      if (data.user) { 
        try {
          const { error: profileError } = await supabase 
            .from('profiles') 
            .insert({ 
              id: data.user.id, 
              email: email,
              full_name: metadata?.full_name || '',
              user_type: 'user', // تعيين نوع المستخدم افتراضياً
              created_at: new Date().toISOString(),
            }); 
            
          if (profileError) { 
            console.error('Error creating profile:', profileError);
            // إذا فشل إنشاء الملف الشخصي، نحاول إلغاء تسجيل المستخدم
            try {
              await supabase.auth.admin.deleteUser(data.user.id);
            } catch (deleteError) {
              console.error('Error deleting user after profile creation failure:', deleteError);
            }
            throw new Error('auth.profile_creation_failed');
          }
        } catch (profileCreationError: any) {
          throw profileCreationError;
        }
      } 
      
      toast({
        title: "auth.registration_success",
        description: "auth.account_created",
      });
      
      return { error: null, data }; 
    } catch (error: any) { 
      toast({ 
        title: "auth.registration_failed", 
        description: error.message || "auth.unknown_error", 
        variant: "destructive", 
      }); 
      return { error, data: null }; 
    } 
  }; 

  const signOut = async () => { 
    await supabase.auth.signOut(); 
  }; 

  return ( 
    <AuthContext.Provider 
      value={{ 
        session, 
        user, 
        signIn, 
        signUp, 
        signOut, 
        loading, 
        isAdmin, 
        profile, 
        refreshProfile, 
        isLoading, 
      }} 
    > 
      {children} 
    </AuthContext.Provider> 
  ); 
}; 

export const useAuth = () => { 
  const context = useContext(AuthContext); 
  if (context === undefined) { 
    throw new Error('useAuth must be used within an AuthProvider'); 
  } 
  return context; 
}; 
