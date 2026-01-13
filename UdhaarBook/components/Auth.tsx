
import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [mobile, setMobile] = useState('');
  const [gender, setGender] = useState('Male');

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Auth Error:", err.code, err.message);
      
      if (err.code === 'auth/unauthorized-domain') {
        setError(`Domain not authorized. Please add "${window.location.hostname}" to Authorized Domains in your Firebase Console (Auth -> Settings).`);
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup blocked by browser. Please allow popups for this site or try clicking again.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled. Please try again.');
      } else {
        setError(err.message || 'An error occurred during Google Sign-In.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        // Metadata like DOB/Mobile would typically be saved to Firestore here
        console.log("Profile created successfully");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-black text-indigo-600 tracking-tight">UdhaarBook</h1>
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">Audit-Proof Ledger</p>
      </header>

      <div className="neumorph-card w-full max-w-sm p-8">
        <h2 className="text-xl font-bold text-slate-700 mb-6 text-center">
          {isLogin ? 'Login to Account' : 'Create New Account'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <input
                required
                type="text"
                placeholder="Full Name"
                className="neumorph-inset w-full p-4 rounded-2xl outline-none text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  required
                  type="date"
                  placeholder="DOB"
                  className="neumorph-inset w-full p-4 rounded-2xl outline-none text-xs"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
                <select 
                  className="neumorph-inset w-full p-4 rounded-2xl outline-none text-sm bg-transparent"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <input
                required
                type="tel"
                placeholder="Mobile Number"
                className="neumorph-inset w-full p-4 rounded-2xl outline-none text-sm"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
            </>
          )}

          <input
            required
            type="email"
            placeholder="Email ID"
            className="neumorph-inset w-full p-4 rounded-2xl outline-none text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            required
            type="password"
            placeholder="Password"
            className="neumorph-inset w-full p-4 rounded-2xl outline-none text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
              <p className="text-rose-500 text-[10px] font-bold text-center leading-relaxed">
                {error}
              </p>
            </div>
          )}

          <button
            disabled={loading}
            type="submit"
            className="neumorph-btn w-full p-4 rounded-2xl font-black text-indigo-600 uppercase tracking-widest text-sm mt-4 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center space-y-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ya Continue With</p>
          
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className={`neumorph-btn w-full p-4 rounded-2xl flex items-center justify-center space-x-3 active:scale-95 transition-all ${loading ? 'opacity-50' : ''}`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-sm font-bold text-slate-600">
              {loading ? 'Please wait...' : 'Google'}
            </span>
          </button>

          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
          >
            {isLogin ? "Naya Account? Sign Up" : "Puraana Account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
