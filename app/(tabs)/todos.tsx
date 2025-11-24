// app/(tabs)/todos.tsx
import { useAuth } from '@/.vscode/screens/AuthContext';
import { projectServices } from '@/app/services/projectservice';
import { taskServices } from '@/app/services/taskservice';
import { emitter } from '@/app/utils/refreshEmitter';
import DrawerNavigator from '@/components/DrawerNavigator';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type MergedItem = {
  id: string;
  title: string;
  type: 'project' | 'task';
  due_date?: string | null;
  status?: string | null;
  completed_at?: string | null;
  project_name?: string | null;
  description?: string | null;
};

export default function TodosScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  const [items, setItems] = useState<MergedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Load data on initial mount and when user changes
  useEffect(() => {
    if (user) {
      loadAll();
    }
  }, [user]);

  // Listen for refresh events
  useEffect(() => {
    const refreshListener = () => {
      loadAll(); // Fixed: changed from loadTodo to loadAll
    };

    if (emitter && typeof (emitter as any).on === 'function') {
      (emitter as any).on('refreshTasks', refreshListener);
      (emitter as any).on('refreshProjects', refreshListener); // Also listen for project refreshes
    }

    return () => {
      if (emitter && typeof (emitter as any).off === 'function') {
        (emitter as any).off('refreshTasks', refreshListener);
        (emitter as any).off('refreshProjects', refreshListener);
      }
    };
  }, []);

  const parseDateToISODate = (d: any) => {
    if (!d && d !== 0) return null;
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return null;
      return dt.toISOString().slice(0, 10);
    } catch (e) {
      return null;
    }
  };

  const loadAll = async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [projects, tasks] = await Promise.all([
        projectServices.getProjectsByOwner(user.id),
        taskServices.getTasks(user.id),
      ]);

      const projectMap: Record<string, string> = {};
      (projects || []).forEach((p: any) => {
        if (p && p.id) projectMap[String(p.id)] = p.name ?? '';
      });

      const merged: MergedItem[] = [
        ...(projects || []).map((p: any) => ({
          id: `project-${p.id}`,
          title: p.name || 'Untitled Project',
          type: 'project' as const,
          due_date: p.due_date ?? null,
          status: p.status ?? null,
          completed_at: p.completed_at ?? null,
          project_name: null,
          description: p.description ?? null,
        })),
        ...(tasks || []).map((t: any) => ({
          id: `task-${t.id}`,
          title: t.title || 'Untitled Task',
          type: 'task' as const,
          due_date: t.due_date ?? null,
          status: t.status ?? null,
          completed_at: t.completed_at ?? null,
          project_name: t.project_id ? projectMap[String(t.project_id)] ?? null : null,
          description: t.description ?? null,
        })),
      ];

      // keep ordering sensible: due date ascending (nulls at the end), then title
      merged.sort((a, b) => {
        const ad = parseDateToISODate(a.due_date);
        const bd = parseDateToISODate(b.due_date);
        if (ad && bd) {
          if (ad < bd) return -1;
          if (ad > bd) return 1;
        } else if (ad && !bd) {
          return -1;
        } else if (!ad && bd) {
          return 1;
        }
        return a.title.localeCompare(b.title);
      });

      setItems(merged);
    } catch (err) {
      console.error('Error loading todos merged list:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Completed / Pending counts (completed = completed_at || status === 'completed')
  const isCompleted = (it: MergedItem) => {
    if (it.completed_at) return true;
    if ((it.status || '').toLowerCase() === 'completed') return true;
    return false;
  };
  const completedCount = items.filter(isCompleted).length;
  const pendingCount = items.length - completedCount;

  const renderBadge = (type: MergedItem['type']) => (
    <View style={[styles.smallBadge, { backgroundColor: type === 'task' ? '#BBDEFB' : '#E1BEE7' }]}>
      <Text style={styles.smallBadgeText}>{type === 'task' ? 'Task' : 'Project'}</Text>
    </View>
  );

  const renderStatusPill = (it: MergedItem) => {
    const st = (it.status || '').toLowerCase();
    if (isCompleted(it)) {
      return <View style={[styles.pill, { backgroundColor: '#4CAF50' }]}><Text style={styles.pillText}>Completed</Text></View>;
    }
    // show generic state or 'Pending'
    const label = st ? (st.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())) : 'Pending';
    const bg = st.includes('progress') || st.includes('ongoing') ? '#FF9800' : '#F44336';
    return <View style={[styles.pill, { backgroundColor: bg }]}><Text style={styles.pillText}>{label}</Text></View>;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.statusBar}>
        <Text style={[styles.time, { color: colors.text }]}>9:41</Text>
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsDrawerOpen(true)} style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Todos</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top statistics card */}
        <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statsTitle, { color: colors.text }]}>Statistics</Text>
          <View style={styles.statsRow}>
            <View style={styles.statsItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' }} />
                <Text style={[styles.statsLabel, { color: colors.secondaryText }]}>Done</Text>
              </View>
              <Text style={[styles.statsNumber, { color: colors.text }]}>{completedCount}</Text>
            </View>
            <View style={styles.statsItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F44336' }} />
                <Text style={[styles.statsLabel, { color: colors.secondaryText }]}>Pending</Text>
              </View>
              <Text style={[styles.statsNumber, { color: colors.text }]}>{pendingCount}</Text>
            </View>
          </View>
        </View>

        {/* Single-line card list: each entry (project or task) as a card like your screenshot */}
        {loading ? (
          <View style={{ paddingVertical: 24 }}><ActivityIndicator /></View>
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={64} color={colors.secondaryText} />
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No items found</Text>
          </View>
        ) : (
          items.map((it) => {
            const isoDue = parseDateToISODate(it.due_date);
            return (
              <View key={it.id} style={[styles.listCard, { backgroundColor: colors.card }]}>
                <View style={styles.cardTop}>
                  <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{it.title}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    {renderBadge(it.type)}
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardBottom}>
                  <View style={styles.leftBottom}>
                    <Ionicons name="calendar-outline" size={18} color={colors.secondaryText} />
                    <Text style={[styles.dueDateSmall, { color: colors.secondaryText }]}>
                      {isoDue ? new Date(isoDue).toLocaleDateString() : 'No due date'}
                    </Text>
                  </View>

                  <View style={styles.rightBottom}>
                    {renderStatusPill(it)}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <DrawerNavigator isVisible={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} currentScreen="todos" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusBar: { width: '100%', paddingTop: 50, paddingHorizontal: 20, alignItems: 'center' },
  time: { fontSize: 17, fontWeight: '600' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10},
  menuButton: { marginRight: 12, padding: 4 },
  title: { fontSize: 28, fontWeight: '700' },

  content: { flex: 1, paddingHorizontal: 16, paddingBottom: 24 },

  // stats
  statsCard: {
    marginTop: 8,
    padding: 18,
    borderRadius: 12,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statsTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statsItem: { alignItems: 'center' },
  statsLabel: { fontSize: 14 },
  statsNumber: { fontSize: 18, fontWeight: '700', marginTop: 6 },

  // list card (one-row style like your screenshot)
  listCard: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', flex: 1, paddingRight: 12 },

  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginBottom: 10,
  },

  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leftBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dueDateSmall: { fontSize: 12 },

  rightBottom: { flexDirection: 'row', alignItems: 'center' },

  smallBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    minHeight: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  pillText: { color: '#fff', fontWeight: '600', fontSize: 12 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, marginTop: 10 },
});