// pages/login.js
import { useState } from 'react';
import { useRouter } from 'next/router';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

    const handleLogin = async (e) => {
      e.preventDefault();
      
      // Clear old token before logging in
      localStorage.removeItem('token');
      console.log("🚀 Attempting login...");
  
      try {
          const response = await fetch('http://127.0.0.1:8000/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({ username: email, password }),
          });
  
          console.log("🔍 Login response status:", response.status);
  
          if (response.ok) {
              const data = await response.json();
              console.log("✅ Login successful. Received token:", data.access_token);
  
              // Store the new token
              localStorage.setItem('token', data.access_token);
              router.replace('/portfolio');  // Redirect to portfolio
  
          } else {
              const errorMsg = await response.text();
              console.log("❌ Login failed:", errorMsg);
              alert('Invalid credentials. Please try again.');
          }
      } catch (error) {
          console.error('🔥 Login request failed:', error);
          alert('Login failed. Please check your connection.');
      }
  };
  
  
  ;

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2 className="auth-title">Login</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="auth-label">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="auth-input"
                        />
                    </div>
                    <div>
                        <label className="auth-label">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="auth-input"
                        />
                    </div>
                    <button type="submit" className="auth-button">
                        Login
                    </button>
                </form>
                <p className="auth-footer">
                    Don't have an account?{' '}
                    <a href="/signup" className="auth-link">
                        Sign up
                    </a>
                </p>
            </div>
        </div>
    );
};

export default Login;
