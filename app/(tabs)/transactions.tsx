import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { db } from '@/FirebaseConfig';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ClientTransactionsScreen() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'success' | 'rejected'>('all');
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'month'>('all');
  const router = useRouter();

  useEffect(() => {
    const fetchTransactions = async () => {
      const c = await AsyncStorage.getItem('client');
      if (!c) return;

      const client = JSON.parse(c);
      const q = query(
        collection(db, 'Transactions'),
        where('idClient', '==', client.idClient),
        orderBy('transactionTime', 'desc')
      );

      onSnapshot(q, (snap) => {
        const list: any[] = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        setTransactions(list);
        setFiltered(list);
      });
    };

    fetchTransactions();
  }, []);

  const applyFilters = () => {
    let list = [...transactions];
    const now = new Date();

    // Filtre par statut
    if (filterStatus !== 'all') {
      list = list.filter((t) => t.status === filterStatus);
    }

    // Filtre par période
    if (filterPeriod === 'today') {
      list = list.filter(
        (t) =>
          t.transactionTime &&
          format(t.transactionTime.toDate(), 'dd/MM/yyyy') === format(now, 'dd/MM/yyyy')
      );
    } else if (filterPeriod === 'month') {
      list = list.filter(
        (t) =>
          t.transactionTime &&
          t.transactionTime.toDate().getMonth() === now.getMonth() &&
          t.transactionTime.toDate().getFullYear() === now.getFullYear()
      );
    }

    setFiltered(list);
  };

  useEffect(() => {
    applyFilters();
  }, [filterStatus, filterPeriod, transactions]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff', padding: 15 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#008CBA', fontSize: 16 }}>← Retour</Text>
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold' }}>
          Mes transactions
        </Text>
      </View>

      {/* Filtres */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        {['all', 'pending', 'success', 'rejected'].map((status) => (
          <TouchableOpacity key={status} onPress={() => setFilterStatus(status as any)}>
            <Text style={{ color: filterStatus === status ? '#008CBA' : '#555' }}>
              {status === 'all'
                ? 'Tous'
                : status === 'pending'
                ? 'En attente'
                : status === 'success'
                ? 'Validé'
                : 'Rejeté'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        {['all', 'today', 'month'].map((period) => (
          <TouchableOpacity key={period} onPress={() => setFilterPeriod(period as any)}>
            <Text style={{ color: filterPeriod === period ? '#008CBA' : '#555' }}>
              {period === 'all'
                ? 'Toutes'
                : period === 'today'
                ? "Aujourd’hui"
                : 'Ce mois'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Liste */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              borderWidth: 1,
              borderColor: '#eee',
              borderRadius: 10,
              padding: 10,
              marginBottom: 10,
              backgroundColor:
                item.status === 'pending'
                  ? '#FFF9E6'
                  : item.status === 'success'
                  ? '#E8FFF0'
                  : '#FFECEC',
            }}
          >
            <Text style={{ fontWeight: 'bold' }}>
              {item.type === 'withdraw' ? 'Retrait' : 'Dépôt'} - {item.amount} FCFA
            </Text>
            <Text>Statut : {item.status}</Text>
            <Text>Moyen : {item.means}</Text>
            <Text>
              Date :{' '}
              {item.transactionTime
                ? format(item.transactionTime.toDate(), 'dd/MM/yyyy - HH:mm', { locale: fr })
                : '...'}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
