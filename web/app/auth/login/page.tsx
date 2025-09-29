"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { Mail, Lock, ArrowLeft, Sparkles, Github } from "lucide-react";
import { auth } from "@/lib/firebase";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import { Card } from "@/components/ui/Card";


const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export default function LoginPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      // Redirect happens automatically via useEffect
    } catch (error: unknown) {
      console.error("Login error:", error);
      const errorMessage = error instanceof Error ? error.message : "Login failed. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      console.error("Google login error:", error);
      const errorMessage = error instanceof Error ? error.message : "Google login failed. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      await signInWithPopup(auth, githubProvider);
    } catch (error: unknown) {
      console.error("GitHub login error:", error);
      const errorMessage = error instanceof Error ? error.message : "GitHub login failed. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-darker via-dark to-dark-lighter flex items-center justify-center">
        <motion.div 
          className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-darker via-dark to-dark-lighter overflow-hidden">
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-20 left-10 w-20 h-20 bg-brand-primary/20 rounded-full blur-xl"
          animate={{ y: [-20, 20, -20], x: [-10, 10, -10] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-20 right-20 w-32 h-32 bg-accent-purple/20 rounded-full blur-xl"
          animate={{ y: [20, -20, 20], x: [10, -10, 10] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      
      <div className="relative z-10 min-h-screen flex">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
          <motion.div 
            className="max-w-md text-center"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div 
              className="mb-8"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <div className="w-20 h-20 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-12 h-12 text-white" />
              </div>
            </motion.div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Welcome Back to
              <span className="bg-gradient-to-r from-brand-light to-accent-purple bg-clip-text text-transparent block">
                Inspira-Grid
              </span>
            </h1>
            <p className="text-text-tertiary text-lg">
              Continue your journey of building amazing projects with talented creators.
            </p>
            <div className="mt-8 space-y-4">
              <div className="flex items-center text-text-tertiary">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse" />
                <span>247 creators online now</span>
              </div>
              <div className="flex items-center text-text-tertiary">
                <div className="w-2 h-2 bg-brand-primary rounded-full mr-3 animate-pulse" />
                <span>1,247 active projects</span>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Right side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
          <motion.div 
            className="w-full max-w-md"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Back to home link */}
            <motion.div 
              className="mb-8"
              whileHover={{ x: -5 }}
            >
              <Link 
                href="/" 
                className="inline-flex items-center text-text-tertiary hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </motion.div>
            
            {/* Mobile header */}
            <div className="lg:hidden text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
              <p className="text-text-tertiary">Sign in to continue building</p>
            </div>

            {/* Form */}
            <Card className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Sign In</h2>
                <p className="text-text-tertiary">Welcome back! Please sign in to continue</p>
              </div>
              {error && (
                <motion.div 
                  className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="text-red-400 text-sm">{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleEmailLogin} className="space-y-6">
                <div className="space-y-6">
                  <Input
                    type="email"
                    label="Email Address"
                    leftIcon={<Mail className="w-5 h-5" />}
                    value={formData.email}
                    onChange={handleInputChange}
                    name="email"
                    placeholder="Enter your email address"
                    required
                    loading={isLoading}
                    error={error && error.includes('email') ? 'Please enter a valid email address' : undefined}
                    hint="We'll never share your email with anyone"
                  />
                  
                  <Input
                    type="password"
                    label="Password"
                    leftIcon={<Lock className="w-5 h-5" />}
                    value={formData.password}
                    onChange={handleInputChange}
                    name="password"
                    placeholder="Enter your password"
                    required
                    loading={isLoading}
                    showPasswordToggle={true}
                    error={error && error.includes('password') ? 'Please check your password' : undefined}
                    hint="Must be at least 8 characters long"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Checkbox
                    label="Remember me for 30 days"
                    description="Keep me signed in on this device"
                  />
                  <Link href="/auth/forgot-password" className="text-brand-primary hover:text-brand-light transition-colors text-sm font-medium">
                    Forgot password?
                  </Link>
                </div>

                <Button 
                  type="submit" 
                  loading={isLoading} 
                  className="w-full" 
                  size="lg"
                >
                  Sign In
                </Button>
              </form>

              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dark-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-dark-card text-text-tertiary">Or continue with</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <Button
                    variant="ghost"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={handleGithubLogin}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Github className="w-5 h-5 mr-2" />
                    GitHub
                  </Button>
                </div>
              </div>

              <div className="mt-8 text-center">
                <p className="text-text-tertiary">
                  Don&apos;t have an account?{" "}
                  <Link href="/auth/register" className="text-brand-light hover:text-brand-primary transition-colors font-medium">
                    Sign up here
                  </Link>
                </p>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
