import { Colors } from '@/constants/theme';
import { db } from '@/FirebaseConfig';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import LottieView from 'lottie-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function TabTwoScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const [idCommercial, setIdCommercial] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? '#121212' : '#f5f5f5';
  const textColor = isDark ? '#fff' : '#000';
  const borderColor = isDark ? '#333' : '#e0e0e0';
  const cardBg = isDark ? '#1e1e1e' : '#fff';
  const inputBg = isDark ? '#2a2a2a' : '#f9f9f9';
  const labelColor = isDark ? '#999' : '#666';

  useEffect(() => {
    const fetchCommercial = async () => {
      try {
        const json = await AsyncStorage.getItem('currentCommercial');
        const commercial = json ? JSON.parse(json) : null;
        if (commercial?.idCommercial) {
          setIdCommercial(commercial.idCommercial);
        } else {
          console.warn('⚠️ Aucun commercial connecté trouvé dans AsyncStorage');
        }
      } catch (e) {
        console.error('Erreur récupération commercial :', e);
      }
    };
    fetchCommercial();
  }, []);

  useEffect(() => {
    if (!idCommercial) return;

    setLoading(true);
    const q = query(
      collection(db, 'Clients'),
      where('idCommerciale', '==', idCommercial),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClients(data);
        setLoading(false);
      },
      (error) => {
        console.error('Erreur realtime clients :', error);
        Alert.alert('Erreur', 'Impossible de charger vos clients.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [idCommercial]);

  const filteredClients = useMemo(() => {
    return clients.filter((c) =>
      c.fullName?.toLowerCase().includes(search.toLowerCase())
    );
  }, [clients, search]);

  const handleSaveClient = async () => {
    if (!fullName.trim() || !phone.trim() || !location.trim() || !email.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    try {
      setSaving(true);

      if (editMode && selectedClient) {
        const cDoc = doc(db, 'Clients', selectedClient.id);
        await updateDoc(cDoc, { fullName, phone, location, email });
        Alert.alert('Succès', 'Client mis à jour.');
      } else {
        const idClient = Date.now().toString();
        const auth = getAuth();

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          '000000'
        );

        const user = userCredential.user;

        await addDoc(collection(db, 'Clients'), {
          idClient,
          fullName,
          phone,
          location,
          email,
          uid: user.uid,
          balance: 0,
          idCommerciale: idCommercial,
          createdAt: serverTimestamp(),
        });
        
        Alert.alert('Succès', 'Client ajouté et compte créé avec succès.');
      }

      setShowModal(false);
      setFullName('');
      setPhone('');
      setLocation('');
      setEmail('');
      setSelectedClient(null);
      setEditMode(false);
    } catch (error: any) {
      console.error('Erreur ajout/màj client :', error);
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Erreur', 'Cet email est déjà utilisé.');
      } else {
        Alert.alert('Erreur', "Impossible d'enregistrer le client.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEditClient = (client: any) => {
    setSelectedClient(client);
    setFullName(client.fullName);
    setPhone(client.phone);
    setLocation(client.location);
    setEmail(client.email || '');
    setEditMode(true);
    setShowModal(true);
  };

  if (loading)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#008a5c" />
        <Text style={{ color: textColor, marginTop: 10, fontSize: 16 }}>
          Chargement des clients...
        </Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 28, fontWeight: '700', color: textColor }}>
              Mes Clients
            </Text>
            <Text style={{ fontSize: 15, color: labelColor, marginTop: 4 }}>
              {clients.length} client{clients.length > 1 ? 's' : ''} au total
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setShowModal(true);
              setEditMode(false);
              setFullName('');
              setPhone('');
              setLocation('');
              setEmail('');
            }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#008a5c',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#008a5c',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1.5,
          borderColor: borderColor,
          borderRadius: 12,
          backgroundColor: inputBg,
          paddingHorizontal: 12,
        }}>
          <Ionicons name="search-outline" size={20} color={labelColor} />
          <TextInput
            placeholder="Rechercher un client..."
            placeholderTextColor={isDark ? '#666' : '#999'}
            value={search}
            onChangeText={setSearch}
            style={{
              flex: 1,
              padding: 12,
              fontSize: 15,
              color: textColor,
            }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={labelColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Client List */}
      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={{
            backgroundColor: cardBg,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: borderColor,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#008a5c',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                  {item.fullName?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '600', color: textColor, marginBottom: 2 }}>
                  {item.fullName}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="call-outline" size={12} color={labelColor} />
                  <Text style={{ fontSize: 13, color: labelColor, marginLeft: 4 }}>
                    {item.phone}
                  </Text>
                </View>
              </View>
            </View>

            {/* Info Grid */}
            <View style={{
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: borderColor,
              marginBottom: 12,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="location-outline" size={16} color={labelColor} />
                <Text style={{ fontSize: 13, color: labelColor, marginLeft: 6 }}>
                  {item.location}
                </Text>
              </View>
              {item.email && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="mail-outline" size={16} color={labelColor} />
                  <Text style={{ fontSize: 13, color: labelColor, marginLeft: 6 }}>
                    {item.email}
                  </Text>
                </View>
              )}
            </View>

            {/* Balance & Action */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{
                backgroundColor: '#e6fff4',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
              }}>
                <Text style={{ fontSize: 11, color: '#006644', marginBottom: 2 }}>
                  Solde
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#008a5c' }}>
                  {item.balance?.toLocaleString() ?? 0} XAF
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleEditClient(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: borderColor,
                }}
              >
                <Ionicons name="create-outline" size={16} color={textColor} />
                <Text style={{ color: textColor, marginLeft: 6, fontSize: 14, fontWeight: '600' }}>
                  Modifier
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Ionicons name="people-outline" size={40} color={labelColor} />
            </View>
            <Text style={{ color: labelColor, fontSize: 16, fontWeight: '500' }}>
              Aucun client
            </Text>
            <Text style={{ color: labelColor, fontSize: 14, marginTop: 4, textAlign: 'center' }}>
              Ajoutez votre premier client
            </Text>
          </View>
        )}
      />

      {/* Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}>
          <View style={{
            backgroundColor: cardBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            maxHeight: '90%',
          }}>
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons 
                  name={editMode ? "create-outline" : "person-add-outline"} 
                  size={24} 
                  color="#008a5c" 
                />
                <Text style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: textColor,
                  marginLeft: 8,
                }}>
                  {editMode ? 'Modifier le client' : 'Nouveau client'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close-circle" size={28} color={labelColor} />
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={{ gap: 16 }}>
              <View>
                <Text style={{ fontSize: 13, color: labelColor, marginBottom: 6, fontWeight: '500' }}>
                  Nom complet
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
                  <Ionicons name="person-outline" size={18} color={labelColor} />
                  <TextInput
                    placeholder="Jean Dupont"
                    placeholderTextColor={isDark ? '#666' : '#999'}
                    value={fullName}
                    onChangeText={setFullName}
                    style={{
                      flex: 1,
                      padding: 12,
                      fontSize: 15,
                      color: textColor,
                    }}
                  />
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 13, color: labelColor, marginBottom: 6, fontWeight: '500' }}>
                  Email
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
                  <Ionicons name="mail-outline" size={18} color={labelColor} />
                  <TextInput
                    placeholder="email@exemple.com"
                    placeholderTextColor={isDark ? '#666' : '#999'}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{
                      flex: 1,
                      padding: 12,
                      fontSize: 15,
                      color: textColor,
                    }}
                  />
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 13, color: labelColor, marginBottom: 6, fontWeight: '500' }}>
                  Téléphone
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
                  <Ionicons name="call-outline" size={18} color={labelColor} />
                  <TextInput
                    placeholder="+237 6XX XX XX XX"
                    placeholderTextColor={isDark ? '#666' : '#999'}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    style={{
                      flex: 1,
                      padding: 12,
                      fontSize: 15,
                      color: textColor,
                    }}
                  />
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 13, color: labelColor, marginBottom: 6, fontWeight: '500' }}>
                  Localisation
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
                  <Ionicons name="location-outline" size={18} color={labelColor} />
                  <TextInput
                    placeholder="Yaoundé, Cameroun"
                    placeholderTextColor={isDark ? '#666' : '#999'}
                    value={location}
                    onChangeText={setLocation}
                    style={{
                      flex: 1,
                      padding: 12,
                      fontSize: 15,
                      color: textColor,
                    }}
                  />
                </View>
              </View>

              {!editMode && (
                <View style={{
                  backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
                  padding: 12,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  <Ionicons name="information-circle-outline" size={18} color={labelColor} />
                  <Text style={{ fontSize: 12, color: labelColor, marginLeft: 8, flex: 1 }}>
                    Le mot de passe par défaut sera : 000000
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 10,
                  backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: borderColor,
                }}
              >
                <Text style={{ color: textColor, fontSize: 16, fontWeight: '600' }}>
                  Annuler
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveClient}
                disabled={saving}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 10,
                  backgroundColor: saving ? '#ccc' : '#008a5c',
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  shadowColor: '#008a5c',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: saving ? 0 : 0.3,
                  shadowRadius: 8,
                  elevation: saving ? 0 : 5,
                }}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons 
                      name={editMode ? "checkmark-circle-outline" : "add-circle-outline"} 
                      size={20} 
                      color="#fff" 
                    />
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                      {editMode ? 'Mettre à jour' : 'Ajouter'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}