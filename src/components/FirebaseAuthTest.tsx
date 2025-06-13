// Firebase Auth Persistence Test
// This test will verify that Firebase Auth is properly initialized and persistence is working

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { auth } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';

const FirebaseAuthTest: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('Initializing...');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log('🧪 Firebase Auth Test:', message);
    setLogs(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    addLog('Setting up auth state listener...');
    
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      addLog(`Auth state changed: ${user ? `User ${user.email}` : 'No user'}`);
      setUser(user);
      setLoading(false);
      
      if (user) {
        setStatus(`✅ Signed in as: ${user.email}`);
        addLog('✅ Firebase Auth persistence is working!');
      } else {
        setStatus('❌ Not signed in');
        addLog('User signed out or not authenticated');
      }
    });

    // Check if Firebase Auth is properly initialized
    try {
      if (auth) {
        addLog('✅ Firebase Auth instance is available');
        addLog(`Auth app name: ${auth.app.name}`);
        addLog(`Auth project: ${auth.config?.apiKey ? 'Config loaded' : 'No config'}`);
      } else {
        addLog('❌ Firebase Auth instance is null');
      }
    } catch (error: any) {
      addLog(`❌ Error checking auth: ${error.message}`);
    }

    return unsubscribe;
  }, []);

  const testSignIn = async () => {
    try {
      addLog('Testing sign in with test@example.com...');
      setStatus('🔄 Signing in...');
      
      // This will likely fail but will test the auth system
      await signInWithEmailAndPassword(auth, 'test@example.com', 'password123');
      addLog('✅ Sign in successful');
      
    } catch (error: any) {
      addLog(`Expected sign in error: ${error.code}`);
      setStatus('❌ Sign in failed (expected for test)');
    }
  };

  const testSignOut = async () => {
    try {
      addLog('Testing sign out...');
      setStatus('🔄 Signing out...');
      await signOut(auth);
      addLog('✅ Sign out successful');
    } catch (error: any) {
      addLog(`❌ Sign out error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🔥 Firebase Auth Test</Text>
        <Text style={styles.loading}>Loading auth state...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔥 Firebase Auth Test</Text>
      <Text style={styles.status}>{status}</Text>
      
      <View style={styles.buttonContainer}>
        <Button title="Test Sign In" onPress={testSignIn} />
        <Button title="Test Sign Out" onPress={testSignOut} disabled={!user} />
      </View>

      <View style={styles.logsContainer}>
        <Text style={styles.logsTitle}>📋 Test Logs:</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logItem}>{log}</Text>
        ))}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>ℹ️ Test Info:</Text>
        <Text style={styles.infoText}>• This test verifies Firebase Auth initialization</Text>
        <Text style={styles.infoText}>• Persistence should work across app reloads</Text>
        <Text style={styles.infoText}>• Check console for detailed Firebase logs</Text>
        <Text style={styles.infoText}>• AsyncStorage warnings should be gone</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  status: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    color: '#333',
  },
  loading: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  logsContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  logItem: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
    color: '#555',
  },
  infoContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1976d2',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#1976d2',
  },
});

export default FirebaseAuthTest;
