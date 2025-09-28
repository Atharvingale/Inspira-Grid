"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  Rocket, 
  Users, 
  Code, 
  MessageCircle, 
  Trophy, 
  ArrowRight,
  Github,
  Zap,
  Heart,
  Star
} from "lucide-react";
import { auth } from "@/lib/firebase";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function HomePage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center">
          <motion.div 
            className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <motion.p 
            className="text-text-tertiary text-lg"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Loading your experience...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-darker via-dark to-dark-surface text-text-primary overflow-hidden">
      {/* Enhanced floating elements background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-20 left-10 w-24 h-24 bg-brand-primary/15 rounded-full blur-2xl"
          animate={{ y: [-20, 20, -20], x: [-10, 10, -10] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute top-40 right-20 w-36 h-36 bg-brand-secondary/15 rounded-full blur-2xl"
          animate={{ y: [20, -20, 20], x: [10, -10, 10] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-20 left-1/4 w-20 h-20 bg-accent-cyan/15 rounded-full blur-2xl"
          animate={{ y: [-15, 15, -15] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute top-1/2 right-1/4 w-28 h-28 bg-accent-purple/10 rounded-full blur-3xl"
          animate={{ rotate: [0, 360], scale: [1, 1.1, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Header */}
      <motion.header 
        className="relative z-10 backdrop-blur-sm bg-white/5 border-b border-white/10"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <nav className="flex justify-between items-center">
            <motion.div 
              className="flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-10 h-10 bg-gradient-brand rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
                Inspira-Grid
              </span>
            </motion.div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Link href="/auth/login">Login</Link>
              </Button>
              <Button variant="primary" size="sm">
                <Link href="/auth/register">Get Started</Link>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </nav>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative z-10 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-text-primary via-text-primary to-text-secondary bg-clip-text text-transparent">
                  Build Epic
                </span>
                <br />
                <span className="bg-gradient-to-r from-brand-light to-brand-secondary bg-clip-text text-transparent">
                  Projects
                </span>
                <br />
                <span className="bg-gradient-to-r from-text-primary via-text-primary to-text-secondary bg-clip-text text-transparent">
                  Together
                </span>
              </h1>
              
              <motion.p 
                className="text-lg sm:text-xl text-text-secondary mb-6 sm:mb-8 leading-relaxed max-w-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Join the most vibrant community of young creators, developers, and innovators. 
                Find your dream team and build the next big thing.
              </motion.p>
              
              <motion.div 
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Button variant="primary" size="lg" className="group">
                  <Link href="/auth/register" className="flex items-center">
                    <Rocket className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                    Start Building Now
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button variant="secondary" size="lg">
                  <Link href="/auth/login" className="flex items-center">
                    <Heart className="w-5 h-5 mr-2" />
                    Join Community
                  </Link>
                </Button>
              </motion.div>
              
              <motion.div 
                className="flex items-center space-x-6 text-sm text-text-tertiary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                  100% Free Forever
                </div>
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 mr-2" />
                  No Credit Card Required
                </div>
              </motion.div>
            </motion.div>
            
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="relative">
                {/* Main card */}
                <motion.div 
                  className="relative z-10"
                  whileHover={{ y: -10 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Card blur className="p-8">
                    <div className="grid grid-cols-3 gap-6">
                      <motion.div 
                        className="text-center p-6 bg-gradient-brand rounded-2xl text-white"
                        whileHover={{ scale: 1.05, rotate: 2 }}
                      >
                        <Users className="w-8 h-8 mx-auto mb-3" />
                        <div className="font-semibold">Team Up</div>
                        <div className="text-xs opacity-75 mt-1">Find your squad</div>
                      </motion.div>
                      <motion.div 
                        className="text-center p-6 bg-gradient-success rounded-2xl text-white"
                        whileHover={{ scale: 1.05, rotate: -2 }}
                        transition={{ delay: 0.1 }}
                      >
                        <Code className="w-8 h-8 mx-auto mb-3" />
                        <div className="font-semibold">Build</div>
                        <div className="text-xs opacity-75 mt-1">Create magic</div>
                      </motion.div>
                      <motion.div 
                        className="text-center p-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl text-white"
                        whileHover={{ scale: 1.05, rotate: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Trophy className="w-8 h-8 mx-auto mb-3" />
                        <div className="font-semibold">Succeed</div>
                        <div className="text-xs opacity-75 mt-1">Ship & celebrate</div>
                      </motion.div>
                    </div>
                  </Card>
                </motion.div>
                
                {/* Floating stats */}
                <motion.div 
                  className="absolute -top-6 -right-6 z-20"
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-white text-sm font-medium">Community Online</span>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="absolute -bottom-6 -left-6 z-20"
                  animate={{ y: [10, -10, 10] }}
                  transition={{ duration: 5, repeat: Infinity }}
                >
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                    <div className="flex items-center space-x-2">
                      <Github className="w-4 h-4 text-white" />
                      <span className="text-white text-sm font-medium">Repos Connected</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
                Everything You Need to
              </span>
              <br />
              <span className="bg-gradient-to-r from-brand-light to-brand-secondary bg-clip-text text-transparent">
                Create Magic ✨
              </span>
            </h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto">
              Built for the next generation of creators. Simple, powerful, and absolutely free.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: <Sparkles className="w-8 h-8" />,
                title: "Project Discovery",
                description: "Find epic projects that match your vibe. Filter by tech stack, difficulty, and team size.",
                gradient: "from-brand-primary to-cyan-500",
                delay: 0.1
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Smart Team Matching",
                description: "Our AI connects you with teammates who complement your skills and share your passion.",
                gradient: "from-green-500 to-emerald-500",
                delay: 0.2
              },
              {
                icon: <Github className="w-8 h-8" />,
                title: "GitHub Integration",
                description: "Seamlessly connect your repos. Track contributions and showcase your commits.",
                gradient: "from-gray-700 to-gray-900",
                delay: 0.3
              },
              {
                icon: <MessageCircle className="w-8 h-8" />,
                title: "Real-time Chat",
                description: "Instant messaging with typing indicators, file sharing, and emoji reactions.",
                gradient: "from-purple-500 to-pink-500",
                delay: 0.4
              },
              {
                icon: <Trophy className="w-8 h-8" />,
                title: "Progress Tracking",
                description: "Beautiful dashboards to monitor milestones and celebrate team achievements.",
                gradient: "from-yellow-500 to-orange-500",
                delay: 0.5
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: "Lightning Fast",
                description: "Built for speed. No lag, no waiting. Just pure creative flow.",
                gradient: "from-brand-500 to-dark-lighter",
                delay: 0.6
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: feature.delay }}
                whileHover={{ y: -10 }}
              >
                <Card className="p-8 h-full group hover:border-white/20">
                  <div className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 text-white`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-text-primary mb-4 group-hover:text-brand-light transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-text-tertiary leading-relaxed group-hover:text-text-secondary transition-colors">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-600/20 to-purple-600/20 backdrop-blur-3xl" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
                Ready to Build the
              </span>
              <br />
              <span className="bg-gradient-to-r from-brand-light to-brand-secondary bg-clip-text text-transparent">
                Future Together?
              </span>
            </h2>
            <motion.p 
              className="text-xl text-text-secondary mb-12 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Join creators, developers, and innovators who are building 
              amazing projects and making lifelong connections.
            </motion.p>
            
            <motion.div
              className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <Button variant="primary" size="xl" className="group">
                <Link href="/auth/register" className="flex items-center">
                  <Rocket className="w-6 h-6 mr-3 group-hover:animate-bounce" />
                  Start Building for Free
                  <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              
              <div className="flex items-center space-x-4 text-text-tertiary">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="w-8 h-8 bg-gradient-to-r from-brand-light to-brand-secondary rounded-full border-2 border-dark-surface" />
                  ))}
                </div>
                <span className="text-sm">Join the community</span>
              </div>
            </motion.div>
            
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-dark-border bg-dark-surface">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
                  Inspira-Grid
                </span>
              </div>
              <p className="text-text-tertiary mb-6 max-w-md">
                The ultimate platform for young creators to collaborate, innovate, and build 
                the next generation of amazing projects.
              </p>
              <div className="flex space-x-4">
                <motion.a 
                  href="#" 
                  className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-brand-primary/20 hover:border hover:border-brand-primary/30 transition-all backdrop-blur-sm"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Github className="w-5 h-5" />
                </motion.a>
                <motion.a 
                  href="#" 
                  className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-brand-primary/20 hover:border hover:border-brand-primary/30 transition-all backdrop-blur-sm"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <MessageCircle className="w-5 h-5" />
                </motion.a>
              </div>
            </div>
            
            <div>
              <h3 className="text-text-primary font-semibold mb-4">Product</h3>
              <div className="space-y-3">
                {['Features', 'Pricing', 'Security', 'Updates'].map((item) => (
                  <a key={item} href="#" className="block text-text-tertiary hover:text-text-primary transition-colors">
                    {item}
                  </a>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-text-primary font-semibold mb-4">Support</h3>
              <div className="space-y-3">
                {['Help Center', 'Community', 'Contact', 'Status'].map((item) => (
                  <a key={item} href="#" className="block text-text-tertiary hover:text-text-primary transition-colors">
                    {item}
                  </a>
                ))}
              </div>
            </div>
          </div>
          
          <div className="border-t border-dark-border pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-text-tertiary mb-4 md:mb-0">
              © 2024 Inspira-Grid. Made with ❤️ for the next generation of creators.
            </p>
            <div className="flex space-x-6 text-text-tertiary text-sm">
              <a href="#" className="hover:text-text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-text-primary transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-text-primary transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
