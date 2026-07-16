import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Pressable, Text, ActivityIndicator, Image } from 'react-native';
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
      <View style={styles.card}>
        <Image 
          source={require('@/assets/images/icon.png')} 
          style={styles.logo} 
          resizeMode="cover"
        />
        <Text style={styles.title}>Willkommen zurück</Text>
        <Text style={styles.subtitle}>Bitte logge dich ein, um fortzufahren.</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            onChangeText={setEmail}
            value={email}
            placeholder="E-Mail"
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
    </View>
  );
}

import Colors from '@/constants/Colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    padding: 40,
    borderRadius: 16,
    backgroundColor: '#0a0a0c', // Soft black (var(--color-bg-panel))
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 10,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 14,
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.dark.muted,
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 12,
  },
  input: {
    backgroundColor: Colors.dark.surface,
    color: Colors.dark.text,
    padding: 16,
    borderRadius: 12,
    fontSize: 15,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 12,
    gap: 12,
  },
  button: {
    backgroundColor: Colors.dark.tint,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: Colors.dark.tint,
    fontSize: 14,
    fontWeight: '600',
  },
});
