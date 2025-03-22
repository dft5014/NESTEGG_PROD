// pages/signup.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const Signup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSignup = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        
        if (!email || !password) {
            setError("Email and password are required");
            setLoading(false);
            return;
        }
      
        try {
            const response = await fetch("http://127.0.0.1:8000/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                  email, 
                  password,
                  first_name: firstName,
                  last_name: lastName
                }),
            });
      
            const data = await response.json();
            console.log("Response from server:", data);
      
            if (!response.ok) {
                // Properly handle error object
                let errorMessage;
                if (typeof data.detail === 'object') {
                    errorMessage = JSON.stringify(data.detail);
                } else {
                    errorMessage = data.detail || "Sign-up failed";
                }
                throw new Error(errorMessage);
            }
      
            alert("Sign-up successful! Please log in.");
            router.push("/login");
        } catch (error) {
            console.error("Sign-up error:", error);
            setError(error.message || "Sign-up failed");
        } finally {
            setLoading(false);
        }
      };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2 className="auth-title">Sign Up</h2>
                {error && <p className="text-red-500 mb-4">{error}</p>}
                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="auth-label">First Name</label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="auth-input"
                                placeholder="First Name"
                            />
                        </div>
                        <div>
                            <label className="auth-label">Last Name</label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="auth-input"
                                placeholder="Last Name"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="auth-label">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="auth-input"
                            placeholder="email@example.com"
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
                            placeholder="••••••••"
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="auth-button"
                        disabled={loading}
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>
                <p className="auth-footer">
                    Already have an account?{' '}
                    <Link href="/login" className="auth-link">
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;