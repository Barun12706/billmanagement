import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth';
import { auth } from '../firebase/config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = (email, password) => {
    if (!auth) throw new Error("Firebase Auth is not initialized. Check your .env file.");
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    if (!auth) return;
    return signOut(auth);
  };

  const updateUserPassword = (newPassword) => {
    if (!auth || !auth.currentUser) throw new Error("No user logged in");
    return updatePassword(auth.currentUser, newPassword);
  };

  const value = {
    currentUser,
    login,
    logout,
    updateUserPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
