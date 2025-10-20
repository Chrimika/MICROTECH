import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db, auth } from '@/FirebaseConfig';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';


export default function AdminCommercialScreen() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [commercials, setCommercials] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalClients: 0,
  });

  // 🔁 Écoute temps réel des commerciaux
  useEffect(() => {
    const q = query(collection(db, 'Commercial'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, async (snap) => {
      const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCommercials(list);

      await calculateGlobalStats();
      await attachCommercialActivity(list);
    });

    return () => unsubscribe();
  }, []);

  // 📊 Récupération des stats globales (Transactions + Clients)
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

  // 👥 Ajouter les infos (clients + transactions) à chaque commercial
  const attachCommercialActivity = async (commercialList: any[]) => {
    try {
      const updated = await Promise.all(
        commercialList.map(async (commercial) => {
          // 🔹 Transactions liées à ce commercial
          const transQ = query(
            collection(db, 'Transactions'),
            where('idCommercial', '==', commercial.idCommercial)
          );
          const transSnap = await getDocs(transQ);

          // 🔹 Clients liés à ce commercial
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

  // ➕ Créer un nouveau commercial
  const handleCreateCommercial = async () => {
    if (!email.trim() || !fullName.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir le nom complet et l’email');
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff', padding: 16 }}>
      <ScrollView>
        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>Création Commercial</Text>

        <Text>Email :</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="exemple@gmail.com"
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            padding: 8,
            borderRadius: 6,
            marginBottom: 10,
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text>Nom complet :</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Jean Du Pont"
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            padding: 8,
            borderRadius: 6,
            marginBottom: 10,
          }}
        />

        <TouchableOpacity
          onPress={handleCreateCommercial}
          style={{
            backgroundColor: '#008CBA',
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
            marginBottom: 20,
          }}
          disabled={loading}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>
            {loading ? 'Création...' : 'Créer Commercial'}
          </Text>
        </TouchableOpacity>

        {/* 📊 Statistiques globales */}
        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>Statistiques globales</Text>
        <View style={{ marginBottom: 20 }}>
          <Text>Total Transactions : {stats.totalTransactions}</Text>
          <Text>Total Clients : {stats.totalClients}</Text>
        </View>

        {/* 👥 Liste des commerciaux */}
        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>
          Activités des Commerciaux
        </Text>

        {commercials.length === 0 ? (
          <ActivityIndicator size="large" color="#008CBA" />
        ) : (
          <FlatList
            data={commercials}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View
                style={{
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: '#f2f2f2',
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.fullName}</Text>
                <Text>Email : {item.email}</Text>
                <Text>ID Commercial : {item.idCommercial}</Text>
                <Text>👥 Clients : {item.clientsCount ?? 0}</Text>
                <Text>💰 Transactions : {item.transactionsCount ?? 0}</Text>
              </View>
            )}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
