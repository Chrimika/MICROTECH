import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { db } from '@/FirebaseConfig';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function TabThreeScreen() {
  const [idCommercial, setIdCommercial] = useState('');
  const [user, setUser] = useState<any>(null);
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  // --- 🔹 Récupérer l'utilisateur stocké localement
  useEffect(() => {
    const fetchCurrentCommercial = async () => {
      try {
        const json = await AsyncStorage.getItem('currentCommercial');
        if (json) {
          const commercial = JSON.parse(json);
          console.log('🧠 Commercial local récupéré:', commercial);
          if (commercial.idCommercial) {
            setIdCommercial(commercial.idCommercial);
          } else {
            console.log('⚠️ idCommercial manquant dans AsyncStorage');
            setLoading(false);
          }
        } else {
          console.log('⚠️ Aucun commercial trouvé dans AsyncStorage');
          setLoading(false);
        }
      } catch (error) {
        console.error('Erreur récupération commercial local:', error);
        setLoading(false);
      }
    };
    fetchCurrentCommercial();
  }, []);

  // --- 🔹 Récupérer données Firestore quand idCommercial est dispo
  useEffect(() => {
    if (!idCommercial) return;

    console.log('🔍 Chargement des données Firestore pour idCommercial:', idCommercial);
    setLoading(true);

    let unsubUser: (() => void) | null = null;
    let unsubClients: (() => void) | null = null;
    let unsubTrans: (() => void) | null = null;

    const loadData = async () => {
      try {
        const q = query(collection(db, 'Commercial'), where('idCommercial', '==', idCommercial));
        const snap = await getDocs(q);

        if (snap.empty) {
          console.log('❌ Aucun commercial trouvé pour cet ID');
          Alert.alert('Erreur', 'Commercial introuvable.');
          setLoading(false);
          return;
        }

        const docRef = snap.docs[0].ref;
        setUserDocId(docRef.id);

        unsubUser = onSnapshot(docRef, (d) => {
          if (d.exists()) {
            console.log('👤 Données commercial:', d.data());
            setUser({ id: d.id, ...d.data() });
          }
        });

        const clientsQ = query(collection(db, 'Clients'), where('idCommerciale', '==', idCommercial));
        unsubClients = onSnapshot(clientsQ, (snap) => {
          const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setClients(arr);
          console.log('📦 Clients récupérés:', arr.length);
        });

        const transQ = query(collection(db, 'Transactions'), where('idCommercial', '==', idCommercial));
        unsubTrans = onSnapshot(transQ, (snap) => {
          const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setTransactions(arr);
          console.log('💰 Transactions récupérées:', arr.length);
          setLoading(false);
        });
      } catch (e) {
        console.error('Erreur Firestore:', e);
        Alert.alert('Erreur', 'Impossible de charger les données.');
        setLoading(false);
      }
    };

    loadData();

    return () => {
      unsubUser && unsubUser();
      unsubClients && unsubClients();
      unsubTrans && unsubTrans();
    };
  }, [idCommercial]);

  // --- 🔹 Mise à jour profil
  const handleUpdate = async () => {
    if (!userDocId) return Alert.alert('Erreur', 'Document introuvable');
    try {
      const ref = doc(db, 'Commercial', userDocId);
      await updateDoc(ref, {
        fullName: user.fullName,
        phone: user.phone,
      });
      setEditing(false);
      Alert.alert('Succès', 'Profil mis à jour');
      console.log('✅ Profil mis à jour:', user.fullName, user.phone);
    } catch (e) {
      console.error('Erreur mise à jour:', e);
      Alert.alert('Erreur', 'Échec de mise à jour');
    }
  };

  // --- 🔹 Génération du rapport moderne
  const generateReport = async (forDate: Date) => {
    try {
      const dateStr = format(forDate, 'dd MMMM yyyy', { locale: fr });
      const dailyClients = clients.filter((c) => isSameDay(c.createdAt?.toDate?.() || new Date(), forDate));
      const dailyTransactions = transactions.filter((t) =>
        isSameDay(t.transactionTime?.toDate?.() || new Date(), forDate)
      );

      const transactionsWithClient = dailyTransactions.map((t) => {
        const client = clients.find((c) => c.idClient === t.idClient);
        return { ...t, clientName: client?.fullName || 'Inconnu' };
      });

      const totalDepots = transactionsWithClient
        .filter(t => t.type === 'deposit')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const totalRetraits = transactionsWithClient
        .filter(t => t.type === 'withdrawal')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const report = `
╔════════════════════════════════════════════════════════════╗
║                    RAPPORT D'ACTIVITÉ                       ║
╚════════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────────┐
│ INFORMATIONS GÉNÉRALES                                      │
└────────────────────────────────────────────────────────────┘

👤 Commercial     : ${user.fullName}
📅 Date           : ${dateStr}
🆔 ID Commercial  : ${user.idCommercial}
📞 Téléphone      : ${user.phone}


┌────────────────────────────────────────────────────────────┐
│ STATISTIQUES DU JOUR                                        │
└────────────────────────────────────────────────────────────┘

📊 Nouveaux clients créés      : ${dailyClients.length}
💳 Transactions effectuées      : ${dailyTransactions.length}
💰 Total dépôts                 : ${totalDepots.toLocaleString('fr-FR')} XAF
💸 Total retraits               : ${totalRetraits.toLocaleString('fr-FR')} XAF
📈 Volume total traité          : ${(totalDepots + totalRetraits).toLocaleString('fr-FR')} XAF


${dailyClients.length > 0 ? `┌────────────────────────────────────────────────────────────┐
│ NOUVEAUX CLIENTS                                            │
└────────────────────────────────────────────────────────────┘

${dailyClients.map((c, i) => 
`  ${i + 1}. ${c.fullName}
     📱 ${c.phone || 'N/A'}
     ⏰ ${format(c.createdAt?.toDate?.() || new Date(), 'HH:mm', { locale: fr })}
`).join('\n')}
` : ''}

${dailyTransactions.length > 0 ? `┌────────────────────────────────────────────────────────────┐
│ DÉTAIL DES TRANSACTIONS                                     │
└────────────────────────────────────────────────────────────┘

╔════╦════════════╦═══════════════════╦═════════════╦══════════╗
║ N° ║   TYPE     ║      CLIENT       ║   MONTANT   ║  STATUT  ║
╠════╬════════════╬═══════════════════╬═════════════╬══════════╣
${transactionsWithClient.map((t, i) => {
  const type = t.type === 'withdrawal' ? '💸 RETRAIT' : '💰 DÉPÔT  ';
  const status = t.status === 'completed' ? '✅ OK' : '⏳ EN COURS';
  const clientName = (t.clientName || 'Inconnu').padEnd(17).substring(0, 17);
  const amount = String(t.amount || 0).padStart(11);
  const num = String(i + 1).padStart(2);
  return `║ ${num} ║ ${type} ║ ${clientName} ║ ${amount} ║ ${status}   ║`;
}).join('\n╠════╬════════════╬═══════════════════╬═════════════╬══════════╣\n')}
╚════╩════════════╩═══════════════════╩═════════════╩══════════╝
` : '┌────────────────────────────────────────────────────────────┐\n│ Aucune transaction pour cette journée                       │\n└────────────────────────────────────────────────────────────┘\n'}

┌────────────────────────────────────────────────────────────┐
│ RÉSUMÉ FINANCIER                                            │
└────────────────────────────────────────────────────────────┘

  Nombre de dépôts           : ${transactionsWithClient.filter(t => t.type === 'deposit').length}
  Nombre de retraits         : ${transactionsWithClient.filter(t => t.type === 'withdrawal').length}
  
  Total des dépôts           : ${totalDepots.toLocaleString('fr-FR')} XAF
  Total des retraits         : ${totalRetraits.toLocaleString('fr-FR')} XAF
  ────────────────────────────────────────────────────────
  Différence (Dépôts-Retraits): ${(totalDepots - totalRetraits).toLocaleString('fr-FR')} XAF


════════════════════════════════════════════════════════════
Généré le ${format(new Date(), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
════════════════════════════════════════════════════════════
`;

      const fileUri = `${FileSystem.documentDirectory}rapport_${format(forDate, 'dd_MM_yyyy')}.txt`;
      await FileSystem.writeAsStringAsync(fileUri, report, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri);
      console.log('📤 Rapport généré et partagé:', fileUri);
    } catch (error) {
      console.error('Erreur rapport:', error);
      Alert.alert('Erreur', 'Impossible de générer le rapport');
    }
  };

  // --- 🔹 Loading
  if (loading || !user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>  
        <View style={styles.loadingBox}>
          <LottieView
            source={require('../../assets/animations/inProgress.json')}
            autoPlay
            loop
            style={styles.lottie}
          />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- 🔹 UI principale
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header avec gradient */}
        <LinearGradient
          colors={['#10b981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.fullName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>{user.fullName}</Text>
          <Text style={styles.headerSubtitle}>Commercial</Text>
        </LinearGradient>

        {/* Card Informations */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Informations personnelles</Text>
            {!editing && (
              <TouchableOpacity onPress={() => setEditing(true)}>
                <Text style={styles.editButton}>✏️ Modifier</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom complet</Text>
            <TextInput
              value={user.fullName}
              editable={editing}
              onChangeText={(v) => setUser({ ...user, fullName: v })}
              style={[styles.input, editing && styles.inputEditing]}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              value={user.phone}
              editable={editing}
              onChangeText={(v) => setUser({ ...user, phone: v })}
              style={[styles.input, editing && styles.inputEditing]}
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>

          {editing && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={() => setEditing(false)}
                style={[styles.button, styles.buttonSecondary]}
              >
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleUpdate}
                style={[styles.button, styles.buttonPrimary]}
              >
                <Text style={styles.buttonPrimaryText}>✓ Enregistrer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Card Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Statistiques</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{clients.length}</Text>
              <Text style={styles.statLabel}>Clients</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{transactions.length}</Text>
              <Text style={styles.statLabel}>Transactions</Text>
            </View>
          </View>
        </View>

        {/* Card Rapports */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Exporter mon activité</Text>
          <Text style={styles.cardDescription}>
            Générez un rapport détaillé de votre activité commerciale
          </Text>

          <TouchableOpacity
            onPress={() => generateReport(new Date())}
            style={styles.reportButton}
          >
            <Text style={styles.reportButtonIcon}>📄</Text>
            <View style={styles.reportButtonContent}>
              <Text style={styles.reportButtonTitle}>Rapport du jour</Text>
              <Text style={styles.reportButtonSubtitle}>
                Exportez l'activité d'aujourd'hui
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setDatePickerVisible(true)}
            style={[styles.reportButton, styles.reportButtonSecondary]}
          >
            <Text style={styles.reportButtonIcon}>📅</Text>
            <View style={styles.reportButtonContent}>
              <Text style={styles.reportButtonTitleSecondary}>Jour spécifique</Text>
              <Text style={styles.reportButtonSubtitleSecondary}>
                Choisissez une date personnalisée
              </Text>
            </View>
          </TouchableOpacity>

          <DateTimePickerModal
            isVisible={datePickerVisible}
            mode="date"
            maximumDate={new Date()}
            onConfirm={(date) => {
              setDatePickerVisible(false);
              generateReport(date);
            }}
            onCancel={() => setDatePickerVisible(false)}
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  loadingBox: {
    backgroundColor: '#fff',
    paddingVertical: 30,
    paddingHorizontal: 40,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  lottie: {
    width: 80,
    height: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 20,
  },
  editButton: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  inputEditing: {
    borderColor: '#10b981',
    backgroundColor: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#10b981',
  },
  buttonSecondary: {
    backgroundColor: '#f1f5f9',
  },
  buttonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondaryText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reportButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  reportButtonIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  reportButtonContent: {
    flex: 1,
  },
  reportButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  reportButtonSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  reportButtonTitleSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 2,
  },
  reportButtonSubtitleSecondary: {
    fontSize: 13,
    color: '#64748b',
  },
  bottomSpacer: {
    height: 20,
  },
});