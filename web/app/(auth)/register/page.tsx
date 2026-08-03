import React, { useState } from 'react';

export default function CleanRegister() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert('Registration successful!');
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 px-4 py-12 font-sans">
      <div className="w-full max-w-md bg-white border border-zinc-200/80 rounded-2xl shadow-xl shadow-zinc-100 p-8 sm:p-10">
        
        {/* Header Section */}
        <div className="space-y-2 text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white font-semibold text-lg mb-2 shadow-sm">
            ✨
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Create an account
          </h1>
          <p className="text-sm text-zinc-500">
            Enter your information below to get started
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700 block">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Alex Morgan"
              required
              className="w-full px-3.5 py-2.5 text-sm text-zinc-900 bg-zinc-50/50 border border-zinc-200 rounded-xl outline-none focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all placeholder:text-zinc-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700 block">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="alex@example.com"
              required
              className="w-full px-3.5 py-2.5 text-sm text-zinc-900 bg-zinc-50/50 border border-zinc-200 rounded-xl outline-none focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all placeholder:text-zinc-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700 block">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a strong password"
              required
              className="w-full px-3.5 py-2.5 text-sm text-zinc-900 bg-zinc-50/50 border border-zinc-200 rounded-xl outline-none focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all placeholder:text-zinc-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700 block">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              required
              className="w-full px-3.5 py-2.5 text-sm text-zinc-900 bg-zinc-50/50 border border-zinc-200 rounded-xl outline-none focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all placeholder:text-zinc-400"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium rounded-xl transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></span>
              ) : (
                'Create account'
              )}
            </button>
          </div>
        </form>

        {/* Footer Link */}
        <div className="text-center mt-6">
          <p className="text-sm text-zinc-500">
            Already have an account?{' '}
            <a href="#login" className="font-medium text-zinc-900 hover:underline">
              Sign in
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}