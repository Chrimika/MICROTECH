import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Pressable,
  Modal,
} from 'react-native';
import { db } from '@/FirebaseConfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  orderBy,
  increment,
} from 'firebase/firestore';
import { format, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';

export default function TabFourScreen() {
  const colorScheme = useColorScheme();
  const [idCommercial, setIdCommercial] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const [rejectionModal, setRejectionModal] = useState<{
    visible: boolean;
    transactionId: string | null;
    amount: number;
    clientId: string;
  }>({ visible: false, transactionId: null, amount: 0, clientId: '' });
  const [rejectionReason, setRejectionReason] = useState('');

  const backgroundColor = colorScheme === 'dark' ? '#000' : '#f2f2f2';
  const textColor = colorScheme === 'dark' ? '#fff' : '#000';
  const cardColor = colorScheme === 'dark' ? '#111' : '#fff';
  const borderColor = colorScheme === 'dark' ? '#444' : '#ccc';
  const secondaryText = colorScheme === 'dark' ? '#bbb' : '#666';
  const filterBg = colorScheme === 'dark' ? '#222' : '#f0f0f0';

  // 🧠 Charger le commercial connecté
  useEffect(() => {
    const fetchCommercial = async () => {
      try {
        const json = await AsyncStorage.getItem('currentCommercial');
        const commercial = json ? JSON.parse(json) : null;
        if (commercial) {
          console.log('✅ Commercial connecté :', commercial.idCommercial);
          setIdCommercial(commercial.idCommercial);
        } else {
          console.log('⚠️ Aucun commercial trouvé dans AsyncStorage');
        }
      } catch (error) {
        console.error('Erreur AsyncStorage :', error);
      }
    };
    fetchCommercial();
  }, []);

  // 🔁 Écoute temps réel
  useEffect(() => {
    if (!idCommercial) return;

    console.log('🔁 Initialisation écoute en temps réel pour', idCommercial);

    const tQuery = query(
      collection(db, 'Transactions'),
      where('idCommercial', '==', idCommercial),
      orderBy('transactionTime', 'desc')
    );

    const cQuery = query(collection(db, 'Clients'), where('idCommerciale', '==', idCommercial));

    const unsubTransactions = onSnapshot(
      tQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        console.log(`📦 ${data.length} transactions chargées`);
        setTransactions(data);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Erreur realtime transactions :', error);
        Alert.alert('Erreur', 'Impossible de charger les transactions en temps réel.');
        setLoading(false);
      }
    );

    const unsubClients = onSnapshot(
      cQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => doc.data());
        console.log(`👥 ${data.length} clients chargés`);
        setClients(data);
      },
      (error) => console.error('❌ Erreur realtime clients :', error)
    );

    return () => {
      console.log('🧹 Arrêt écoute realtime');
      unsubTransactions();
      unsubClients();
    };
  }, [idCommercial]);

  // 🔗 Jointure + filtres
  const enrichedTransactions = useMemo(() => {
    const joined = transactions.map((t) => {
      const client = clients.find((c) => c.idClient === t.idClient);
      return { ...t, clientName: client ? client.fullName : 'Client inconnu' };
    });

    const filtered = joined.filter((t) => {
      const date = t.transactionTime?.toDate?.() || new Date();
      if (filterPeriod === 'today') return isToday(date);
      if (filterPeriod === 'week') return isThisWeek(date, { weekStartsOn: 1 });
      if (filterPeriod === 'month') return isThisMonth(date);
      return true;
    });

    const searched = filtered.filter((t) => t.clientName.toLowerCase().includes(search.toLowerCase()));

    return searched.sort((a, b) => {
      const aDate = a.transactionTime?.toDate?.() || new Date();
      const bDate = b.transactionTime?.toDate?.() || new Date();
      return sortAsc ? aDate - bDate : bDate - aDate;
    });
  }, [transactions, clients, search, sortAsc, filterPeriod]);

  // ✅ Valider
  const handleStatusUpdate = async (transactionId: string, status: 'success' | 'failure', reason?: string) => {
    try {
      const tDoc = doc(db, 'Transactions', transactionId);

      if (status === 'failure' && reason) {
        // Remboursement client
        const transaction = transactions.find((t) => t.id === transactionId);
        if (transaction) {
          const cDoc = doc(db, 'Clients', transaction.clientId);
          await updateDoc(cDoc, { balance: increment(transaction.amount) });
        }
        await updateDoc(tDoc, { status: 'rejected', rejectionReason: reason });
      } else {
        await updateDoc(tDoc, { status: 'success' });
      }

      Alert.alert('Succès', status === 'success' ? 'Transaction validée.' : 'Transaction rejetée.');
      setRejectionModal({ visible: false, transactionId: null, amount: 0, clientId: '' });
      setRejectionReason('');
    } catch (error) {
      console.error('Erreur update transaction :', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut.');
    }
  };

  if (loading)
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor }}>
        <View
          style={{
            backgroundColor: cardColor,
            paddingVertical: 20,
            borderRadius: 10,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            width: 150,
          }}
        >
          <LottieView
            source={require('../../assets/animations/inProgress.json')}
            autoPlay
            loop
            style={{ width: 60, height: 60 }}
          />
          <Text style={{ color: textColor }}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, backgroundColor }}>
      <Text
        style={{
          fontSize: 22,
          fontWeight: 'bold',
          color: Colors[colorScheme ?? 'light'].tint,
          textAlign: 'center',
          marginBottom: 10,
        }}
      >
        Transactions
      </Text>

      {/* Barre recherche + tri */}
      <View style={{ flexDirection: 'row', marginBottom: 10, gap: 8 }}>
        <TextInput
          placeholder="Rechercher un client..."
          placeholderTextColor={secondaryText}
          value={search}
          onChangeText={setSearch}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor,
            color: textColor,
            backgroundColor: cardColor,
            paddingHorizontal: 10,
            height: 40,
          }}
        />
        <TouchableOpacity
          onPress={() => setSortAsc(!sortAsc)}
          style={{
            backgroundColor: Colors[colorScheme ?? 'light'].tint,
            padding: 10,
            borderRadius: 8,
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff' }}>{sortAsc ? '↑' : '↓'}</Text>
        </TouchableOpacity>
      </View>

      {/* Filtres période */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        {[
          { key: 'all', label: 'Tout' },
          { key: 'today', label: 'Aujourd’hui' },
          { key: 'week', label: 'Semaine' },
          { key: 'month', label: 'Mois' },
        ].map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilterPeriod(f.key as any)}
            style={{
              padding: 8,
              backgroundColor: filterPeriod === f.key ? Colors[colorScheme ?? 'light'].tint : filterBg,
            }}
          >
            <Text style={{ color: filterPeriod === f.key ? '#fff' : textColor }}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Liste des transactions */}
      <FlatList
        data={enrichedTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const date = item.transactionTime?.toDate?.() || new Date();
          const isPending = item.type === 'withdrawal' && item.status === 'pending';
          return (
            <View
              style={{
                backgroundColor: cardColor,
                padding: 12,
                marginBottom: 10,
                borderColor,
              }}
            >
              <Text style={{ fontWeight: 'bold', fontSize: 16, color: textColor }}>{item.clientName}</Text>
              <Text style={{ fontSize: 13, color: secondaryText }}>
                {item.type === 'deposite' ? '💰 Dépôt' : '🏧 Retrait'} — {item.means}
              </Text>
              <Text style={{ fontSize: 13, color: secondaryText }}>Montant : {item.amount} XAF</Text>
              <Text style={{ fontSize: 13, color: secondaryText }}>
                {format(date, 'dd MMM yyyy - HH:mm', { locale: fr })}
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  color:
                    item.status === 'success'
                      ? 'green'
                      : item.status === 'rejected'
                      ? 'red'
                      : 'orange',
                  fontWeight: 'bold',
                }}
              >
                Statut : {item.status}
              </Text>

              {isPending && (
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => handleStatusUpdate(item.id, 'success')}
                    style={{ backgroundColor: 'green', padding: 8, borderRadius: 8 }}
                  >
                    <Text style={{ color: '#fff' }}>Valider</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      setRejectionModal({ visible: true, transactionId: item.id, amount: item.amount, clientId: item.idClient })
                    }
                    style={{ backgroundColor: 'red', padding: 8, borderRadius: 8 }}
                  >
                    <Text style={{ color: '#fff' }}>Rejeter</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Modal de rejet */}
      <Modal visible={rejectionModal.visible} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View style={{ backgroundColor: cardColor, padding: 20, borderRadius: 10, width: '100%' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10 }}>Raison du rejet :</Text>
            <TextInput
              placeholder="Entrez la raison..."
              placeholderTextColor={secondaryText}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              style={{
                borderWidth: 1,
                borderColor,
                borderRadius: 6,
                padding: 8,
                marginBottom: 20,
                color: textColor,
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setRejectionModal({ visible: false, transactionId: null, amount: 0, clientId: '' })}
                style={{ backgroundColor: '#888', padding: 10, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (!rejectionReason.trim()) {
                    Alert.alert('Erreur', 'Veuillez entrer une raison.');
                    return;
                  }
                  handleStatusUpdate(rejectionModal.transactionId!, 'failure', rejectionReason.trim());
                }}
                style={{ backgroundColor: 'red', padding: 10, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff' }}>Rejeter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
