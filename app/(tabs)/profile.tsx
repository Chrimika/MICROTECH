import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { getAuth, updatePassword } from 'firebase/auth';
import { db } from '@/FirebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ClientProfileScreen() {
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const auth = getAuth();
  const router = useRouter();

  useEffect(() => {
    const loadClient = async () => {
      const c = await AsyncStorage.getItem('client');
      if (c) {
        const parsed = JSON.parse(c);
        setClient(parsed);
        setFullName(parsed.fullName || '');
        setPhone(parsed.phone || '');
        setLocation(parsed.location || '');
      }
      setLoading(false);
    };
    loadClient();
  }, []);

  const handleSave = async () => {
    if (!client) return;

    try {
      const docRef = doc(db, 'Clients', client.uid);
      await updateDoc(docRef, {
        fullName,
        phone,
        location,
      });

      const updatedClient = { ...client, fullName, phone, location };
      await AsyncStorage.setItem('client', JSON.stringify(updatedClient));
      setClient(updatedClient);

      Alert.alert('Succès', 'Vos informations ont été mises à jour.');
      setEditing(false);
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', "Impossible de mettre à jour les informations.");
    }
  };

  const handleChangePassword = async () => {
    if (!password || !newPassword) {
      return Alert.alert('Erreur', 'Veuillez remplir les deux champs de mot de passe.');
    }

    try {
      const user = auth.currentUser;
      if (!user) return Alert.alert('Erreur', 'Utilisateur non connecté.');

      await updatePassword(user, newPassword);
      setPassword('');
      setNewPassword('');
      Alert.alert('Succès', 'Mot de passe modifié avec succès.');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          'Erreur',
          'Vous devez vous reconnecter avant de changer votre mot de passe.'
        );
      } else {
        Alert.alert('Erreur', "Impossible de modifier le mot de passe.");
      }
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('client');
    router.replace('/login');
  };

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#008a5c" />
      </View>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <ScrollView style={{ flex: 1, backgroundColor: '#fff', padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 20 }}>Mon Profil</Text>

      {/* Infos client */}
      <View style={{ marginBottom: 30 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          Informations personnelles
        </Text>

        <Text>Nom complet</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          editable={editing}
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            padding: 8,
            marginBottom: 10,
          }}
        />

        <Text>Email</Text>
        <TextInput
          value={client?.email || ''}
          editable={false}
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            padding: 8,
            marginBottom: 10,
            backgroundColor: '#f2f2f2',
          }}
        />

        <Text>Téléphone</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          editable={editing}
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            padding: 8,
            marginBottom: 10,
          }}
        />

        <Text>Localisation</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          editable={editing}
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            padding: 8,
            marginBottom: 10,
          }}
        />

        {editing ? (
          <TouchableOpacity
            onPress={handleSave}
            style={{
              backgroundColor: '#008a5c',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>💾 Enregistrer</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => setEditing(true)}
            style={{
              backgroundColor: '#008a5c',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>✏️ Modifier mes infos</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Changer mot de passe */}
      <View style={{ marginBottom: 30 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          Modifier le mot de passe
        </Text>

        <Text>Ancien mot de passe</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Ancien mot de passe"
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            padding: 8,
            marginBottom: 10,
          }}
        />

        <Text>Nouveau mot de passe</Text>
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="Nouveau mot de passe"
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            padding: 8,
            marginBottom: 10,
          }}
        />

        <TouchableOpacity
          onPress={handleChangePassword}
          style={{
            backgroundColor: '#008a5c',
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>🔐 Changer le mot de passe</Text>
        </TouchableOpacity>
      </View>

      {/* Déconnexion */}
      <TouchableOpacity
        onPress={handleLogout}
        style={{
          backgroundColor: '#c62828',
          padding: 12,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 40,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>🚪 Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
    
  );
}
