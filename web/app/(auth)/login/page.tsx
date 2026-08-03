"use client"
import React, { useState } from 'react';

export default function AppleGoogleAuth() {
  const [isRegister, setIsRegister] = useState(false);
  const [authStyle, setAuthStyle] = useState<'google' | 'apple'>('google');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    emailOrPhone: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`${authStyle.toUpperCase()} ${isRegister ? 'Registration' : 'Login'} submitted!`);
  };

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-500 ${
      authStyle === 'google' ? 'bg-[#f0f4f9] font-sans' : 'bg-[#f5f5f7] font-[-apple-system,BlinkMacSystemFont,sans-serif]'
    }`}>
      
      {/* Style Switcher Bar for Demonstration */}
      <div className="absolute top-6 flex bg-white/80 backdrop-blur-md p-1.5 rounded-full shadow-sm border border-black/5 gap-1">
        <button
          onClick={() => setAuthStyle('google')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
            authStyle === 'google' ? 'bg-[#1a73e8] text-white shadow-sm' : 'text-gray-600 hover:bg-black/5'
          }`}
        >
          Google UI
        </button>
        <button
          onClick={() => setAuthStyle('apple')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
            authStyle === 'apple' ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:bg-black/5'
          }`}
        >
          Apple UI
        </button>
      </div>

      {/* Main Card Container */}
      <div className={`w-full max-w-[440px] transition-all duration-300 ${
        authStyle === 'google'
          ? 'bg-white rounded-[28px] p-8 sm:p-10 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
          : 'bg-white/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 border border-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.08)]'
      }`}>
        
        {/* Header / Branding */}
        <div className="flex flex-col items-center mb-8">
          {authStyle === 'google' ? (
            <div className="text-3xl font-medium tracking-tight mb-3">
              <span className="text-[#4285F4]">G</span>
              <span className="text-[#EA4335]">o</span>
              <span className="text-[#FBBC05]">o</span>
              <span className="text-[#4285F4]">g</span>
              <span className="text-[#34A853]">l</span>
              <span className="text-[#EA4335]">e</span>
            </div>
          ) : (
            <div className="text-3xl font-semibold mb-3 tracking-tight text-black">
              
            </div>
          )}

          <h1 className={`text-2xl font-normal text-center ${authStyle === 'apple' ? 'font-semibold tracking-tight' : 'text-[#202124]'}`}>
            {isRegister ? 'Create your Account' : (authStyle === 'google' ? 'Sign in' : 'Sign in with Apple ID')}
          </h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            {isRegister ? 'Enter your details to get started' : 'to continue to your account'}
          </p>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                  required
                  className={`w-full px-4 py-3.5 text-sm outline-none transition-all ${
                    authStyle === 'google'
                      ? 'border border-gray-300 rounded-lg focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]'
                      : 'bg-gray-100/80 border border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
              </div>
              <div>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                  required
                  className={`w-full px-4 py-3.5 text-sm outline-none transition-all ${
                    authStyle === 'google'
                      ? 'border border-gray-300 rounded-lg focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]'
                      : 'bg-gray-100/80 border border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
              </div>
            </div>
          )}

          <div>
            <input
              type="text"
              name="emailOrPhone"
              value={formData.emailOrPhone}
              onChange={handleChange}
              placeholder={isRegister ? 'Email address' : 'Email or phone'}
              required
              className={`w-full px-4 py-3.5 text-sm outline-none transition-all ${
                authStyle === 'google'
                  ? 'border border-gray-300 rounded-lg focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]'
                  : 'bg-gray-100/80 border border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
              }`}
            />
          </div>

          <div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              required
              className={`w-full px-4 py-3.5 text-sm outline-none transition-all ${
                authStyle === 'google'
                  ? 'border border-gray-300 rounded-lg focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]'
                  : 'bg-gray-100/80 border border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
              }`}
            />
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className={`text-sm font-medium transition-colors ${
                authStyle === 'google'
                  ? 'text-[#1a73e8] hover:bg-blue-50 px-3 py-2 rounded-md'
                  : 'text-blue-600 hover:underline'
              }`}
            >
              {isRegister ? 'Sign in instead' : 'Create account'}
            </button>

            <button
              type="submit"
              className={`text-sm font-medium transition-all px-6 py-2.5 rounded-full shadow-sm ${
                authStyle === 'google'
                  ? 'bg-[#1a73e8] text-white hover:bg-[#1557b0] rounded-full'
                  : 'bg-black text-white hover:bg-gray-800 rounded-xl'
              }`}
            >
              {isRegister ? 'Continue' : 'Next'}
            </button>
          </div>
        </form>
      </div>
      
    </div>
  );
}