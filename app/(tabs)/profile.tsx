import { db } from '@/FirebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { getAuth, updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
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
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const textColor = isDarkMode ? '#fff' : '#000';
  const backgroundColor = isDarkMode ? '#121212' : '#f5f5f5';
  const cardBg = isDarkMode ? '#1e1e1e' : '#fff';
  const inputBg = isDarkMode ? '#2a2a2a' : '#f9f9f9';
  const borderColor = isDarkMode ? '#333' : '#e0e0e0';
  const labelColor = isDarkMode ? '#999' : '#666';

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
    router.replace('/Login');
  };

  if (loading)
    return (
      <SafeAreaView style={{ 
        flex: 1, 
        backgroundColor,
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <ActivityIndicator size="large" color="#008a5c" />
        <Text style={{ color: textColor, marginTop: 10, fontSize: 16 }}>
          Chargement...
        </Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ 
          paddingHorizontal: 20, 
          paddingTop: 10, 
          paddingBottom: 30,
          alignItems: 'center',
        }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#008a5c',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 12,
          }}>
            <Ionicons name="person" size={40} color="#fff" />
          </View>
          <Text style={{ 
            fontSize: 24, 
            fontWeight: '700', 
            color: textColor,
            marginBottom: 4,
          }}>
            Mon Profil
          </Text>
          <Text style={{ fontSize: 15, color: labelColor }}>
            {client?.email || ''}
          </Text>
        </View>

        {/* Personal Information Card */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{
            backgroundColor: cardBg,
            borderRadius: 16,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="person-outline" size={20} color="#008a5c" />
              <Text style={{ 
                fontSize: 17, 
                fontWeight: '600', 
                color: textColor,
                marginLeft: 8,
              }}>
                Informations personnelles
              </Text>
            </View>

            {/* Full Name */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: labelColor, marginBottom: 6 }}>
                Nom complet
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: editing ? '#008a5c' : borderColor,
                borderRadius: 10,
                backgroundColor: editing ? inputBg : (isDarkMode ? '#252525' : '#f5f5f5'),
                paddingHorizontal: 12,
              }}>
                <Ionicons name="person-circle-outline" size={18} color={labelColor} />
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  editable={editing}
                  style={{
                    flex: 1,
                    padding: 12,
                    fontSize: 15,
                    color: textColor,
                  }}
                />
              </View>
            </View>

            {/* Email (disabled) */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: labelColor, marginBottom: 6 }}>
                Email
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: borderColor,
                borderRadius: 10,
                backgroundColor: isDarkMode ? '#252525' : '#f5f5f5',
                paddingHorizontal: 12,
                opacity: 0.6,
              }}>
                <Ionicons name="mail-outline" size={18} color={labelColor} />
                <TextInput
                  value={client?.email || ''}
                  editable={false}
                  style={{
                    flex: 1,
                    padding: 12,
                    fontSize: 15,
                    color: textColor,
                  }}
                />
              </View>
            </View>

            {/* Phone */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: labelColor, marginBottom: 6 }}>
                Téléphone
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: editing ? '#008a5c' : borderColor,
                borderRadius: 10,
                backgroundColor: editing ? inputBg : (isDarkMode ? '#252525' : '#f5f5f5'),
                paddingHorizontal: 12,
              }}>
                <Ionicons name="call-outline" size={18} color={labelColor} />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  editable={editing}
                  style={{
                    flex: 1,
                    padding: 12,
                    fontSize: 15,
                    color: textColor,
                  }}
                />
              </View>
            </View>

            {/* Location */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, color: labelColor, marginBottom: 6 }}>
                Localisation
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: editing ? '#008a5c' : borderColor,
                borderRadius: 10,
                backgroundColor: editing ? inputBg : (isDarkMode ? '#252525' : '#f5f5f5'),
                paddingHorizontal: 12,
              }}>
                <Ionicons name="location-outline" size={18} color={labelColor} />
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  editable={editing}
                  style={{
                    flex: 1,
                    padding: 12,
                    fontSize: 15,
                    color: textColor,
                  }}
                />
              </View>
            </View>

            {/* Edit/Save Button */}
            {editing ? (
              <TouchableOpacity
                onPress={handleSave}
                style={{
                  backgroundColor: '#008a5c',
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  shadowColor: '#008a5c',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 5,
                }}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
                  Enregistrer
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setEditing(true)}
                style={{
                  backgroundColor: '#008a5c',
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  shadowColor: '#008a5c',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 5,
                }}
              >
                <Ionicons name="create-outline" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
                  Modifier mes infos
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Change Password Card */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{
            backgroundColor: cardBg,
            borderRadius: 16,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="lock-closed-outline" size={20} color="#008a5c" />
              <Text style={{ 
                fontSize: 17, 
                fontWeight: '600', 
                color: textColor,
                marginLeft: 8,
              }}>
                Sécurité
              </Text>
            </View>

            {/* Old Password */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: labelColor, marginBottom: 6 }}>
                Ancien mot de passe
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: borderColor,
                borderRadius: 10,
                backgroundColor: inputBg,
                paddingHorizontal: 12,
              }}>
                <Ionicons name="key-outline" size={18} color={labelColor} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor={isDarkMode ? '#666' : '#999'}
                  style={{
                    flex: 1,
                    padding: 12,
                    fontSize: 15,
                    color: textColor,
                  }}
                />
              </View>
            </View>

            {/* New Password */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, color: labelColor, marginBottom: 6 }}>
                Nouveau mot de passe
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: borderColor,
                borderRadius: 10,
                backgroundColor: inputBg,
                paddingHorizontal: 12,
              }}>
                <Ionicons name="key-outline" size={18} color={labelColor} />
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor={isDarkMode ? '#666' : '#999'}
                  style={{
                    flex: 1,
                    padding: 12,
                    fontSize: 15,
                    color: textColor,
                  }}
                />
              </View>
            </View>

            {/* Change Password Button */}
            <TouchableOpacity
              onPress={handleChangePassword}
              style={{
                backgroundColor: '#008a5c',
                paddingVertical: 14,
                borderRadius: 10,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                shadowColor: '#008a5c',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
                Changer le mot de passe
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <View style={{ paddingHorizontal: 20, marginBottom: 40 }}>
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              backgroundColor: '#c62828',
              paddingVertical: 14,
              borderRadius: 10,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              shadowColor: '#c62828',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
              Se déconnecter
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}