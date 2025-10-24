import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, useColorScheme } from 'react-native';
import { db } from '@/FirebaseConfig';
import { collection, onSnapshot, orderBy, query, where, Timestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ClientTransactionsScreen() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'success' | 'rejected'>('all');
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'month'>('all');
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const textColor = isDarkMode ? '#fff' : '#000';
  const backgroundColor = isDarkMode ? '#121212' : '#f5f5f5';
  const cardBg = isDarkMode ? '#1e1e1e' : '#fff';
  const borderColor = isDarkMode ? '#333' : '#e0e0e0';
  const labelColor = isDarkMode ? '#999' : '#666';

  useEffect(() => {
    const fetchTransactions = async () => {
      const c = await AsyncStorage.getItem('currentClient');
      if (!c) {
        console.warn('⚠️ Aucun client trouvé dans AsyncStorage');
        setLoading(false);
        return;
      }

      const client = JSON.parse(c);
      console.log('🟢 Client récupéré depuis AsyncStorage :', client);

      try {
        const q = query(
          collection(db, 'Transactions'),
          where('idClient', '==', client.idClient),
          orderBy('transactionTime', 'desc')
        );

        const unsubscribe = onSnapshot(
          q,
          (snap) => {
            console.log('🟢 Snapshot reçu, docs :', snap.docs.length);
            const list: any[] = snap.docs.map((doc) => {
              const data = doc.data();
              if (data.transactionTime && data.transactionTime instanceof Timestamp) {
                data.transactionTime = data.transactionTime.toDate();
              }
              console.log('   → Transaction :', data);
              return { id: doc.id, ...data };
            });
            setTransactions(list);
            setLoading(false);
          },
          (err) => {
            console.error('❌ Erreur realtime transactions :', err);
            setLoading(false);
          }
        );

        return unsubscribe;
      } catch (err) {
        console.error('❌ Erreur dans fetchTransactions :', err);
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const applyFilters = () => {
    console.log('🔄 Application des filtres', { filterStatus, filterPeriod });
    let list = [...transactions];
    const now = new Date();

    if (filterStatus !== 'all') {
      list = list.filter((t) => t.status === filterStatus);
    }

    if (filterPeriod === 'today') {
      list = list.filter(
        (t) =>
          t.transactionTime &&
          format(t.transactionTime, 'dd/MM/yyyy') === format(now, 'dd/MM/yyyy')
      );
    } else if (filterPeriod === 'month') {
      list = list.filter(
        (t) =>
          t.transactionTime &&
          t.transactionTime.getMonth() === now.getMonth() &&
          t.transactionTime.getFullYear() === now.getFullYear()
      );
    }

    console.log('🔹 Transactions filtrées :', list.length);
    setFiltered(list);
  };

  useEffect(() => {
    applyFilters();
  }, [filterStatus, filterPeriod, transactions]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: isDarkMode ? '#3d3000' : '#FFF9E6', text: '#F9A825', icon: 'time-outline' };
      case 'success':
        return { bg: isDarkMode ? '#003d1a' : '#E8FFF0', text: '#2E7D32', icon: 'checkmark-circle' };
      case 'rejected':
        return { bg: isDarkMode ? '#3d0000' : '#FFECEC', text: '#C62828', icon: 'close-circle' };
      default:
        return { bg: cardBg, text: textColor, icon: 'help-circle-outline' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'success': return 'Validé';
      case 'rejected': return 'Rejeté';
      default: return status;
    }
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
          Chargement des transactions...
        </Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      {/* Header */}
      <View style={{ 
        paddingHorizontal: 20, 
        paddingTop: 10,
        paddingBottom: 20,
        backgroundColor: cardBg,
        borderBottomWidth: 1,
        borderBottomColor: borderColor,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="arrow-back" size={20} color={textColor} />
          </TouchableOpacity>
          <Text style={{ 
            flex: 1, 
            textAlign: 'center', 
            fontSize: 20, 
            fontWeight: '700',
            color: textColor,
            marginRight: 36,
          }}>
            Mes transactions
          </Text>
        </View>
      </View>

      {/* Filters Container */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: cardBg }}>
        {/* Status Filters */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 13, color: labelColor, marginBottom: 8, fontWeight: '500' }}>
            Statut
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { key: 'all', label: 'Tous', icon: 'list-outline' },
              { key: 'pending', label: 'En attente', icon: 'time-outline' },
              { key: 'success', label: 'Validé', icon: 'checkmark-circle-outline' },
              { key: 'rejected', label: 'Rejeté', icon: 'close-circle-outline' },
            ].map((status) => (
              <TouchableOpacity
                key={status.key}
                onPress={() => setFilterStatus(status.key as any)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 8,
                  borderRadius: 8,
                  borderWidth: 1.5,
                  borderColor: filterStatus === status.key ? '#008a5c' : borderColor,
                  backgroundColor: filterStatus === status.key ? '#e6fff4' : (isDarkMode ? '#2a2a2a' : '#f9f9f9'),
                  alignItems: 'center',
                }}
              >
                <Ionicons 
                  name={status.icon as any} 
                  size={18} 
                  color={filterStatus === status.key ? '#008a5c' : labelColor} 
                />
                <Text style={{ 
                  color: filterStatus === status.key ? '#008a5c' : textColor,
                  fontSize: 11,
                  fontWeight: '600',
                  marginTop: 4,
                }}>
                  {status.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Period Filters */}
        <View>
          <Text style={{ fontSize: 13, color: labelColor, marginBottom: 8, fontWeight: '500' }}>
            Période
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { key: 'all', label: 'Toutes', icon: 'infinite-outline' },
              { key: 'today', label: "Aujourd'hui", icon: 'today-outline' },
              { key: 'month', label: 'Ce mois', icon: 'calendar-outline' },
            ].map((period) => (
              <TouchableOpacity
                key={period.key}
                onPress={() => setFilterPeriod(period.key as any)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1.5,
                  borderColor: filterPeriod === period.key ? '#008a5c' : borderColor,
                  backgroundColor: filterPeriod === period.key ? '#e6fff4' : (isDarkMode ? '#2a2a2a' : '#f9f9f9'),
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <Ionicons 
                  name={period.icon as any} 
                  size={16} 
                  color={filterPeriod === period.key ? '#008a5c' : labelColor} 
                />
                <Text style={{ 
                  color: filterPeriod === period.key ? '#008a5c' : textColor,
                  fontSize: 13,
                  fontWeight: '600',
                }}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Transactions List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingTop: 12 }}
        renderItem={({ item }) => {
          const statusStyle = getStatusColor(item.status);
          return (
            <View
              style={{
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
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons 
                      name={item.type === 'withdraw' ? 'arrow-down-circle' : 'arrow-up-circle'} 
                      size={20} 
                      color={item.type === 'withdraw' ? '#c62828' : '#2E7D32'} 
                    />
                    <Text style={{ 
                      fontSize: 16, 
                      fontWeight: '600', 
                      color: textColor,
                      marginLeft: 6,
                    }}>
                      {item.type === 'withdraw' ? 'Retrait' : 'Dépôt'}
                    </Text>
                  </View>
                  <Text style={{ 
                    fontSize: 24, 
                    fontWeight: '700', 
                    color: textColor,
                    letterSpacing: -0.5,
                  }}>
                    {item.amount.toLocaleString()} XAF
                  </Text>
                </View>
                
                <View style={{
                  backgroundColor: statusStyle.bg,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <Ionicons name={statusStyle.icon as any} size={14} color={statusStyle.text} />
                  <Text style={{ 
                    color: statusStyle.text, 
                    fontSize: 12,
                    fontWeight: '600',
                  }}>
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>

              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between',
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: borderColor,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="card-outline" size={14} color={labelColor} />
                  <Text style={{ fontSize: 13, color: labelColor, marginLeft: 4, textTransform: 'uppercase' }}>
                    {item.means}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="calendar-outline" size={14} color={labelColor} />
                  <Text style={{ fontSize: 13, color: labelColor, marginLeft: 4 }}>
                    {item.transactionTime
                      ? format(item.transactionTime, 'dd/MM/yyyy - HH:mm', { locale: fr })
                      : '...'}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <View style={{ 
            alignItems: 'center', 
            justifyContent: 'center',
            paddingVertical: 60,
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Ionicons name="receipt-outline" size={40} color={labelColor} />
            </View>
            <Text style={{ 
              textAlign: 'center', 
              color: labelColor,
              fontSize: 16,
              fontWeight: '500',
            }}>
              Aucune transaction
            </Text>
            <Text style={{ 
              textAlign: 'center', 
              color: labelColor,
              fontSize: 14,
              marginTop: 4,
            }}>
              Vos transactions apparaîtront ici
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}