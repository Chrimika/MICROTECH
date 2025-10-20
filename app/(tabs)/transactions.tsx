import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
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
  getDocs,
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
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'success' | 'rejected'>('all');

  const [rejectionModal, setRejectionModal] = useState({
    visible: false,
    transactionId: null as string | null,
    clientId: '',
    amount: 0,
  });
  const [rejectionReason, setRejectionReason] = useState('');

  const backgroundColor = colorScheme === 'dark' ? '#000' : '#f2f2f2';
  const textColor = colorScheme === 'dark' ? '#fff' : '#000';
  const cardColor = colorScheme === 'dark' ? '#111' : '#fff';
  const borderColor = colorScheme === 'dark' ? '#333' : '#ccc';
  const secondaryText = colorScheme === 'dark' ? '#aaa' : '#666';
  const filterBg = colorScheme === 'dark' ? '#222' : '#f0f0f0';

  // 🔹 Charger le commercial connecté
  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem('currentCommercial');
        const commercial = json ? JSON.parse(json) : null;
        if (commercial) setIdCommercial(commercial.idCommercial);
      } catch (error) {
        console.error('Erreur AsyncStorage :', error);
      }
    })();
  }, []);

  // 🔹 Écoute en temps réel Firestore
  useEffect(() => {
    if (!idCommercial) return;

    const tQuery = query(
      collection(db, 'Transactions'),
      where('idCommercial', '==', idCommercial),
      orderBy('transactionTime', 'desc')
    );

    const cQuery = query(collection(db, 'Clients'), where('idCommerciale', '==', idCommercial));

    const unsubTransactions = onSnapshot(tQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTransactions(data);
      setLoading(false);
    });

    const unsubClients = onSnapshot(cQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data());
      setClients(data);
    });

    return () => {
      unsubTransactions();
      unsubClients();
    };
  }, [idCommercial]);

  // 🔹 Fusion + filtres
  const enrichedTransactions = useMemo(() => {
    const joined = transactions.map((t) => {
      const client = clients.find((c) => c.idClient === t.idClient);
      return { ...t, clientName: client ? client.fullName : 'Client inconnu' };
    });

    const filteredByDate = joined.filter((t) => {
      const date = t.transactionTime?.toDate?.() || new Date();
      if (filterPeriod === 'today') return isToday(date);
      if (filterPeriod === 'week') return isThisWeek(date, { weekStartsOn: 1 });
      if (filterPeriod === 'month') return isThisMonth(date);
      return true;
    });

    const filteredByStatus =
      filterStatus === 'all'
        ? filteredByDate
        : filteredByDate.filter((t) => t.status === filterStatus);

    const searched = filteredByStatus.filter((t) =>
      t.clientName.toLowerCase().includes(search.toLowerCase())
    );

    return searched.sort((a, b) => {
      const aDate = a.transactionTime?.toDate?.() || new Date();
      const bDate = b.transactionTime?.toDate?.() || new Date();
      return sortAsc ? aDate - bDate : bDate - aDate;
    });
  }, [transactions, clients, search, sortAsc, filterPeriod, filterStatus]);

  // 🔹 Validation / rejet
  const handleStatusUpdate = async (transactionId: string, status: 'approved' | 'rejected', reason = '') => {
    try {
      const transaction = transactions.find((t) => t.id === transactionId);
      if (!transaction) return Alert.alert('Erreur', 'Transaction introuvable.');

      const tDoc = doc(db, 'Transactions', transactionId);

      if (status === 'approved') {
        await updateDoc(tDoc, { status: 'success' });
        Alert.alert('Succès', 'Transaction approuvée.');
        return;
      }

      if (status === 'rejected') {
        // Remboursement client
        const cQuery = query(collection(db, 'Clients'), where('idClient', '==', transaction.idClient));
        const snapshot = await getDocs(cQuery);
        if (!snapshot.empty) {
          const clientRef = snapshot.docs[0].ref;
          await updateDoc(clientRef, { balance: increment(transaction.amount) });
        }

        // Mettre à jour transaction
        await updateDoc(tDoc, { status: 'rejected', rejectionReason: reason });
        Alert.alert('Rejeté', 'Transaction rejetée et remboursée.');
      }
    } catch (error) {
      console.error('Erreur update transaction :', error);
      Alert.alert('Erreur', 'Mise à jour échouée.');
    }
  };

  // 🔹 Loader
  if (loading)
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor }}>
        <LottieView
          source={require('../../assets/animations/inProgress.json')}
          autoPlay
          loop
          style={{ width: 80, height: 80 }}
        />
        <Text style={{ color: textColor, marginTop: 10 }}>Chargement...</Text>
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

      {/* 🔍 Recherche + tri */}
      <View style={{ flexDirection: 'row', marginBottom: 12, gap: 8 }}>
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
            borderRadius: 8,
          }}
        />
        <TouchableOpacity
          onPress={() => setSortAsc(!sortAsc)}
          style={{
            backgroundColor: Colors[colorScheme ?? 'light'].tint,
            padding: 10,
            borderRadius: 8,
            width: 40,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff' }}>{sortAsc ? '↑' : '↓'}</Text>
        </TouchableOpacity>
      </View>

      {/* 🗓️ Filtres période */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        {['all', 'today', 'week', 'month'].map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilterPeriod(f as any)}
            style={{
              flex: 1,
              padding: 8,
              marginHorizontal: 2,
              
              backgroundColor: filterPeriod === f ? Colors[colorScheme ?? 'light'].tint : filterBg,
            }}
          >
            <Text
              style={{
                textAlign: 'center',
                color: filterPeriod === f ? '#fff' : textColor,
                fontWeight: '500',
                fontSize: 12,
              }}
            >
              {f === 'all' ? 'Tout' : f === 'today' ? 'Aujourd’hui' : f === 'week' ? 'Semaine' : 'Mois'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 🔘 Filtres statut */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        {[
          { key: 'all', label: 'Toutes' },
          { key: 'pending', label: 'En attente' },
          { key: 'success', label: 'Acceptées' },
          { key: 'rejected', label: 'Rejetées' },
        ].map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilterStatus(f.key as any)}
            style={{
              flex: 1,
              padding: 8,
              marginHorizontal: 2,
              
              backgroundColor: filterStatus === f.key ? Colors[colorScheme ?? 'light'].tint : filterBg,
            }}
          >
            <Text
              style={{
                textAlign: 'center',
                color: filterStatus === f.key ? '#fff' : textColor,
                fontWeight: '500',
                fontSize: 12,
              }}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 📋 Liste */}
      <FlatList
        data={enrichedTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const date = item.transactionTime?.toDate?.() || new Date();
          const isPending = item.type === 'withdraw' && item.status === 'pending';

          return (
            <View
              style={{
                backgroundColor: cardColor,
                padding: 12,
                marginBottom: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor,
                shadowColor: '#000',
                shadowOpacity: 0.1,
                elevation: 1,
              }}
            >
              <Text style={{ fontWeight: 'bold', fontSize: 16, color: textColor }}>
                {item.clientName}
              </Text>
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
                  <Pressable
                    onPress={() => handleStatusUpdate(item.id, 'approved')}
                    style={{ backgroundColor: 'green', padding: 8,  }}
                  >
                    <Text style={{ color: '#fff' }}>Valider</Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      setRejectionModal({
                        visible: true,
                        transactionId: item.id,
                        clientId: item.idClient,
                        amount: item.amount,
                      })
                    }
                    style={{ backgroundColor: 'red', padding: 8,  }}
                  >
                    <Text style={{ color: '#fff' }}>Rejeter</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* ❌ Modal rejet */}
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
                onPress={() => setRejectionModal({ visible: false, transactionId: null, clientId: '', amount: 0 })}
                style={{ backgroundColor: '#888', padding: 10, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff' }}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (!rejectionReason.trim()) return Alert.alert('Erreur', 'Veuillez entrer une raison.');
                  handleStatusUpdate(rejectionModal.transactionId!, 'rejected', rejectionReason.trim());
                  setRejectionReason('');
                  setRejectionModal({ visible: false, transactionId: null, clientId: '', amount: 0 });
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
