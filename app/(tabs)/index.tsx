import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { db } from '@/FirebaseConfig';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [means, setMeans] = useState<'cash' | 'om' | 'momo'>('cash');
  const [loading, setLoading] = useState(false);
  const [idCommercial, setIdCommercial] = useState('');

  // 🎨 Couleurs selon le thème
  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? '#121212' : '#fff';
  const textColor = isDark ? '#fff' : '#000';
  const borderColor = isDark ? '#444' : '#ccc';
  const inputBackground = isDark ? '#1e1e1e' : '#fff';
  const placeholderColor = isDark ? '#aaa' : '#666';
  const cardBg = isDark ? '#1c1c1c' : '#f2f2f2';

  // 🔍 Récupération du commercial connecté ou redirection
  const fetchCurrentCommercial = async () => {
    try {
      const json = await AsyncStorage.getItem('currentCommercial');
      const commercial = json ? JSON.parse(json) : null;

      if (commercial) {
        setIdCommercial(commercial.idCommercial);
      } else {
        router.replace('/Login');
      }
    } catch (error) {
      console.error('Erreur récupération commercial :', error);
      router.replace('/Login');
    }
  };

  useEffect(() => {
    fetchCurrentCommercial();
  }, []);

  // 🔍 Rechercher les clients associés à ce commercial
  useEffect(() => {
    if (search.trim().length > 0 && idCommercial) {
      const fetchClients = async () => {
        try {
          const q = query(
            collection(db, 'Clients'),
            where('idCommerciale', '==', idCommercial)
          );
          const querySnapshot = await getDocs(q);
          const results = querySnapshot.docs
            .map((d) => d.data())
            .filter((c: any) =>
              c.fullName.toLowerCase().includes(search.toLowerCase())
            );
          setClients(results);
        } catch (error) {
          console.error('Erreur recherche client :', error);
        }
      };
      fetchClients();
    } else {
      setClients([]);
    }
  }, [search, idCommercial]);

  // 💸 Fonction d’enregistrement du dépôt
  const handleDeposit = async () => {
    if (!selectedClient) {
      Alert.alert('Erreur', 'Veuillez sélectionner un client.');
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide.');
      return;
    }

    setLoading(true);
    try {
      const clientRef = query(
        collection(db, 'Clients'),
        where('idClient', '==', selectedClient.idClient)
      );
      const querySnapshot = await getDocs(clientRef);
      if (!querySnapshot.empty) {
        const clientDoc = querySnapshot.docs[0];
        const currentBalance = clientDoc.data().balance || 0;
        const newBalance = currentBalance + Number(amount);

        await addDoc(collection(db, 'Transactions'), {
          idClient: selectedClient.idClient,
          idCommercial: idCommercial,
          means: means,
          amount: Number(amount),
          status: 'success',
          transactionTime: Timestamp.now(),
          type: 'deposite',
        });

        await updateDoc(doc(db, 'Clients', clientDoc.id), {
          balance: newBalance,
        });

        Alert.alert(
          'Succès',
          `Dépôt de ${amount} XAF ajouté pour ${selectedClient.fullName}.`
        );

        setAmount('');
        setSelectedClient(null);
        setSearch('');
        setClients([]);
      }
    } catch (error) {
      console.error('Erreur dépôt :', error);
      Alert.alert('Erreur', "Impossible d'effectuer le dépôt.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          flex: 1,
          width: '100%',
          paddingHorizontal: 20,
          paddingTop: 10,
        }}
      >
        {/* Header */}
        <View
          style={{
            height: 60,
            justifyContent: 'center',
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: Colors[colorScheme ?? 'light'].tint,
            }}
          >
            MICROTECH
          </Text>
        </View>

        {/* Recherche client */}
        <TextInput
          placeholder="Rechercher un client..."
          placeholderTextColor={placeholderColor}
          value={search}
          onChangeText={setSearch}
          style={{
            borderWidth: 1,
            borderColor,
            backgroundColor: inputBackground,
            color: textColor,
            padding: 10,
            marginBottom: 10,
            borderRadius: 8,
          }}
        />

        {/* Liste clients */}
        {clients.length > 0 && (
          <FlatList
            data={clients}
            keyExtractor={(item) => item.idClient}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setSelectedClient(item)}
                style={{
                  padding: 10,
                  backgroundColor:
                    selectedClient?.idClient === item.idClient
                      ? Colors[colorScheme ?? 'light'].tint
                      : cardBg,
                  borderRadius: 8,
                  marginBottom: 5,
                }}
              >
                <Text
                  style={{
                    color:
                      selectedClient?.idClient === item.idClient
                        ? '#fff'
                        : textColor,
                  }}
                >
                  {item.fullName}
                </Text>
                <Text
                  style={{
                    color:
                      selectedClient?.idClient === item.idClient
                        ? '#eee'
                        : placeholderColor,
                    fontSize: 12,
                  }}
                >
                  Solde : {item.balance} XAF
                </Text>
              </TouchableOpacity>
            )}
            style={{ maxHeight: 200, marginBottom: 10 }}
          />
        )}

        {/* Saisie du montant */}
        <TextInput
          placeholder="Montant du dépôt"
          placeholderTextColor={placeholderColor}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          style={{
            borderWidth: 1,
            borderColor,
            backgroundColor: inputBackground,
            color: textColor,
            padding: 10,
            marginBottom: 10,
            borderRadius: 8,
          }}
        />

        {/* Moyens de paiement */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          {['cash', 'om', 'momo'].map((m) => (
            <Pressable
              key={m}
              onPress={() => setMeans(m as any)}
              style={{
                padding: 10,
                width: '32%',
                alignItems: 'center',
                borderWidth: 1,
                borderColor:
                  means === m
                    ? Colors[colorScheme ?? 'light'].tint
                    : borderColor,
                backgroundColor:
                  means === m
                    ? Colors[colorScheme ?? 'light'].tint
                    : 'transparent',
                
              }}
            >
              <Text
                style={{
                  color: means === m ? '#fff' : textColor,
                  textTransform: 'capitalize',
                }}
              >
                {m}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Bouton */}
        <Pressable
          onPress={handleDeposit}
          disabled={loading}
          style={{
            backgroundColor: Colors[colorScheme ?? 'light'].tint,
            padding: 15,
            borderRadius: 10,
            alignItems: 'center',
            marginTop: 'auto',
          }}
        >
          {loading ? (
            <LottieView
              source={require('../../assets/animations/inProgress.json')}
              autoPlay
              loop
              style={{
                width: 60,
                height: 60,
              }}
            />
          ) : (
            <Text
              style={{
                color: '#fff',
                fontSize: 18,
                fontWeight: 'bold',
              }}
            >
              Nouveau Dépôt
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
