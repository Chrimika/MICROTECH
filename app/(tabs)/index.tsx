import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  TouchableOpacity,
  Alert,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { Ionicons } from '@expo/vector-icons';

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

  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? '#121212' : '#f5f5f5';
  const textColor = isDark ? '#fff' : '#000';
  const borderColor = isDark ? '#333' : '#e0e0e0';
  const cardBg = isDark ? '#1e1e1e' : '#fff';
  const inputBg = isDark ? '#2a2a2a' : '#f9f9f9';
  const placeholderColor = isDark ? '#666' : '#999';
  const labelColor = isDark ? '#999' : '#666';

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

  const getMeansIcon = (m: string) => {
    switch (m) {
      case 'cash': return 'cash-outline';
      case 'om': return 'phone-portrait-outline';
      case 'momo': return 'phone-portrait-outline';
      default: return 'cash-outline';
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* Header */}
        <View style={{ paddingVertical: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <View style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#008a5c',
              marginRight: 8,
            }} />
            <Text style={{
              fontSize: 28,
              fontWeight: '700',
              color: Colors[colorScheme ?? 'light'].tint,
            }}>
              MICROTECH
            </Text>
          </View>
          <Text style={{ fontSize: 15, color: labelColor, marginLeft: 16 }}>
            Effectuer un dépôt client
          </Text>
        </View>

        {/* Search Client */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, color: labelColor, marginBottom: 8, fontWeight: '500' }}>
            Rechercher un client
          </Text>
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
              placeholder="Nom du client..."
              placeholderTextColor={placeholderColor}
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
        {clients.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: labelColor, marginBottom: 8, fontWeight: '500' }}>
              {clients.length} client{clients.length > 1 ? 's' : ''} trouvé{clients.length > 1 ? 's' : ''}
            </Text>
            <FlatList
              data={clients}
              keyExtractor={(item) => item.idClient}
              renderItem={({ item }) => {
                const isSelected = selectedClient?.idClient === item.idClient;
                return (
                  <TouchableOpacity
                    onPress={() => setSelectedClient(item)}
                    style={{
                      padding: 14,
                      backgroundColor: isSelected ? '#008a5c' : cardBg,
                      borderRadius: 12,
                      marginBottom: 8,
                      borderWidth: 1.5,
                      borderColor: isSelected ? '#008a5c' : borderColor,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Ionicons 
                          name="person-circle" 
                          size={20} 
                          color={isSelected ? '#fff' : textColor} 
                        />
                        <Text style={{
                          color: isSelected ? '#fff' : textColor,
                          fontSize: 15,
                          fontWeight: '600',
                          marginLeft: 6,
                        }}>
                          {item.fullName}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons 
                          name="wallet-outline" 
                          size={14} 
                          color={isSelected ? '#e6fff4' : labelColor} 
                        />
                        <Text style={{
                          color: isSelected ? '#e6fff4' : labelColor,
                          fontSize: 13,
                          marginLeft: 4,
                        }}>
                          Solde: {item.balance.toLocaleString()} XAF
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#fff" />
                    )}
                  </TouchableOpacity>
                );
              }}
              style={{ maxHeight: 240 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {/* Selected Client Card */}
        {selectedClient && (
          <View style={{
            backgroundColor: '#e6fff4',
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#008a5c',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 13, color: '#006644', marginBottom: 2 }}>
                  Client sélectionné
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#008a5c' }}>
                  {selectedClient.fullName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedClient(null)}>
                <Ionicons name="close-circle" size={24} color="#008a5c" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Amount Input */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, color: labelColor, marginBottom: 8, fontWeight: '500' }}>
            Montant du dépôt
          </Text>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: borderColor,
            borderRadius: 12,
            backgroundColor: inputBg,
            paddingHorizontal: 12,
          }}>
            <Ionicons name="card-outline" size={20} color={labelColor} />
            <TextInput
              placeholder="5000"
              placeholderTextColor={placeholderColor}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              style={{
                flex: 1,
                padding: 12,
                fontSize: 17,
                color: textColor,
              }}
            />
            <Text style={{ color: labelColor, fontSize: 15 }}>XAF</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 13, color: labelColor, marginBottom: 8, fontWeight: '500' }}>
            Moyen de paiement
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['cash', 'om', 'momo'] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => setMeans(m)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
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
                  color={means === m ? '#008a5c' : labelColor} 
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
              </Pressable>
            ))}
          </View>
        </View>

        {/* Deposit Button */}
        <Pressable
          onPress={handleDeposit}
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
              <Ionicons name="add-circle-outline" size={22} color="#fff" />
              <Text style={{
                color: '#fff',
                fontSize: 17,
                fontWeight: '700',
                marginLeft: 8,
              }}>
                Effectuer le dépôt
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}