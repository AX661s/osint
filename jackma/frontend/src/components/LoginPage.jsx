import React, { useState, useEffect } from 'react';
import { Shield, Lock, Mail, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import ThemeSwitcher from './ThemeSwitcher';
import { toast } from 'sonner';

export const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('请填写所有字段');
      return;
    }
    setIsLoading(true);
    
    try {
      // In production (served from same origin), use relative path
      const API_BASE_URL = process.env.NODE_ENV === 'production' 
        ? '/api' 
        : (process.env.REACT_APP_API_URL || 'http://localhost:8000/api');
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      // 先克隆响应再解析，避免“Response body is already used”错误
      const cloned = response.clone();
      const data = await cloned.json();
      
      if (data.success) {
        toast.success(data.message);
        onLogin(data);
      } else {
        toast.error(data.message || '登录失败');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('登录请求失败');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* 3D Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated Grid */}
        <div className="absolute inset-0 cyber-grid-3d"></div>
        
        {/* Floating Cubes */}
        <div className="cubes-container">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="floating-cube"
              style={{
                left: `${(i * 15) + 5}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${15 + i * 2}s`,
              }}
            >
              <div className="cube">
                <div className="cube-face front"></div>
                <div className="cube-face back"></div>
                <div className="cube-face right"></div>
                <div className="cube-face left"></div>
                <div className="cube-face top"></div>
                <div className="cube-face bottom"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Particle Network */}
        <div className="particles-container">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 10}s`,
              }}
            ></div>
          ))}
        </div>

        {/* Animated Rings */}
        <div className="rings-container">
          <div className="ring ring-1"></div>
          <div className="ring ring-2"></div>
          <div className="ring ring-3"></div>
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-transparent to-background/80"></div>
      </div>

      {/* Theme Switcher - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeSwitcher />
      </div>

      {/* Login Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Title */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 blur-2xl bg-primary/30 rounded-full animate-pulse"></div>
                <Shield className="relative w-20 h-20 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  OSINT
                </span>
                <span className="text-foreground ml-2">Tracker</span>
              </h1>
              <p className="text-muted-foreground mt-2 font-mono text-sm">Digital Intelligence Platform</p>
            </div>
          </div>

          {/* Login Card */}
          <Card className="relative overflow-hidden border-primary/20 backdrop-blur-xl bg-card/40">
            {/* Card Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"></div>
            
            {/* Scan Line */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="scan-line"></div>
            </div>

            <div className="relative p-8 space-y-6">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-semibold">Welcome Back</h2>
                <p className="text-sm text-muted-foreground">Enter your credentials to access the system</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Username
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="admin"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-12 bg-background/50 border-border/50 focus:border-primary/50 transition-all pl-4"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type="password"
                      placeholder="admin123"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 bg-background/50 border-border/50 focus:border-primary/50 transition-all pl-4"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={setRememberMe}
                      className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      disabled={isLoading}
                    />
                    <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                      Remember me
                    </label>
                  </div>
                  <a href="#" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>

                {/* Login Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 transition-all shadow-lg hover:shadow-primary/50 group"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2"></div>
                      Authenticating...
                    </>
                  ) : (
                    <>
                      Access System
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>


            </div>
          </Card>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <a href="#" className="text-primary hover:underline font-medium">
              Request Access
            </a>
          </p>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground font-mono">
            Secure • Encrypted • Monitored
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
