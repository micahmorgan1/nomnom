import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl font-bold text-accent-500 text-center mb-8">nomnom</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-danger-50 text-danger-500 text-sm p-3 rounded-lg">{error}</div>
          )}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-400"
            autoComplete="username"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-400"
            autoComplete="current-password"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-accent-500 text-white font-semibold rounded-lg hover:bg-accent-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          Don't have an account?{' '}
          <Link to="/register" className="text-accent-500 hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
