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
  ActivityIndicator,
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
import { Ionicons } from '@expo/vector-icons';

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

  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? '#121212' : '#f5f5f5';
  const textColor = isDark ? '#fff' : '#000';
  const cardBg = isDark ? '#1e1e1e' : '#fff';
  const borderColor = isDark ? '#333' : '#e0e0e0';
  const labelColor = isDark ? '#999' : '#666';
  const inputBg = isDark ? '#2a2a2a' : '#f9f9f9';

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
        const cQuery = query(collection(db, 'Clients'), where('idClient', '==', transaction.idClient));
        const snapshot = await getDocs(cQuery);
        if (!snapshot.empty) {
          const clientRef = snapshot.docs[0].ref;
          await updateDoc(clientRef, { balance: increment(transaction.amount) });
        }

        await updateDoc(tDoc, { status: 'rejected', rejectionReason: reason });
        Alert.alert('Rejeté', 'Transaction rejetée et remboursée.');
      }
    } catch (error) {
      console.error('Erreur update transaction :', error);
      Alert.alert('Erreur', 'Mise à jour échouée.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { bg: isDark ? '#3d3000' : '#FFF9E6', text: '#F9A825', icon: 'time-outline' };
      case 'success': return { bg: isDark ? '#003d1a' : '#E8FFF0', text: '#2E7D32', icon: 'checkmark-circle' };
      case 'rejected': return { bg: isDark ? '#3d0000' : '#FFECEC', text: '#C62828', icon: 'close-circle' };
      default: return { bg: cardBg, text: textColor, icon: 'help-circle-outline' };
    }
  };

  if (loading)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#008a5c" />
        <Text style={{ color: textColor, marginTop: 10, fontSize: 16 }}>
          Chargement des transactions...
        </Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: textColor }}>
          Transactions
        </Text>
        <Text style={{ fontSize: 15, color: labelColor, marginTop: 4 }}>
          {enrichedTransactions.length} transaction{enrichedTransactions.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Search & Sort */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16, flexDirection: 'row', gap: 8 }}>
        <View style={{
          flex: 1,
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
        
        <TouchableOpacity
          onPress={() => setSortAsc(!sortAsc)}
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: '#008a5c',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name={sortAsc ? "arrow-up" : "arrow-down"} size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filters Container */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        {/* Period Filters */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 13, color: labelColor, marginBottom: 8, fontWeight: '500' }}>
            Période
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { key: 'all', label: 'Tout', icon: 'infinite-outline' },
              { key: 'today', label: "Aujourd'hui", icon: 'today-outline' },
              { key: 'week', label: 'Semaine', icon: 'calendar-outline' },
              { key: 'month', label: 'Mois', icon: 'calendar-outline' },
            ].map((f) => (
              <Pressable
                key={f.key}
                onPress={() => setFilterPeriod(f.key as any)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1.5,
                  borderColor: filterPeriod === f.key ? '#008a5c' : borderColor,
                  backgroundColor: filterPeriod === f.key ? '#e6fff4' : inputBg,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color: filterPeriod === f.key ? '#008a5c' : textColor,
                  fontSize: 12,
                  fontWeight: '600',
                }}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Status Filters */}
        <View>
          <Text style={{ fontSize: 13, color: labelColor, marginBottom: 8, fontWeight: '500' }}>
            Statut
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { key: 'all', label: 'Toutes', icon: 'list-outline' },
              { key: 'pending', label: 'En attente', icon: 'time-outline' },
              { key: 'success', label: 'Validées', icon: 'checkmark-circle-outline' },
              { key: 'rejected', label: 'Rejetées', icon: 'close-circle-outline' },
            ].map((f) => (
              <Pressable
                key={f.key}
                onPress={() => setFilterStatus(f.key as any)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1.5,
                  borderColor: filterStatus === f.key ? '#008a5c' : borderColor,
                  backgroundColor: filterStatus === f.key ? '#e6fff4' : inputBg,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color: filterStatus === f.key ? '#008a5c' : textColor,
                  fontSize: 12,
                  fontWeight: '600',
                }}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Transaction List */}
      <FlatList
        data={enrichedTransactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const date = item.transactionTime?.toDate?.() || new Date();
          const isPending = item.type === 'withdraw' && item.status === 'pending';
          const statusStyle = getStatusColor(item.status);

          return (
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons 
                      name={item.type === 'withdraw' ? 'arrow-down-circle' : 'arrow-up-circle'} 
                      size={20} 
                      color={item.type === 'withdraw' ? '#c62828' : '#2E7D32'} 
                    />
                    <Text style={{ fontSize: 16, fontWeight: '600', color: textColor, marginLeft: 6 }}>
                      {item.clientName}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: textColor, letterSpacing: -0.5 }}>
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
                  <Text style={{ color: statusStyle.text, fontSize: 12, fontWeight: '600' }}>
                    {item.status}
                  </Text>
                </View>
              </View>

              {/* Details */}
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between',
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: borderColor,
                marginBottom: isPending ? 12 : 0,
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
                    {format(date, 'dd/MM/yyyy - HH:mm', { locale: fr })}
                  </Text>
                </View>
              </View>

              {/* Action Buttons for Pending */}
              {isPending && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity
                    onPress={() => handleStatusUpdate(item.id, 'approved')}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#2E7D32',
                      paddingVertical: 10,
                      borderRadius: 8,
                      gap: 6,
                    }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                      Valider
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      setRejectionModal({
                        visible: true,
                        transactionId: item.id,
                        clientId: item.idClient,
                        amount: item.amount,
                      })
                    }
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#C62828',
                      paddingVertical: 10,
                      borderRadius: 8,
                      gap: 6,
                    }}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                      Rejeter
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
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
              <Ionicons name="receipt-outline" size={40} color={labelColor} />
            </View>
            <Text style={{ color: labelColor, fontSize: 16, fontWeight: '500' }}>
              Aucune transaction
            </Text>
            <Text style={{ color: labelColor, fontSize: 14, marginTop: 4, textAlign: 'center' }}>
              Les transactions apparaîtront ici
            </Text>
          </View>
        )}
      />

      {/* Rejection Modal */}
      <Modal visible={rejectionModal.visible} transparent animationType="fade">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: cardBg,
            borderRadius: 16,
            padding: 24,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="alert-circle" size={24} color="#C62828" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: textColor, marginLeft: 8 }}>
                Raison du rejet
              </Text>
            </View>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1.5,
              borderColor: borderColor,
              borderRadius: 10,
              backgroundColor: inputBg,
              paddingHorizontal: 12,
              marginBottom: 20,
            }}>
              <Ionicons name="document-text-outline" size={18} color={labelColor} />
              <TextInput
                placeholder="Entrez la raison du rejet..."
                placeholderTextColor={isDark ? '#666' : '#999'}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                style={{
                  flex: 1,
                  padding: 12,
                  fontSize: 15,
                  color: textColor,
                  minHeight: 80,
                  textAlignVertical: 'top',
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setRejectionModal({ visible: false, transactionId: null, clientId: '', amount: 0 });
                  setRejectionReason('');
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: borderColor,
                }}
              >
                <Text style={{ color: textColor, fontSize: 15, fontWeight: '600' }}>
                  Annuler
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (!rejectionReason.trim()) return Alert.alert('Erreur', 'Veuillez entrer une raison.');
                  handleStatusUpdate(rejectionModal.transactionId!, 'rejected', rejectionReason.trim());
                  setRejectionReason('');
                  setRejectionModal({ visible: false, transactionId: null, clientId: '', amount: 0 });
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: '#C62828',
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Ionicons name="close-circle-outline" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                  Rejeter
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}