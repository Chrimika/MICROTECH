import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
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
import { Ionicons } from '@expo/vector-icons';

export default function TabThreeScreen() {
  const colorScheme = useColorScheme();
  const [idCommercial, setIdCommercial] = useState('');
  const [user, setUser] = useState<any>(null);
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? '#121212' : '#f5f5f5';
  const textColor = isDark ? '#fff' : '#000';
  const cardBg = isDark ? '#1e1e1e' : '#fff';
  const borderColor = isDark ? '#333' : '#e0e0e0';
  const labelColor = isDark ? '#999' : '#666';
  const inputBg = isDark ? '#2a2a2a' : '#f9f9f9';

  useEffect(() => {
    const fetchCurrentCommercial = async () => {
      try {
        const json = await AsyncStorage.getItem('currentCommercial');
        if (json) {
          const commercial = JSON.parse(json);
          if (commercial.idCommercial) {
            setIdCommercial(commercial.idCommercial);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Erreur récupération commercial local:', error);
        setLoading(false);
      }
    };
    fetchCurrentCommercial();
  }, []);

  useEffect(() => {
    if (!idCommercial) return;

    setLoading(true);

    let unsubUser: (() => void) | null = null;
    let unsubClients: (() => void) | null = null;
    let unsubTrans: (() => void) | null = null;

    const loadData = async () => {
      try {
        const q = query(collection(db, 'Commercial'), where('idCommercial', '==', idCommercial));
        const snap = await getDocs(q);

        if (snap.empty) {
          Alert.alert('Erreur', 'Commercial introuvable.');
          setLoading(false);
          return;
        }

        const docRef = snap.docs[0].ref;
        setUserDocId(docRef.id);

        unsubUser = onSnapshot(docRef, (d) => {
          if (d.exists()) {
            setUser({ id: d.id, ...d.data() });
          }
        });

        const clientsQ = query(collection(db, 'Clients'), where('idCommerciale', '==', idCommercial));
        unsubClients = onSnapshot(clientsQ, (snap) => {
          const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setClients(arr);
        });

        const transQ = query(collection(db, 'Transactions'), where('idCommercial', '==', idCommercial));
        unsubTrans = onSnapshot(transQ, (snap) => {
          const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setTransactions(arr);
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

  const handleUpdate = async () => {
    if (!userDocId) return Alert.alert('Erreur', 'Document introuvable');
    try {
      setSaving(true);
      const ref = doc(db, 'Commercial', userDocId);
      await updateDoc(ref, {
        fullName: user.fullName,
        phone: user.phone,
      });
      setEditing(false);
      Alert.alert('Succès', 'Profil mis à jour');
    } catch (e) {
      console.error('Erreur mise à jour:', e);
      Alert.alert('Erreur', 'Échec de mise à jour');
    } finally {
      setSaving(false);
    }
  };

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
    } catch (error) {
      console.error('Erreur rapport:', error);
      Alert.alert('Erreur', 'Impossible de générer le rapport');
    }
  };

  if (loading || !user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#008a5c" />
          <Text style={{ color: textColor, marginTop: 10, fontSize: 16 }}>
            Chargement...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Profile */}
        <View style={[styles.header, { backgroundColor: cardBg }]}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color="#fff" />
            </View>
          </View>
          <Text style={[styles.headerTitle, { color: textColor }]}>{user.fullName}</Text>
          <Text style={[styles.headerSubtitle, { color: labelColor }]}>
            Commercial • {user.idCommercial}
          </Text>
        </View>

        {/* Personal Info Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="person-outline" size={20} color="#008a5c" />
              <Text style={[styles.cardTitle, { color: textColor }]}>
                Informations personnelles
              </Text>
            </View>
            {!editing && (
              <TouchableOpacity onPress={() => setEditing(true)}>
                <Ionicons name="create-outline" size={20} color="#008a5c" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: labelColor }]}>Nom complet</Text>
            <View style={[
              styles.inputContainer,
              { 
                borderColor: editing ? '#008a5c' : borderColor,
                backgroundColor: editing ? inputBg : (isDark ? '#252525' : '#f5f5f5')
              }
            ]}>
              <Ionicons name="person-circle-outline" size={18} color={labelColor} />
              <TextInput
                value={user.fullName}
                editable={editing}
                onChangeText={(v) => setUser({ ...user, fullName: v })}
                style={[styles.input, { color: textColor }]}
                placeholderTextColor={isDark ? '#666' : '#999'}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: labelColor }]}>Téléphone</Text>
            <View style={[
              styles.inputContainer,
              { 
                borderColor: editing ? '#008a5c' : borderColor,
                backgroundColor: editing ? inputBg : (isDark ? '#252525' : '#f5f5f5')
              }
            ]}>
              <Ionicons name="call-outline" size={18} color={labelColor} />
              <TextInput
                value={user.phone}
                editable={editing}
                onChangeText={(v) => setUser({ ...user, phone: v })}
                style={[styles.input, { color: textColor }]}
                placeholderTextColor={isDark ? '#666' : '#999'}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: labelColor }]}>Email</Text>
            <View style={[
              styles.inputContainer,
              { 
                borderColor: borderColor,
                backgroundColor: isDark ? '#252525' : '#f5f5f5',
                opacity: 0.6
              }
            ]}>
              <Ionicons name="mail-outline" size={18} color={labelColor} />
              <TextInput
                value={user.email}
                editable={false}
                style={[styles.input, { color: textColor }]}
              />
            </View>
          </View>

          {editing && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={() => setEditing(false)}
                style={[styles.button, styles.buttonSecondary, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5', borderColor }]}
              >
                <Text style={[styles.buttonSecondaryText, { color: textColor }]}>
                  Annuler
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleUpdate}
                disabled={saving}
                style={[styles.button, styles.buttonPrimary]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.buttonPrimaryText}>Enregistrer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Stats Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name="stats-chart" size={20} color="#008a5c" />
            <Text style={[styles.cardTitle, { color: textColor }]}>Statistiques</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <View style={styles.statIconContainer}>
                <Ionicons name="people" size={24} color="#008a5c" />
              </View>
              <Text style={styles.statNumber}>{clients.length}</Text>
              <Text style={[styles.statLabel, { color: labelColor }]}>Clients</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: borderColor }]} />
            <View style={styles.statBox}>
              <View style={styles.statIconContainer}>
                <Ionicons name="repeat" size={24} color="#2E7D32" />
              </View>
              <Text style={[styles.statNumber, { color: '#2E7D32' }]}>
                {transactions.length}
              </Text>
              <Text style={[styles.statLabel, { color: labelColor }]}>Transactions</Text>
            </View>
          </View>
        </View>

        {/* Reports Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="document-text" size={20} color="#008a5c" />
            <Text style={[styles.cardTitle, { color: textColor }]}>
              Rapports d'activité
            </Text>
          </View>
          <Text style={[styles.cardDescription, { color: labelColor }]}>
            Générez un rapport détaillé de votre activité commerciale
          </Text>

          <TouchableOpacity
            onPress={() => generateReport(new Date())}
            style={styles.reportButton}
          >
            <View style={styles.reportButtonIconContainer}>
              <Ionicons name="today" size={24} color="#fff" />
            </View>
            <View style={styles.reportButtonContent}>
              <Text style={styles.reportButtonTitle}>Rapport du jour</Text>
              <Text style={styles.reportButtonSubtitle}>
                Exportez l'activité d'aujourd'hui
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setDatePickerVisible(true)}
            style={[styles.reportButton, styles.reportButtonSecondary, { borderColor }]}
          >
            <View style={[styles.reportButtonIconContainer, { backgroundColor: '#e6fff4' }]}>
              <Ionicons name="calendar" size={24} color="#008a5c" />
            </View>
            <View style={styles.reportButtonContent}>
              <Text style={[styles.reportButtonTitleSecondary, { color: textColor }]}>
                Jour spécifique
              </Text>
              <Text style={[styles.reportButtonSubtitleSecondary, { color: labelColor }]}>
                Choisissez une date personnalisée
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={labelColor} />
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#008a5c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  cardDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  buttonPrimary: {
    backgroundColor: '#008a5c',
  },
  buttonSecondary: {
    borderWidth: 1,
  },
  buttonPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e6fff4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statDivider: {
    width: 1,
    height: 80,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#008a5c',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#008a5c',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  reportButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  reportButtonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reportButtonContent: {
    flex: 1,
  },
  reportButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  reportButtonSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  reportButtonTitleSecondary: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  reportButtonSubtitleSecondary: {
    fontSize: 13,
  },
  bottomSpacer: {
    height: 20,
  },
});