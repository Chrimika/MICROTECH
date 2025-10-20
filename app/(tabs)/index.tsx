import { db } from '@/FirebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router'; // ✅ Import du router
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [client, setClient] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [means, setMeans] = useState<'cash' | 'om' | 'momo'>('cash');
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const textColor = isDarkMode ? '#fff' : '#000';
  const backgroundColor = isDarkMode ? '#121212' : '#fff';
  const inputBg = isDarkMode ? '#1e1e1e' : '#f2f2f2';
  const borderColor = isDarkMode ? '#333' : '#ccc';
  const router = useRouter(); // ✅ initialisation du router

  // 🔹 Charger le client connecté
  useEffect(() => {
    const loadClient = async () => {
      try {
        const json = await AsyncStorage.getItem('currentClient');
        if (json) {
          const parsed = JSON.parse(json);
          if (parsed && parsed.idClient) {
            setClient(parsed);
          } else {
            router.replace('/Login'); // 👈 Redirige si invalide
          }
        } else {
          router.replace('/Login'); // 👈 Redirige si vide
        }
      } catch (err) {
        console.error('Erreur chargement client :', err);
        router.replace('/Login'); // 👈 En cas d’erreur de lecture
      }
    };
    loadClient();
  }, []);

  const handleWithdraw = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return Alert.alert('Erreur', 'Veuillez entrer un montant valide.');
    }
    if (Number(amount) > client.balance) {
      return Alert.alert('Erreur', 'Solde insuffisant pour ce retrait.');
    }

    setLoading(true);
    try {
      const newBalance = client.balance - Number(amount);

      // ✅ Créer la transaction dans Firestore
      await addDoc(collection(db, 'Transactions'), {
        idClient: client.idClient,
        idCommercial: client.idCommerciale,
        means,
        amount: Number(amount),
        status: 'pending', // 👈 en attente de validation
        transactionTime: Timestamp.now(),
        type: 'withdraw',
      });

      // ✅ Mettre à jour le solde du client dans Firestore
      const q = query(collection(db, 'Clients'), where('idClient', '==', client.idClient));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docRef = doc(db, 'Clients', snap.docs[0].id);
        await updateDoc(docRef, { balance: newBalance });
      }

      // ✅ Mettre à jour en local aussi
      const updatedClient = { ...client, balance: newBalance };
      await AsyncStorage.setItem('currentClient', JSON.stringify(updatedClient));
      setClient(updatedClient);
      setAmount('');

      Alert.alert('Demande envoyée', 'Votre demande de retrait est en attente de validation.');
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', "Une erreur s'est produite, veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (!client)
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#008a5c" />
        <Text style={{ color: textColor, marginTop: 10 }}>Chargement du compte...</Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor,
        paddingHorizontal: 20,
        paddingTop: 30,
      }}
    >
      {/* Header */}
      <Text
        style={{
          fontSize: 24,
          fontWeight: 'bold',
          color: textColor,
          textAlign: 'center',
        }}
      >
        Bonjour, {client.fullName.split(' ')[0]} 👋
      </Text>

      {/* Solde */}
      <View
        style={{
          marginTop: 40,
          backgroundColor: isDarkMode ? '#1e1e1e' : '#e6fff4',
          borderRadius: 12,
          padding: 20,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#008a5c', fontSize: 16 }}>Solde disponible</Text>
        <Text
          style={{
            color: textColor,
            fontSize: 36,
            fontWeight: 'bold',
            marginTop: 10,
          }}
        >
          {client.balance.toLocaleString()} XAF
        </Text>
      </View>

      {/* Saisie du montant */}
      <Text style={{ marginTop: 40, color: textColor, fontSize: 16 }}>Montant du retrait</Text>
      <TextInput
        placeholder="Ex: 5000"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        style={{
          borderWidth: 1,
          borderColor,
          borderRadius: 8,
          padding: 10,
          marginTop: 10,
          backgroundColor: inputBg,
          color: textColor,
        }}
        placeholderTextColor={isDarkMode ? '#999' : '#666'}
      />

      {/* Choix du moyen */}
      <Text style={{ marginTop: 20, color: textColor, fontSize: 16 }}>Moyen de retrait</Text>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 10,
        }}
      >
        {['cash', 'om', 'momo'].map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => setMeans(m as any)}
            style={{
              width: '30%',
              padding: 10,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: means === m ? '#008a5c' : borderColor,
              backgroundColor: means === m ? '#008a5c' : 'transparent',
              
            }}
          >
            <Text style={{ color: means === m ? '#fff' : textColor, textTransform: 'capitalize' }}>
              {m}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bouton retrait */}
      <TouchableOpacity
        onPress={handleWithdraw}
        disabled={loading}
        style={{
          backgroundColor: '#008a5c',
          padding: 15,
          
          alignItems: 'center',
          marginTop: 'auto'
        }}
      >
        {loading ? (
          <LottieView
            source={require('../../assets/animations/inProgress.json')}
            autoPlay
            loop
            style={{ width: 50, height: 50 }}
          />
        ) : (
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Demander un retrait</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}
