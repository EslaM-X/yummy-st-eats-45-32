import React, { useState, useEffect } from 'react'; 
import { useNavigate } from 'react-router-dom'; 
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import { useLanguage } from '@/contexts/LanguageContext'; 
import { supabase } from "@/integrations/supabase/client"; 
import Header from '@/components/Header'; 
import Footer from '@/components/Footer'; 
import LoginForm from '@/components/auth/LoginForm'; 
import RegisterForm from '@/components/auth/RegisterForm'; 

const AuthPage: React.FC = () => { 
  const [activeTab, setActiveTab] = useState<string>("login"); 
  const navigate = useNavigate(); 
  const { language } = useLanguage(); 
  const [session, setSession] = useState<any>(null); 
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // التحقق من وجود جلسة تسجيل دخول نشطة 
  useEffect(() => { 
    // التحقق من جلسة تسجيل الدخول الحالية 
    const checkSession = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase.auth.getSession(); 
        setSession(data.session); 
        
        // إذا كان المستخدم مسجّل الدخول بالفعل، توجيهه إلى الصفحة الرئيسية 
        if (data.session) { 
          navigate('/'); 
        }
      } catch (error) {
        console.error('خطأ في التحقق من الجلسة:', error);
      } finally {
        setIsLoading(false);
      }
    }; 
    
    // الاستماع إلى تغييرات حالة المصادقة 
    const { data: { subscription } } = supabase.auth.onAuthStateChange( 
      (event, session) => { 
        setSession(session); 
        if (session) { 
          navigate('/'); 
        } 
      } 
    ); 
    
    checkSession(); 
    
    // إلغاء الاشتراك عند تفكيك المكون 
    return () => { 
      subscription.unsubscribe(); 
    }; 
  }, [navigate]); 

  // التبديل إلى تسجيل الدخول بعد التسجيل الناجح
  const handleRegistrationSuccess = () => {
    setActiveTab("login");
  };

  return ( 
    <div className="flex flex-col min-h-screen"> 
      <Header /> 
      <main className="flex-grow flex items-center justify-center py-10 px-4 bg-gray-50 dark:bg-gray-900"> 
        {isLoading ? (
          <div className="text-center">
            <p>{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
          </div>
        ) : (
          <Card className="w-full max-w-md"> 
            <CardHeader> 
              <CardTitle className="text-2xl text-center font-bold"> 
                {language === 'ar' ? 'الدخول إلى ST🍕 Eat' : 'Sign in to ST🍕 Eat'} 
              </CardTitle> 
              <CardDescription className="text-center"> 
                {language === 'ar' 
                  ? 'سجّل دخولك أو أنشئ حسابًا جديدًا للاستمتاع بخدماتنا' 
                  : 'Enter your credentials or create a new account'} 
              </CardDescription> 
            </CardHeader> 
            <CardContent> 
              <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full"> 
                <TabsList className="grid w-full grid-cols-2 mb-6"> 
                  <TabsTrigger value="login"> 
                    {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'} 
                  </TabsTrigger> 
                  <TabsTrigger value="register"> 
                    {language === 'ar' ? 'حساب جديد' : 'Register'} 
                  </TabsTrigger> 
                </TabsList> 
                
                <TabsContent value="login"> 
                  <LoginForm onSuccess={() => navigate('/')} /> 
                </TabsContent> 
                
                <TabsContent value="register"> 
                  <RegisterForm onSuccess={handleRegistrationSuccess} /> 
                </TabsContent> 
              </Tabs> 
            </CardContent> 
            <CardFooter className="flex justify-center"> 
              <p className="text-sm text-gray-500 dark:text-gray-400"> 
                {language === 'ar' 
                  ? 'بالتسجيل، أنت توافق على شروط الاستخدام وسياسة الخصوصية' 
                  : 'By signing up, you agree to our Terms and Privacy Policy'} 
              </p> 
            </CardFooter> 
          </Card>
        )}
      </main> 
      <Footer /> 
    </div> 
  ); 
}; 

export default AuthPage;
