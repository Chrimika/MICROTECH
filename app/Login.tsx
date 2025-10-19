import React, { useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ImageBackground,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { db } from '@/FirebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import LottieView from 'lottie-react-native';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = getAuth();

  // 🌙 Gestion du mode clair/sombre
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const textColor = isDarkMode ? '#fff' : '#000';
  const backgroundColor = isDarkMode ? '#121212' : '#fff';
  const inputBackground = isDarkMode ? '#222' : '#fff';
  const borderColor = isDarkMode ? '#444' : '#ccc';
  const placeholderColor = isDarkMode ? '#aaa' : '#666';

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      return Alert.alert('Erreur', 'Veuillez entrer votre email et mot de passe');
    }

    setLoading(true);
    try {
      // Auth avec Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      const uid = userCredential.user.uid;

      // Récupérer le document Commercial par email
      const q = query(collection(db, 'Commercial'), where('email', '==', email.trim()));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const docData = docSnap.data();

        // Récupérer idCommercial depuis le champ du document
        const idCommercialField = docData.idCommercial ?? null;
        if (!idCommercialField) {
          console.warn('Champ idCommercial manquant dans le document Commercial', docSnap.id);
          await AsyncStorage.setItem(
            'currentCommercial',
            JSON.stringify({ idCommercial: null, uid, ...docData })
          );
          Alert.alert('Attention', "Le document commercial n'a pas de champ `idCommercial`.");
        } else {
          console.log('Commercial connecté :', idCommercialField);
          await AsyncStorage.setItem(
            'currentCommercial',
            JSON.stringify({ idCommercial: idCommercialField, uid, ...docData })
          );

          // ✅ Navigation vers l'app principale
          router.replace('(tabs)');
        }
      } else {
        Alert.alert('Erreur', 'Commercial non trouvé dans Firestore');
      }
    } catch (e) {
      console.error(e);
      const code = e.code || '';
      if (code === 'auth/wrong-password') {
        Alert.alert('Erreur', 'Mot de passe incorrect');
      } else if (code === 'auth/user-not-found') {
        Alert.alert('Erreur', 'Utilisateur introuvable');
      } else {
        Alert.alert('Erreur', 'Impossible de se connecter');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}
      >
        <View
          style={{
            backgroundColor,
            paddingVertical: 20,
            borderRadius: 10,
            justifyContent: 'center',
            alignItems: 'center',
            width: 150,
          }}
        >
          <LottieView
            source={require('../assets/animations/inProgress.json')}
            autoPlay
            loop
            style={{ width: 60, height: 60 }}
          />
          <Text style={{ color: textColor }}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );

  return (
    <ImageBackground
      source={require('../assets/images/loginBg.png')}
      style={{
        flex: 1,
        padding: 16,
        justifyContent: 'center',
        backgroundColor,
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: 'bold',
          marginBottom: 50,
          textAlign: 'center',
          color: textColor,
        }}
      >
        Login Commercial
      </Text>

      <Text style={{ color: textColor }}>Email :</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        style={{
          borderWidth: 1,
          borderColor,
          padding: 8,
          marginBottom: 16,
          height: 45,
          marginTop: 10,
          backgroundColor: inputBackground,
          color: textColor,
          borderRadius: 6,
        }}
        placeholder="exemple@gmail.com"
        placeholderTextColor={placeholderColor}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={{ color: textColor }}>Mot de passe :</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        style={{
          borderWidth: 1,
          borderColor,
          padding: 8,
          marginBottom: 16,
          height: 45,
          marginTop: 10,
          backgroundColor: inputBackground,
          color: textColor,
          borderRadius: 6,
        }}
        placeholder="******"
        placeholderTextColor={placeholderColor}
        secureTextEntry
      />

      <TouchableOpacity
        onPress={handleLogin}
        style={{
          backgroundColor: '#008a5c',
          padding: 12,
          alignItems: 'center',
          marginTop: 40,
          height: 50,
          justifyContent: 'center',
          borderRadius: 8,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Se connecter</Text>
      </TouchableOpacity>
    </ImageBackground>
  );
}
