"use client";

import React, { useState } from "react";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Mail, Lock, User, Search, Phone, MapPin, Globe, CheckCircle } from "lucide-react";

export default function InputTest() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    phone: "",
    location: "",
    country: "",
    bio: "",
    newsletter: false,
    terms: false,
    notifications: false,
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };
  
  const handleSelectChange = (name: string) => (value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleCheckboxChange = (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [name]: e.target.checked
    }));
  };
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const newSuccess: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    } else {
      newSuccess.email = "Email format is valid";
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else {
      newSuccess.password = "Password strength is good";
    }
    
    if (!formData.username) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else {
      newSuccess.username = "Username is available";
    }
    
    if (formData.bio && formData.bio.length > 200) {
      newErrors.bio = "Bio must be less than 200 characters";
    }
    
    if (!formData.terms) {
      newErrors.terms = "You must accept the terms and conditions";
    }
    
    setErrors(newErrors);
    setSuccess(newSuccess);
    
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setLoading(false);
    alert("Form submitted successfully!");
  };

  return (
    <div className="min-h-screen bg-dark-surface/50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Modern Form Components Showcase
          </h1>
          <p className="text-text-tertiary text-lg">
            Test all form components with validation, states, and interactions
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information Section */}
          <div className="bg-dark-surface/50 rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
              <User className="w-6 h-6 mr-3 text-brand-primary" />
              Personal Information
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Input
                type="text"
                name="username"
                label="Username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Choose a username"
                leftIcon={<User className="w-5 h-5" />}
                error={errors.username}
                success={success.username}
                required
              />
              
              <Input
                type="email"
                name="email"
                label="Email Address"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                leftIcon={<Mail className="w-5 h-5" />}
                error={errors.email}
                success={success.email}
                required
              />
              
              <Input
                type="password"
                name="password"
                label="Password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter a secure password"
                leftIcon={<Lock className="w-5 h-5" />}
                error={errors.password}
                success={success.password}
                required
              />
              
              <Input
                type="tel"
                name="phone"
                label="Phone Number"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="(555) 123-4567"
                leftIcon={<Phone className="w-5 h-5" />}
              />
            </div>
            
            <div className="mt-6">
              <Textarea
                name="bio"
                label="Bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself... (max 200 characters)"
                rows={4}
                error={errors.bio}
                characterLimit={200}
              />
            </div>
          </div>
          
          {/* Location & Preferences Section */}
          <div className="bg-dark-surface/50 rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
              <MapPin className="w-6 h-6 mr-3 text-green-400" />
              Location & Preferences
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Select
                label="Country"
                value={formData.country}
                onChange={handleSelectChange("country")}
                options={[
                  { value: "us", label: "United States" },
                  { value: "ca", label: "Canada" },
                  { value: "uk", label: "United Kingdom" },
                  { value: "de", label: "Germany" },
                  { value: "fr", label: "France" },
                  { value: "jp", label: "Japan" },
                  { value: "au", label: "Australia" },
                ]}
                placeholder="Select your country"
              />
              
              <Input
                type="text"
                name="location"
                label="City/Location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Enter your city"
                leftIcon={<MapPin className="w-5 h-5" />}
              />
            </div>
            
            <div className="mt-6 space-y-4">
              <Checkbox
                name="newsletter"
                label="Subscribe to Newsletter"
                checked={formData.newsletter}
                onChange={handleCheckboxChange("newsletter")}
                description="Get the latest updates, tips, and exclusive content delivered to your inbox."
              />
              
              <Checkbox
                name="notifications"
                label="Enable Push Notifications"
                checked={formData.notifications}
                onChange={handleCheckboxChange("notifications")}
                description="Receive real-time notifications about important updates and messages."
              />
              
              <Checkbox
                name="terms"
                label="I accept the Terms and Conditions"
                checked={formData.terms}
                onChange={handleCheckboxChange("terms")}
                error={errors.terms}
                description="By checking this box, you agree to our terms of service and privacy policy."
                required
              />
            </div>
          </div>
          
          {/* Form Actions */}
          <div className="bg-dark-surface/50 rounded-lg p-8">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              <button
                type="button"
                onClick={validateForm}
                className="w-full sm:w-auto px-6 py-3 bg-brand-primary hover:bg-brand-primary text-white font-medium rounded-lg transition-colors duration-200"
              >
                Validate Form
              </button>
              
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      email: "",
                      password: "",
                      username: "",
                      phone: "",
                      location: "",
                      country: "",
                      bio: "",
                      newsletter: false,
                      terms: false,
                      notifications: false,
                    });
                    setErrors({});
                    setSuccess({});
                  }}
                  className="px-6 py-3 bg-dark-surface/50 hover:bg-dark-surface/50 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  Reset Form
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Submit Form
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
        
        {/* Debug Section */}
        <div className="bg-dark-surface/50 rounded-lg p-8 mt-8">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Search className="w-5 h-5 mr-3 text-purple-400" />
            Debug Information
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Form Data</h3>
              <pre className="bg-dark-surface/50 p-4 rounded text-green-400 text-sm overflow-auto max-h-64">
                {JSON.stringify(formData, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Validation Status</h3>
              <div className="space-y-2">
                <div className="bg-dark-surface/50 p-4 rounded">
                  <h4 className="text-red-400 font-medium mb-2">Errors:</h4>
                  <pre className="text-red-300 text-sm">
                    {Object.keys(errors).length > 0 ? JSON.stringify(errors, null, 2) : "No errors"}
                  </pre>
                </div>
                
                <div className="bg-dark-surface/50 p-4 rounded">
                  <h4 className="text-green-400 font-medium mb-2">Success:</h4>
                  <pre className="text-green-300 text-sm">
                    {Object.keys(success).length > 0 ? JSON.stringify(success, null, 2) : "No success messages"}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}