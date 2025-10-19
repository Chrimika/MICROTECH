import { Colors } from '@/constants/theme';
import { db } from '@/FirebaseConfig';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth'; // 👈 à ajouter en haut
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
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


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

  // 🧩 Charger le commercial connecté
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

  // 🔁 Écoute en temps réel des clients de ce commercial
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

  // 🔍 Recherche filtrée
  const filteredClients = useMemo(() => {
    return clients.filter((c) =>
      c.fullName?.toLowerCase().includes(search.toLowerCase())
    );
  }, [clients, search]);

  // ➕ / ✏️ Ajout ou modification d’un client
  const handleSaveClient = async () => {
  if (!fullName.trim() || !phone.trim() || !location.trim() || !email.trim()) {
    Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
    return;
  }

  try {

    if (editMode && selectedClient) {
      // 🔁 Mise à jour
      setLoading(true);
      const cDoc = doc(db, 'Clients', selectedClient.id);
      await updateDoc(cDoc, { fullName, phone, location, email });
      Alert.alert('Succès', 'Client mis à jour.');
      setLoading(false);
    } else {
      // ➕ Ajout
      const idClient = Date.now().toString();
      const auth = getAuth();
      setLoading(true);

      // 👇 Création du compte Auth avec mot de passe par défaut
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
        uid: user.uid, // 👈 on garde l'UID pour référence
        balance: 0,
        idCommerciale: idCommercial,
        createdAt: serverTimestamp(),
      });
      
      Alert.alert('Succès', 'Client ajouté et compte créé avec succès.');
      setLoading(false);
    }

    // 🔄 Réinitialisation
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
  }
};

  // 🧰 Mode édition
  const handleEditClient = (client: any) => {
    setSelectedClient(client);
    setFullName(client.fullName);
    setPhone(client.phone);
    setLocation(client.location);
    setEditMode(true);
    setShowModal(true);
  };

  if (loading)
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor:
            colorScheme === 'dark' ? '#000' : 'rgba(0,0,0,0.5)',
        }}
      >
        <View
          style={{
            backgroundColor: colorScheme === 'dark' ? '#111' : '#fff',
            paddingVertical: 20,
            justifyContent: 'center',
            alignItems: 'center',
            width: 150,
          }}
        >
          <LottieView
            source={require('../../assets/animations/inProgress.json')}
            autoPlay
            loop
            style={{
              width: 60,
              height: 60,
            }}
          />
          <Text
            style={{
              color: colorScheme === 'dark' ? '#fff' : '#000',
            }}
          >
            Chargement...
          </Text>
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView
      style={{
        flex: 1,
        padding: 16,
        backgroundColor: colorScheme === 'dark' ? '#000' : '#f2f2f2',
      }}
    >
      {/* Header */}
      <Text
        style={{
          fontSize: 22,
          fontWeight: 'bold',
          color: Colors[colorScheme ?? 'light'].tint,
          textAlign: 'center',
          marginBottom: 10,
        }}
      >
        Mes Clients
      </Text>

      {/* Recherche */}
      <View style={{ flexDirection: 'row', marginBottom: 10, gap: 8 }}>
        <TextInput
          placeholder="Rechercher un client..."
          placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
          value={search}
          onChangeText={setSearch}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#ccc',
            paddingHorizontal: 10,
            height: 40,
            color: colorScheme === 'dark' ? '#fff' : '#000',
            backgroundColor: colorScheme === 'dark' ? '#111' : '#fff',
          }}
        />
        <TouchableOpacity
          onPress={() => {
            setShowModal(true);
            setEditMode(false);
            setFullName('');
            setPhone('');
            setLocation('');
          }}
          style={{
            backgroundColor: Colors[colorScheme ?? 'light'].tint,
            padding: 10,
            width: 40,
            height: 40,
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Liste clients */}
      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: colorScheme === 'dark' ? '#111' : '#fff',
              padding: 12,
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                fontWeight: 'bold',
                fontSize: 16,
                color: colorScheme === 'dark' ? '#fff' : '#000',
              }}
            >
              {item.fullName}
            </Text>
            <Text style={{ color: '#888', fontSize: 13 }}>{item.phone}</Text>
            <Text style={{ color: '#888', fontSize: 13 }}>📍 {item.location}</Text>
            <Text
              style={{
                color: Colors[colorScheme ?? 'light'].tint,
                fontWeight: 'bold',
                marginTop: 5,
              }}
            >
              Solde : {item.balance?.toFixed(2) ?? 0} XAF
            </Text>

            <TouchableOpacity
              onPress={() => handleEditClient(item)}
              style={{
                alignSelf: 'flex-end',
                marginTop: 8,
                backgroundColor: '#007bff',
                paddingVertical: 6,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ color: '#fff' }}>Modifier</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Modal ajout/modif */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: colorScheme === 'dark' ? '#111' : '#fff',
              padding: 20,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: Colors[colorScheme ?? 'light'].tint,
                textAlign: 'center',
                marginBottom: 10,
              }}
            >
              {editMode ? 'Modifier le client' : 'Ajouter un client'}
            </Text>

            <TextInput
              placeholder="Nom complet"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              value={fullName}
              onChangeText={setFullName}
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                paddingHorizontal: 10,
                height: 40,
                color: colorScheme === 'dark' ? '#fff' : '#000',
                backgroundColor: colorScheme === 'dark' ? '#111' : '#fff',
              }}
            />
            <TextInput
                placeholder="Email"
                placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  paddingHorizontal: 10,
                  height: 40,
                  color: colorScheme === 'dark' ? '#fff' : '#000',
                  backgroundColor: colorScheme === 'dark' ? '#111' : '#fff',
                }}
              />

            <TextInput
              placeholder="Téléphone"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                paddingHorizontal: 10,
                height: 40,
                color: colorScheme === 'dark' ? '#fff' : '#000',
                backgroundColor: colorScheme === 'dark' ? '#111' : '#fff',
              }}
            />
            <TextInput
              placeholder="Localisation"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              value={location}
              onChangeText={setLocation}
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                paddingHorizontal: 10,
                height: 40,
                color: colorScheme === 'dark' ? '#fff' : '#000',
                backgroundColor: colorScheme === 'dark' ? '#111' : '#fff',
              }}
            />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 15,
              }}
            >
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={{
                  backgroundColor: 'gray',
                  padding: 10,
                  width: '45%',
                }}
              >
                <Text style={{ color: '#fff', textAlign: 'center' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveClient}
                style={{
                  backgroundColor: Colors[colorScheme ?? 'light'].tint,
                  padding: 10,
                  width: '45%',
                }}
              >
                <Text style={{ color: '#fff', textAlign: 'center' }}>
                  {editMode ? 'Mettre à jour' : 'Ajouter'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
