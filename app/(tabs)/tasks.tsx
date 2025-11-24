// app/(tabs)/tasks.tsx
import { useAuth } from '@/.vscode/screens/AuthContext';
import { taskServices } from '@/app/services/taskservice';
import { emitter } from '@/app/utils/refreshEmitter'; // Add this import
import DrawerNavigator from '@/components/DrawerNavigator';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date?: string | null;
  completed_at?: string | null;
}

export default function TasksScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadTasks();
      }
    }, [user])
  );

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Add refresh listener
  useEffect(() => {
    const refreshListener = () => {
      loadTasks();
    };

    if (emitter && typeof (emitter as any).on === 'function') {
      (emitter as any).on('refreshTasks', refreshListener);
    }

    return () => {
      if (emitter && typeof (emitter as any).off === 'function') {
        (emitter as any).off('refreshTasks', refreshListener);
      }
    };
  }, []);

  // add this alongside other useState calls at the top of the component
  const [prevStatusMap, setPrevStatusMap] = useState<Record<string, string>>({});

  const loadTasks = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const tasksData = await taskServices.getTasks(user.id);
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const onEditTask = (taskId: string) => {
    router.push(`/modals/EditTaskModal?taskId=${taskId}`);
  };

  const onDeleteTask = (taskId: string) => {
    Alert.alert(
      'Delete task',
      'Are you sure you want to delete this task? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await taskServices.deleteTask(taskId, user.id);
              await loadTasks();
              // Emit refresh event after deletion
              if (emitter && typeof (emitter as any).emit === 'function') {
                (emitter as any).emit('refreshTasks');
              }
            } catch (err) {
              console.error('deleteTask error', err);
              Alert.alert('Error', err?.message ?? 'Failed to delete task');
            }
          },
        },
      ],
    );
  };

  const onToggleCompleted = async (taskId: string, currentlyCompletedAt?: string | null, currentStatus?: string | null) => {
    try {
      // compute new completed_at
      const markingCompleted = !currentlyCompletedAt; // true when we are setting a completion
      const newCompletedAt = markingCompleted ? new Date().toISOString() : null;

      // decide new status and update prevStatusMap accordingly
      let newStatus: string;
      if (markingCompleted) {
        // store current status so we can restore it if the user unchecks
        setPrevStatusMap((m) => ({ ...m, [taskId]: currentStatus ?? 'not_started' }));
        newStatus = 'completed';
      } else {
        // trying to un-complete -> restore previously stored value if any
        const prev = prevStatusMap[taskId];
        // fallback: if prev not found, don't set completed again — choose a safe default
        const fallback = currentStatus && currentStatus !== 'completed' ? currentStatus : 'not_started';
        newStatus = prev ?? fallback;
        // remove saved previous status
        setPrevStatusMap((m) => {
          const copy = { ...m };
          delete copy[taskId];
          return copy;
        });
      }

      // update DB (completed_at and status together)
      await taskServices.updateTask(taskId, user.id, { completed_at: newCompletedAt, status: newStatus });

      // Emit refresh event
      if (emitter && typeof (emitter as any).emit === 'function') {
        (emitter as any).emit('refreshTasks');
      }

      // refresh UI - reload tasks to see immediate update
      await loadTasks();
      
    } catch (err) {
      console.error('toggle completed error', err);
      Alert.alert('Error', err?.message ?? 'Failed to update task completion');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return '#4CAF50'; // Green
      case 'in_progress':
        return '#FF9800'; // Orange
      case 'on_hold':
        return '#FF5722'; // Deep Orange
      case 'not_started':
        return '#F44336'; // Gray
      case 'pending':
        return '#9E9E9E'; // Gray
      default:
        return '#9E9E9E';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return '#F44336'; // Red
      case 'medium':
        return '#FF9800'; // Orange
      case 'low':
        return '#4CAF50'; // Green
      default:
        return '#9E9E9E'; // Gray
    }
  };

  const filteredTasks = tasks.filter(task =>
    (task.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (task.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.statusBar}>
        <Text style={[styles.time, { color: colors.text }]}>9:41</Text>
      </View>

      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => setIsDrawerOpen(true)}
          style={styles.menuButton}
        >
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>All Tasks</Text>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={20} color={colors.secondaryText} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search here"
          placeholderTextColor={colors.secondaryText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredTasks.map((task) => (
          <View key={task.id} style={[styles.taskCard, { backgroundColor: colors.card }]}>
            {/* Top section with title and action buttons */}
            <View style={styles.topSection}>
              <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={2}>
                {task.title}
              </Text>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity onPress={() => onEditTask(task.id)} style={styles.iconButton}>
                  <Ionicons name="pencil-outline" size={18} color={colors.tint} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDeleteTask(task.id)} style={styles.iconButton}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Description */}
            <Text style={[styles.taskDescription, { color: colors.secondaryText }]} numberOfLines={3}>
              {task.description}
            </Text>

            {/* Status and Priority - EXACTLY LIKE THE IMAGE */}
            <View style={styles.statusPriorityContainer}>
              <View style={styles.statusPriorityItem}>
                <Text style={[styles.statusPriorityLabel, { color: colors.secondaryText }]}>
                  Status
                </Text>
                <View style={[styles.statusPriorityValue, { backgroundColor: getStatusColor(task.status) }]}>
                  <Text style={styles.statusPriorityValueText}>
                    {task.status || 'None'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.statusPriorityItem}>
                <Text style={[styles.statusPriorityLabel, { color: colors.secondaryText }]}>
                  Priority
                </Text>
                <View style={[styles.statusPriorityValue, { backgroundColor: getPriorityColor(task.priority) }]}>
                  <Text style={styles.statusPriorityValueText}>
                    {task.priority || 'None'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Bottom section with due date and complete toggle */}
            <View style={styles.bottomSection}>
              {task.due_date && (
                <View style={styles.dueDate}>
                  <Ionicons name="calendar-outline" size={16} color={colors.secondaryText} />
                  <Text style={[styles.dueDateText, { color: colors.secondaryText }]}>
                    Due {new Date(task.due_date).toLocaleDateString()}
                  </Text>
                </View>
              )}

              <View style={styles.completeSection}>
                <Text style={[styles.completeLabel, { color: colors.secondaryText }]}>
                  Complete
                </Text>
                <Switch
                  value={!!task.completed_at}
                  onValueChange={() => onToggleCompleted(task.id, task.completed_at, task.status)}
                  trackColor={{ false: '#767577', true: getStatusColor('completed') }}
                  thumbColor={task.completed_at ? '#fff' : '#f4f3f4'}
                />
              </View>
            </View>

            {/* Completed timestamp */}
            {task.completed_at && (
              <View style={styles.completedAtRow}>
                <Ionicons name="checkmark-circle" size={14} color={getStatusColor('completed')} />
                <Text style={[styles.completedAtText, { color: colors.secondaryText }]}>
                  Completed {new Date(task.completed_at).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        ))}

        {filteredTasks.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-outline" size={64} color={colors.secondaryText} />
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
              No tasks found
            </Text>
          </View>
        )}
      </ScrollView>

      <DrawerNavigator 
        isVisible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentScreen="tasks"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBar: {
    width: '100%',
    paddingTop: 50,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  time: {
    fontSize: 17,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  menuButton: {
    marginRight: 15,
    padding: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  taskCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 6,
    borderRadius: 6,
  },
  taskDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  statusPriorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusPriorityItem: {
    flex: 1,
  },
  statusPriorityLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  statusPriorityValue: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusPriorityValueText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dueDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  completeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  completedAtRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  completedAtText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 10,
  },
});