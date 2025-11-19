import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, User, Loader2 } from "lucide-react";
import { useAuthStore } from "../context/authStore";
import toast from "react-hot-toast";

export default function Signup() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    displayName: "",
  });
  const { signup, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (formData.username.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }

    const result = await signup(formData);

    if (result.success) {
      toast.success("Account created successfully!");
      navigate("/lobby");
    } else {
      toast.error(result.error || "Signup failed");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Shield className="w-16 h-16 text-primary-500" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Join Chor-Sipahi
          </h1>
          <p className="text-gray-400">Create your account to start playing</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">
                Username <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="input-field pl-12 text-center"
                  placeholder="coolplayer123"
                  autoComplete="username"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                3-20 characters, alphanumeric and underscore only
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  className="input-field pl-12 text-center"
                  placeholder="Cool Player (optional)"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field pl-12 text-center"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pl-12 text-center"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-primary-500 hover:text-primary-400 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-gray-500 hover:text-gray-400 text-sm">
            ← Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
