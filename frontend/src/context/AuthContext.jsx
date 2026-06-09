import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Set Auth headers on startup
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.get(`${API_URL}/profile`);
        setUser(response.data.user);
      } catch (error) {
        console.error("Session verification failed:", error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API_URL}/login`, { username, password });
      const { token: newCtxToken, user: userData } = response.data;
      localStorage.setItem('token', newCtxToken);
      setToken(newCtxToken);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newCtxToken}`;
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed. Please try again.' 
      };
    }
  };

  const register = async (username, email, password) => {
    try {
      await axios.post(`${API_URL}/register`, { username, email, password });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed.' 
      };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await axios.post(`${API_URL}/logout`);
      }
    } catch (e) {
      console.warn("Logout request failed, cleaning local storage anyway.");
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, API_URL }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
