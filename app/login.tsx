import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Pressable, Text, ActivityIndicator } from 'react-native';
import { supabase } from '../utils/supabase';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signInWithEmail() {
    if (!email || !password) {
      alert('Please enter both email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      router.replace('/(tabs)');
    }
    setLoading(false);
  }

  async function signUpWithEmail() {
    if (!email || !password) {
      alert('Please enter both email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert('Check your email for the login link!');
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accountability Tracker</Text>
      <Text style={styles.subtitle}>Sign in to sync your progress.</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          onChangeText={setEmail}
          value={email}
          placeholder="email@address.com"
          placeholderTextColor="#666"
          autoCapitalize="none"
        />
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          onChangeText={setPassword}
          value={password}
          secureTextEntry
          placeholder="Password"
          placeholderTextColor="#666"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.buttonContainer}>
        <Pressable style={styles.button} onPress={signInWithEmail} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </Pressable>
        <Pressable style={[styles.button, styles.buttonSecondary]} onPress={signUpWithEmail} disabled={loading}>
          <Text style={styles.buttonTextSecondary}>Sign Up</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#1C1C1E',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 16,
    gap: 12,
  },
  button: {
    backgroundColor: '#FF453A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
