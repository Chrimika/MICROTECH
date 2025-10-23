import { db } from '@/FirebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
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
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const [client, setClient] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [means, setMeans] = useState<'cash' | 'om' | 'momo'>('cash');
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const textColor = isDarkMode ? '#fff' : '#000';
  const backgroundColor = isDarkMode ? '#121212' : '#f5f5f5';
  const cardBg = isDarkMode ? '#1e1e1e' : '#fff';
  const inputBg = isDarkMode ? '#2a2a2a' : '#f9f9f9';
  const borderColor = isDarkMode ? '#333' : '#e0e0e0';
  const router = useRouter();

  useEffect(() => {
    const loadClient = async () => {
      try {
        const json = await AsyncStorage.getItem('currentClient');
        if (json) {
          const parsed = JSON.parse(json);
          if (parsed && parsed.idClient) {
            setClient(parsed);
          } else {
            router.replace('/Login');
          }
        } else {
          router.replace('/Login');
        }
      } catch (err) {
        console.error('Erreur chargement client :', err);
        router.replace('/Login');
      }
    };
    loadClient();
  }, []);
  
  useEffect(() => {
    if (!client?.idClient) return;
    const q = query(collection(db, 'Clients'), where('idClient', '==', client.idClient));
    const unsubscribe = onSnapshot(
      q,
      async (snap) => {
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const data = { ...docSnap.data(), _docId: docSnap.id };
          setClient((prev) => ({ ...prev, ...data }));
          try {
            await AsyncStorage.setItem('currentClient', JSON.stringify({ ...client, ...data }));
          } catch (e) {
            console.error('Erreur mise à jour AsyncStorage depuis onSnapshot:', e);
          }
        } else {
          router.replace('/Login');
        }
      },
      (error) => {
        console.error('onSnapshot error:', error);
      }
    );

    return () => unsubscribe();
  }, [client?.idClient]);

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

      await addDoc(collection(db, 'Transactions'), {
        idClient: client.idClient,
        idCommercial: client.idCommerciale,
        means,
        amount: Number(amount),
        status: 'pending',
        transactionTime: Timestamp.now(),
        type: 'withdraw',
      });

      const q = query(collection(db, 'Clients'), where('idClient', '==', client.idClient));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docRef = doc(db, 'Clients', snap.docs[0].id);
        await updateDoc(docRef, { balance: newBalance });
      }

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

  const getMeansIcon = (m: string) => {
    switch (m) {
      case 'cash': return 'cash-outline';
      case 'om': return 'phone-portrait-outline';
      case 'momo': return 'phone-portrait-outline';
      default: return 'cash-outline';
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
        <Text style={{ color: textColor, marginTop: 10, fontSize: 16 }}>
          Chargement...
        </Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor,
      }}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
        <Text style={{ fontSize: 16, color: isDarkMode ? '#999' : '#666' }}>
          Bienvenue
        </Text>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: textColor,
            marginTop: 4,
          }}
        >
          {client.fullName.split(' ')[0]} 👋
        </Text>
      </View>

      {/* Balance Card */}
      <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
        <View
          style={{
            backgroundColor: '#008a5c',
            borderRadius: 16,
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 5,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="wallet-outline" size={22} color="#fff" />
            <Text style={{ color: '#e6fff4', fontSize: 15, marginLeft: 8 }}>
              Solde disponible
            </Text>
          </View>
          <Text
            style={{
              color: '#fff',
              fontSize: 40,
              fontWeight: '700',
              letterSpacing: -1,
            }}
          >
            {client.balance.toLocaleString()} XAF
          </Text>
        </View>
      </View>

      {/* Withdrawal Form */}
      <View style={{ 
        flex: 1,
        backgroundColor: cardBg, 
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 20,
        paddingTop: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
      }}>
        {/* Amount Input */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ 
            color: textColor, 
            fontSize: 15, 
            fontWeight: '600',
            marginBottom: 10 
          }}>
            Montant du retrait
          </Text>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: borderColor,
            borderRadius: 12,
            backgroundColor: inputBg,
            paddingHorizontal: 16,
          }}>
            <Ionicons name="card-outline" size={20} color={isDarkMode ? '#999' : '#666'} />
            <TextInput
              placeholder="5000"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              style={{
                flex: 1,
                padding: 14,
                fontSize: 17,
                color: textColor,
              }}
              placeholderTextColor={isDarkMode ? '#666' : '#999'}
            />
            <Text style={{ color: isDarkMode ? '#999' : '#666', fontSize: 15 }}>XAF</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={{ marginBottom: 30 }}>
          <Text style={{ 
            color: textColor, 
            fontSize: 15, 
            fontWeight: '600',
            marginBottom: 10 
          }}>
            Moyen de retrait
          </Text>
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
            }}
          >
            {(['cash', 'om', 'momo'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMeans(m)}
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  alignItems: 'center',
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: means === m ? '#008a5c' : borderColor,
                  backgroundColor: means === m ? '#e6fff4' : inputBg,
                }}
              >
                <Ionicons 
                  name={getMeansIcon(m) as any} 
                  size={24} 
                  color={means === m ? '#008a5c' : (isDarkMode ? '#999' : '#666')} 
                />
                <Text style={{ 
                  color: means === m ? '#008a5c' : textColor, 
                  textTransform: 'uppercase',
                  fontSize: 13,
                  fontWeight: '600',
                  marginTop: 6,
                }}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Withdraw Button */}
        <TouchableOpacity
          onPress={handleWithdraw}
          disabled={loading}
          style={{
            backgroundColor: loading ? '#ccc' : '#008a5c',
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginTop: 'auto',
            marginBottom: 20,
            shadowColor: '#008a5c',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: loading ? 0 : 0.3,
            shadowRadius: 8,
            elevation: loading ? 0 : 5,
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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="arrow-down-circle-outline" size={22} color="#fff" />
              <Text style={{ 
                color: '#fff', 
                fontSize: 17, 
                fontWeight: '700',
                marginLeft: 8,
              }}>
                Demander un retrait
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}