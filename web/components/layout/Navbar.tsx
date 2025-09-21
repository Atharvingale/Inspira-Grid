"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useSocket } from "@/lib/SocketContext";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  MessageSquare,
  Bell,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
  Sparkles,
  Search
} from "lucide-react";

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const socketData = useSocket();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const notifications = socketData?.notifications || [];
  const unreadNotifications = notifications.filter(notif => !notif.read).length;

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/projects", label: "Projects", icon: FolderOpen },
    { href: "/dashboard/teams", label: "Teams", icon: Users },
    { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  ];

  return (
    <motion.nav 
      className="bg-dark-surface/80 backdrop-blur-xl border-b border-dark-border sticky top-0 z-50 transition-all duration-300"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <motion.div 
            className="flex items-center"
            whileHover={{ scale: 1.02 }}
          >
            <Link href="/dashboard" className="flex items-center text-text-primary hover:text-brand-light transition-colors group">
              <div className="w-8 h-8 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-lg flex items-center justify-center mr-3 group-hover:shadow-lg group-hover:shadow-brand-primary/25 transition-all">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
                Inspira-Grid
              </span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link, index) => {
              const IconComponent = link.icon;
              const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
              
              return (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href={link.href}
                    className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative group ${
                      isActive
                        ? 'bg-brand-primary/10 text-brand-light border border-brand-primary/20 shadow-lg shadow-brand-primary/10'
                        : 'text-text-tertiary hover:text-text-primary hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 mr-2 transition-colors ${
                      isActive ? 'text-brand-light' : 'text-text-tertiary group-hover:text-text-secondary'
                    }`} />
                    {link.label}
                    
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-brand-secondary/5 rounded-xl"
                        layoutId="navbar-active"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </Link>
                </motion.div>
              );
            })}
            
            {/* Quick search */}
            <motion.button
              className="flex items-center px-3 py-2.5 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-white/5 transition-all duration-200 ml-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Search className="w-4 h-4" />
              <span className="sr-only">Search</span>
            </motion.button>
          </div>

          {/* Right side icons */}
          <div className="flex items-center space-x-3">
            {/* Notifications */}
            <div className="relative">
              <motion.button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-white/5 transition-all duration-200 group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <motion.span 
                    className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.6 }}
                  >
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </motion.span>
                )}
                <span className="sr-only">Notifications</span>
              </motion.button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <motion.div 
                  className="absolute right-0 mt-3 w-80 bg-dark-card/95 backdrop-blur-xl rounded-2xl shadow-xl border border-dark-border z-50"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-4 border-b border-dark-border/50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-text-primary flex items-center">
                        <Bell className="w-5 h-5 mr-2 text-brand-primary" />
                        Notifications
                      </h3>
                      <span className="text-xs text-text-tertiary bg-text-tertiary/10 px-2 py-1 rounded-lg">
                        {notifications.length} total
                      </span>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center">
                        <Bell className="w-12 h-12 text-text-muted mx-auto mb-3" />
                        <p className="text-text-tertiary text-sm">No notifications yet</p>
                        <p className="text-text-muted text-xs mt-1">We'll notify you when something happens</p>
                      </div>
                    ) : (
                      <>
                        {notifications.slice(0, 5).map((notification, index) => (
                          <motion.div
                            key={notification.id}
                            className={`p-4 border-b border-dark-border/30 hover:bg-white/5 transition-colors cursor-pointer ${
                              !notification.read ? 'bg-brand-primary/5 border-l-2 border-l-brand-primary' : ''
                            }`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.01 }}
                          >
                            <p className="text-sm text-text-secondary">{notification.message}</p>
                            <p className="text-xs text-text-muted mt-1">{notification.time}</p>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-brand-primary rounded-full absolute right-4 top-4" />
                            )}
                          </motion.div>
                        ))}
                        {notifications.length > 5 && (
                          <div className="p-4 border-t border-dark-border/50">
                            <Link 
                              href="/dashboard/notifications"
                              className="block text-center text-sm text-brand-primary hover:text-brand-light transition-colors py-2 px-4 rounded-lg hover:bg-brand-primary/5"
                              onClick={() => setShowNotifications(false)}
                            >
                              View all {notifications.length} notifications
                            </Link>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <motion.button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center p-2 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-white/5 transition-all duration-200 group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {userProfile?.photoURL ? (
                  <motion.div
                    className="w-8 h-8 rounded-full overflow-hidden mr-2 ring-2 ring-transparent group-hover:ring-brand-primary/30 transition-all"
                    whileHover={{ scale: 1.1 }}
                  >
                    <Image
                      src={userProfile.photoURL}
                      alt="Profile"
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                ) : (
                  <motion.div 
                    className="w-8 h-8 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full flex items-center justify-center mr-2 text-white text-sm font-semibold ring-2 ring-transparent group-hover:ring-brand-primary/30 transition-all"
                    whileHover={{ scale: 1.1 }}
                  >
                    {(userProfile?.displayName || currentUser?.email || '?')[0].toUpperCase()}
                  </motion.div>
                )}
                <span className="hidden md:block text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                  {userProfile?.displayName || currentUser?.email?.split('@')[0]}
                </span>
                <ChevronDown className="w-4 h-4 ml-2 text-text-muted group-hover:text-text-tertiary transition-all transform group-hover:rotate-180" />
              </motion.button>

              {/* User Dropdown */}
              {showUserDropdown && (
                <motion.div 
                  className="absolute right-0 mt-3 w-64 bg-dark-card/95 backdrop-blur-xl rounded-2xl shadow-xl border border-dark-border z-50"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-4 border-b border-dark-border/50">
                    <div className="flex items-center">
                      {userProfile?.photoURL ? (
                        <Image
                          src={userProfile.photoURL}
                          alt="Profile"
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover mr-3"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full flex items-center justify-center mr-3 text-white font-semibold">
                          {(userProfile?.displayName || currentUser?.email || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-text-primary">
                          {userProfile?.displayName || currentUser?.email?.split('@')[0]}
                        </p>
                        <p className="text-xs text-text-tertiary">{currentUser?.email}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="py-2">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Link
                        href="/dashboard/profile"
                        className="flex items-center px-4 py-3 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all rounded-lg mx-2 group"
                        onClick={() => setShowUserDropdown(false)}
                      >
                        <User className="w-4 h-4 mr-3 text-text-muted group-hover:text-brand-primary transition-colors" />
                        Profile
                      </Link>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 }}
                    >
                      <Link
                        href="/settings"
                        className="flex items-center px-4 py-3 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all rounded-lg mx-2 group"
                        onClick={() => setShowUserDropdown(false)}
                      >
                        <Settings className="w-4 h-4 mr-3 text-text-muted group-hover:text-brand-primary transition-colors" />
                        Settings
                      </Link>
                    </motion.div>
                    
                    {userProfile?.role === 'admin' && (
                      <>
                        <div className="border-t border-dark-border/30 my-2"></div>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <Link
                            href="/admin"
                            className="flex items-center px-4 py-3 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all rounded-lg mx-2 group"
                            onClick={() => setShowUserDropdown(false)}
                          >
                            <Shield className="w-4 h-4 mr-3 text-text-muted group-hover:text-brand-primary transition-colors" />
                            Admin Panel
                          </Link>
                        </motion.div>
                      </>
                    )}
                    
                    <div className="border-t border-dark-border/30 my-2"></div>
                    <motion.button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-3 text-sm text-text-secondary hover:text-red-400 hover:bg-red-500/5 transition-all rounded-lg mx-2 group"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.25 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <LogOut className="w-4 h-4 mr-3 text-text-muted group-hover:text-red-400 transition-colors" />
                      Logout
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <motion.button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2.5 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-white/5 transition-all duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  initial={false}
                  animate={{ rotate: isMenuOpen ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </motion.div>
                <span className="sr-only">Toggle menu</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <motion.div 
            className="md:hidden border-t border-dark-border/50 backdrop-blur-xl"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link, index) => {
                const IconComponent = link.icon;
                const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
                
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.2 }}
                  >
                    <Link
                      href={link.href}
                      className={`flex items-center px-4 py-4 rounded-xl text-base font-medium transition-all duration-200 min-h-[44px] ${
                        isActive
                          ? 'bg-brand-primary/10 text-brand-light border-l-4 border-l-brand-primary'
                          : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <IconComponent className={`w-5 h-5 mr-3 ${
                        isActive ? 'text-brand-light' : 'text-text-tertiary'
                      }`} />
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Close dropdowns when clicking outside */}
      {(showNotifications || showUserDropdown) && (
        <motion.div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            setShowNotifications(false);
            setShowUserDropdown(false);
          }}
        />
      )}
    </motion.nav>
  );
}