import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import LoginPage from './components/LoginPage';
import SearchPage from './components/SearchPage';
import ResultsPage from './components/ResultsPage';
import ResultsPageDemo from './components/ResultsPageDemo';
import AdminPage from './components/AdminPage';
import LoadingProgress from './components/LoadingProgress';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from './components/ui/sonner';

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState('search'); // 'search', 'results', 'admin', 'demo'

  // 从localStorage恢复会话
  useEffect(() => {
    const savedToken = localStorage.getItem('session_token');
    const savedIsAdmin = localStorage.getItem('is_admin') === 'true';
    const savedUserId = localStorage.getItem('user_id');
    const savedUsername = localStorage.getItem('username');
    
    if (savedToken) {
      verifySessionToken(savedToken, savedIsAdmin, savedUserId, savedUsername);
    }
  }, []);

  const verifySessionToken = async (token, isAdminVal, userId, username) => {
    try {
      // In production (served from same origin), use relative path
      const API_BASE_URL = process.env.NODE_ENV === 'production' 
        ? '/api' 
        : (process.env.REACT_APP_API_URL || 'http://localhost:8001/api');
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: token })
      });
      // 先克隆响应再解析，避免外部监听在读取后再 clone 导致报错
      const cloned = response.clone();
      const data = await cloned.json();
      if (data.valid) {
        setIsAuthenticated(true);
        setSessionToken(token);
        setIsAdmin(data.is_admin || isAdminVal);
        setUserId(data.user_id || userId);
        setUsername(data.username || username);
      }
    } catch (error) {
      console.error('Session verification error:', error);
    }
  };

  const handleLogin = (loginData) => {
    // 保存认证信息到localStorage
    localStorage.setItem('session_token', loginData.session_token);
    localStorage.setItem('user_id', loginData.user_id);
    localStorage.setItem('username', loginData.username);
    localStorage.setItem('is_admin', loginData.is_admin);
    
    setIsAuthenticated(true);
    setSessionToken(loginData.session_token);
    setUserId(loginData.user_id);
    setUsername(loginData.username);
    setIsAdmin(loginData.is_admin);
    setCurrentPage('search');
  };

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('is_admin');
    
    setIsAuthenticated(false);
    setSessionToken(null);
    setUserId(null);
    setUsername(null);
    setIsAdmin(false);
    setSearchResults(null);
    setCurrentPage('search');
  };

  const handleAdminClick = () => {
    if (isAdmin) {
      setCurrentPage('admin');
    }
  };

  const handleSearch = async (query, filters) => {
    setSearchQuery(query);
    setIsLoading(true);
    setCurrentPage('loading');  // 先显示加载页面
    
    try {
      // In production (served from same origin), use relative path
      const API_BASE_URL = process.env.NODE_ENV === 'production' 
        ? '/api' 
        : (process.env.REACT_APP_API_URL || 'http://localhost:8001/api');
      let endpoint = '';
      let payload = {};
      
      // 根据用户选择的搜索类型或自动判断
      const searchType = filters?.searchType || 'auto';
      
      if (searchType === 'email') {
        // 邮箱搜索
        endpoint = `${API_BASE_URL}/email/query`;
        payload = { email: query, timeout: 120 };
      } else if (searchType === 'phone') {
        // 手机搜索
        endpoint = `${API_BASE_URL}/phone/query`;
        payload = { phone: query, timeout: 120 };
      } else if (searchType === 'username' || searchType === 'wallet' || searchType === 'id') {
        // 暂不支持的搜索类型
        setIsLoading(false);
        alert(`${searchType} search is coming soon! Currently only Email and Phone are supported.`);
        setCurrentPage('search');
        return;
      } else {
        // 自动判断类型
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^[\d+\-\s()]+$/;
        
        if (emailRegex.test(query)) {
          endpoint = `${API_BASE_URL}/email/query`;
          payload = { email: query, timeout: 120 };
        } else if (phoneRegex.test(query) && query.replace(/\D/g, '').length >= 7) {
          endpoint = `${API_BASE_URL}/phone/query`;
          payload = { phone: query, timeout: 120 };
        } else {
          setIsLoading(false);
          alert('Please enter a valid email or phone number');
          setCurrentPage('search');
          return;
        }
      }
      
      // 创建一个超时控制器（150秒超时）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 150000);
      
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('API request failed');
        const data = await response.json();
        
        // 直接处理结果，不通过LoadingProgress的onComplete
        setIsLoading(false);
        if (data && data.success && data.data) {
          // 仅使用后端聚合结果进行渲染，前端不再直接请求 3008 服务
          setSearchResults(data);
          setCurrentPage('results');
        } else {
          alert('Search failed: No results found. API query failed.\n\nPlease check:\n- API keys are configured correctly\n- The input format is valid\n- Backend service is running');
          setCurrentPage('search');
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('Fetch error:', fetchError);
        if (fetchError.name === 'AbortError') {
          alert('Search timed out after 150 seconds. The query may still be processing. Please try again later or check cached results.');
        } else {
          alert('Search failed. Please try again.');
        }
        setIsLoading(false);
        setCurrentPage('search');
      }
    } catch (error) {
      console.error('Search error:', error);
      setIsLoading(false);
      alert('Search failed. Please try again.');
    }
  };

  const handleLoadingComplete = (apiData = null, query = '') => {
    setIsLoading(false);
    if (apiData && apiData.success && apiData.data) {
      // Pass raw API data directly to ResultsPage
      setSearchResults(apiData);
    } else {
      // Show error message with details
      const errorMsg = apiData?.error || 'No results found. API query failed.';
      alert(`Search failed: ${errorMsg}\n\nPlease check:\n- API keys are configured correctly\n- The input format is valid\n- Backend service is running`);
      setCurrentPage('search');
    }
  };

  const handleBack = () => {
    setSearchResults(null);
    setSearchQuery('');
    setCurrentPage('search');
  };

  const handleDemo = () => {
    setCurrentPage('demo');
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-background cyber-grid" style={{ backgroundColor: 'hsl(var(--background))', minHeight: '100vh' }}>
      {currentPage === 'admin' && isAdmin ? (
        <AdminPage 
          onBack={handleBack} 
          onLogout={handleLogout} 
          username={username}
          sessionToken={sessionToken}
          userId={userId}
        />
      ) : currentPage === 'loading' && isLoading ? (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="relative inline-block">
              <div className="w-20 h-20 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Shield className="w-10 h-10 text-primary animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">正在查询中...</h2>
              <p className="text-muted-foreground">
                OSINT API 正在处理您的请求，这可能需要 1-2 分钟
              </p>
              <p className="text-sm text-muted-foreground/70 font-mono">
                请耐心等待，请勿关闭页面
              </p>
            </div>
          </div>
        </div>
      ) : currentPage === 'demo' ? (
        <ResultsPageDemo 
          onBack={handleBack}
        />
      ) : !searchResults ? (
        <SearchPage 
          onSearch={handleSearch} 
          isAdmin={isAdmin}
          onAdminClick={handleAdminClick}
          onLogout={handleLogout}
          username={username}
        />
      ) : (
        <ResultsPage 
          results={searchResults} 
          query={searchQuery}
          onBack={handleBack}
          isAdmin={isAdmin}
          onAdminClick={handleAdminClick}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      {/* 全局挂载通知组件，确保登录页等也能显示 toast */}
      <Toaster />
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
