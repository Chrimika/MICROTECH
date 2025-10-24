import { auth, db } from '@/FirebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminCommercialScreen() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [commercials, setCommercials] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalClients: 0,
  });

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const textColor = isDarkMode ? '#fff' : '#000';
  const backgroundColor = isDarkMode ? '#121212' : '#f5f5f5';
  const cardBg = isDarkMode ? '#1e1e1e' : '#fff';
  const inputBg = isDarkMode ? '#2a2a2a' : '#f9f9f9';
  const borderColor = isDarkMode ? '#333' : '#e0e0e0';
  const labelColor = isDarkMode ? '#999' : '#666';

  useEffect(() => {
    // refs to hold latest counts to avoid stale closures
    const transactionsCountsRef = { current: {} as Record<string, number> };
    const clientsCountsRef = { current: {} as Record<string, number> };

    // realtime : commercials
    const q = query(collection(db, 'Commercial'), orderBy('createdAt', 'desc'));
    const unsubCommercials = onSnapshot(q, (snap) => {
      const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      // attach previously computed counts (if any)
      const enriched = list.map((c) => ({
        ...c,
        transactionsCount: transactionsCountsRef.current[c.idCommercial] ?? 0,
        clientsCount: clientsCountsRef.current[c.idCommercial] ?? 0,
      }));
      setCommercials(enriched);
    });

    // realtime : transactions (totals + per-commercial counts)
    const unsubTransactions = onSnapshot(collection(db, 'Transactions'), (snap) => {
      const total = snap.size;
      const map: Record<string, number> = {};
      snap.docs.forEach((d) => {
        const id = (d.data() as any).idCommercial;
        if (id) map[id] = (map[id] || 0) + 1;
      });
      transactionsCountsRef.current = map;
      setStats((s) => ({ ...s, totalTransactions: total }));
      setCommercials((prev) => prev.map((c) => ({ ...c, transactionsCount: map[c.idCommercial] ?? 0 })));
    });

    // realtime : clients (totals + per-commercial counts)
    const unsubClients = onSnapshot(collection(db, 'Clients'), (snap) => {
      const total = snap.size;
      const map: Record<string, number> = {};
      snap.docs.forEach((d) => {
        const id = (d.data() as any).idCommerciale;
        if (id) map[id] = (map[id] || 0) + 1;
      });
      clientsCountsRef.current = map;
      setStats((s) => ({ ...s, totalClients: total }));
      setCommercials((prev) => prev.map((c) => ({ ...c, clientsCount: map[c.idCommercial] ?? 0 })));
    });

    return () => {
      try { unsubCommercials(); } catch {}
      try { unsubTransactions(); } catch {}
      try { unsubClients(); } catch {}
    };
  }, []);

  const calculateGlobalStats = async () => {
    try {
      const transactionsSnap = await getDocs(collection(db, 'Transactions'));
      const clientsSnap = await getDocs(collection(db, 'Clients'));

      setStats({
        totalTransactions: transactionsSnap.size,
        totalClients: clientsSnap.size,
      });
    } catch (err) {
      console.error('Erreur récupération stats globales:', err);
    }
  };

  const attachCommercialActivity = async (commercialList: any[]) => {
    try {
      const updated = await Promise.all(
        commercialList.map(async (commercial) => {
          const transQ = query(
            collection(db, 'Transactions'),
            where('idCommercial', '==', commercial.idCommercial)
          );
          const transSnap = await getDocs(transQ);

          const clientQ = query(
            collection(db, 'Clients'),
            where('idCommerciale', '==', commercial.idCommercial)
          );
          const clientSnap = await getDocs(clientQ);

          return {
            ...commercial,
            transactionsCount: transSnap.size,
            clientsCount: clientSnap.size,
          };
        })
      );

      setCommercials(updated);
    } catch (error) {
      console.error('Erreur ajout activité commercial:', error);
    }
  };

  const handleCreateCommercial = async () => {
    if (!email.trim() || !fullName.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir le nom complet et lemail');
      return;
    }

    setLoading(true);
    try {
      const password = '111111';
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = userCredential.user.uid;

      const idCommercial = 'COMM-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

      await addDoc(collection(db, 'Commercial'), {
        uid,
        email: email.trim(),
        fullName: fullName.trim(),
        idCommercial,
        createdAt: new Date(),
      });

      Alert.alert('✅ Succès', `Commercial ${fullName} créé avec succès (mot de passe : "111111")`);
      setEmail('');
      setFullName('');
    } catch (error: any) {
      console.error('Erreur création commercial :', error);
      Alert.alert('Erreur', error.message || 'Impossible de créer le commercial');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: textColor }}>
            Gestion Commerciaux
          </Text>
          <Text style={{ fontSize: 15, color: labelColor, marginTop: 4 }}>
            Créez et suivez vos commerciaux
          </Text>
        </View>

        {/* Global Stats Cards */}
        <View style={{ 
          paddingHorizontal: 20, 
          marginBottom: 24,
          flexDirection: 'row',
          gap: 12,
        }}>
          <View style={{
            flex: 1,
            backgroundColor: '#008a5c',
            borderRadius: 16,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}>
            <Ionicons name="people" size={28} color="#fff" style={{ marginBottom: 8 }} />
            <Text style={{ color: '#e6fff4', fontSize: 13, marginBottom: 4 }}>
              Total Clients
            </Text>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>
              {stats.totalClients}
            </Text>
          </View>

          <View style={{
            flex: 1,
            backgroundColor: '#2E7D32',
            borderRadius: 16,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}>
            <Ionicons name="repeat" size={28} color="#fff" style={{ marginBottom: 8 }} />
            <Text style={{ color: '#E8FFF0', fontSize: 13, marginBottom: 4 }}>
              Transactions
            </Text>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>
              {stats.totalTransactions}
            </Text>
          </View>
        </View>

        {/* Create Commercial Form */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View style={{
            backgroundColor: cardBg,
            borderRadius: 16,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="person-add" size={22} color="#008a5c" />
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '600', 
                color: textColor,
                marginLeft: 8,
              }}>
                Nouveau Commercial
              </Text>
            </View>

            {/* Email Input */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: labelColor, marginBottom: 6, fontWeight: '500' }}>
                Email
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: borderColor,
                borderRadius: 10,
                backgroundColor: inputBg,
                paddingHorizontal: 12,
              }}>
                <Ionicons name="mail-outline" size={18} color={labelColor} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="exemple@gmail.com"
                  placeholderTextColor={isDarkMode ? '#666' : '#999'}
                  style={{
                    flex: 1,
                    padding: 12,
                    fontSize: 15,
                    color: textColor,
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Full Name Input */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, color: labelColor, marginBottom: 6, fontWeight: '500' }}>
                Nom complet
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: borderColor,
                borderRadius: 10,
                backgroundColor: inputBg,
                paddingHorizontal: 12,
              }}>
                <Ionicons name="person-outline" size={18} color={labelColor} />
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Jean Du Pont"
                  placeholderTextColor={isDarkMode ? '#666' : '#999'}
                  style={{
                    flex: 1,
                    padding: 12,
                    fontSize: 15,
                    color: textColor,
                  }}
                />
              </View>
            </View>

            {/* Create Button */}
            <TouchableOpacity
              onPress={handleCreateCommercial}
              disabled={loading}
              style={{
                backgroundColor: loading ? '#ccc' : '#008a5c',
                paddingVertical: 14,
                borderRadius: 10,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                shadowColor: '#008a5c',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: loading ? 0 : 0.3,
                shadowRadius: 8,
                elevation: loading ? 0 : 5,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
                    Créer Commercial
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{
              marginTop: 12,
              padding: 10,
              backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Ionicons name="information-circle-outline" size={16} color={labelColor} />
              <Text style={{ fontSize: 12, color: labelColor, marginLeft: 6 }}>
                Le mot de passe par défaut est : 111111
              </Text>
            </View>
          </View>
        </View>

        {/* Commercials List */}
        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name="briefcase" size={22} color={textColor} />
            <Text style={{ 
              fontSize: 18, 
              fontWeight: '600', 
              color: textColor,
              marginLeft: 8,
            }}>
              Activités des Commerciaux ({commercials.length})
            </Text>
          </View>

          {commercials.length === 0 ? (
            <View style={{
              backgroundColor: cardBg,
              borderRadius: 16,
              padding: 40,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
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
                <Ionicons name="people-outline" size={40} color={labelColor} />
              </View>
              <Text style={{ color: labelColor, fontSize: 16, fontWeight: '500' }}>
                Aucun commercial
              </Text>
              <Text style={{ color: labelColor, fontSize: 14, marginTop: 4, textAlign: 'center' }}>
                Créez votre premier commercial ci-dessus
              </Text>
            </View>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={commercials}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
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
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 17, fontWeight: '600', color: textColor, marginBottom: 4 }}>
                      {item.fullName}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="mail-outline" size={14} color={labelColor} />
                      <Text style={{ fontSize: 13, color: labelColor, marginLeft: 4 }}>
                        {item.email}
                      </Text>
                    </View>
                  </View>

                  {/* ID Badge */}
                  <View style={{
                    backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 6,
                    alignSelf: 'flex-start',
                    marginBottom: 12,
                  }}>
                    <Text style={{ fontSize: 12, color: labelColor, fontFamily: 'monospace' }}>
                      {item.idCommercial}
                    </Text>
                  </View>

                  {/* Stats */}
                  <View style={{ 
                    flexDirection: 'row',
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: borderColor,
                    gap: 16,
                  }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: '#e6fff4',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 8,
                      }}>
                        <Ionicons name="people" size={18} color="#008a5c" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 20, fontWeight: '700', color: textColor }}>
                          {item.clientsCount ?? 0}
                        </Text>
                        <Text style={{ fontSize: 11, color: labelColor }}>
                          Clients
                        </Text>
                      </View>
                    </View>

                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: '#E8FFF0',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 8,
                      }}>
                        <Ionicons name="repeat" size={18} color="#2E7D32" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 20, fontWeight: '700', color: textColor }}>
                          {item.transactionsCount ?? 0}
                        </Text>
                        <Text style={{ fontSize: 11, color: labelColor }}>
                          Transactions
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}