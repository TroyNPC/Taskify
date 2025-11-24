// app/(tabs)/explore.tsx
import { meetingService, projectService, taskService } from '@/.vscode/database';
import { useAuth } from '@/.vscode/screens/AuthContext';
import { emitter } from '@/app/utils/refreshEmitter';
import DrawerNavigator from '@/components/DrawerNavigator';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  totalMeetings: number;
  totalTodos: number;
  completedTodos: number;
  pendingTodos: number;
}

export default function ExploreScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    totalTasks: 0,
    totalMeetings: 0,
    totalTodos: 0,
    completedTodos: 0,
    pendingTodos: 0,
  });
  const [loading, setLoading] = useState(true);
  const [workspaceName] = useState('Default Workspace'); // static text per your request
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
    // Format the time
  const formattedTime = currentTime.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });

  useEffect(() => {
    // Live time updates
    setCurrentTime(new Date());
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Load dashboard data
    loadDashboardData();
    
    // Subscribe to refresh events - listen for ALL relevant events
    const refreshDashboard = () => { 
      loadDashboardData(); 
    };

    if (emitter && typeof (emitter as any).on === 'function') {
      (emitter as any).on('refreshDashboard', refreshDashboard);
      (emitter as any).on('refreshTasks', refreshDashboard);
      (emitter as any).on('refreshProjects', refreshDashboard);
      (emitter as any).on('refreshMeetings', refreshDashboard);
    }

    // Cleanup function
    return () => { 
      clearInterval(timeInterval); // Clear the time interval
      if (emitter && typeof (emitter as any).off === 'function') {
        (emitter as any).off('refreshDashboard', refreshDashboard);
        (emitter as any).off('refreshTasks', refreshDashboard);
        (emitter as any).off('refreshProjects', refreshDashboard);
        (emitter as any).off('refreshMeetings', refreshDashboard);
      }
    };
  }, [user?.id]);


  async function tryCall<T = any>(serviceObj: any, fnNames: string[], ...args: any[]): Promise<T | null> {
    if (!serviceObj) return null;
    for (const name of fnNames) {
      const fn = serviceObj[name];
      if (typeof fn === 'function') {
        try {
          return await fn(...args);
        } catch (err) {
          console.warn(`Service.${name} threw`, err);
          return null;
        }
      }
    }
    console.warn('No matching function found on service. Tried:', fnNames);
    return null;
  }

  // Function to calculate todos stats from projects and tasks
  const calculateTodosStats = async (userId: string) => {
    let completedTodos = 0;
    let pendingTodos = 0;

    try {
      // Get projects and tasks
      const [projectsResult, tasksResult] = await Promise.all([
        tryCall(projectService, ['getProjectsByOwner', 'getProjects'], userId),
        tryCall(taskService, ['getTasksByCreator', 'getTasks'], userId)
      ]);

      // Process projects
      if (Array.isArray(projectsResult)) {
        projectsResult.forEach((project: any) => {
          if (project.completed_at) {
            completedTodos++;
          } else {
            const status = project.status?.toLowerCase().trim();
            const incompleteStatuses = [
              'not_started',
              'in_progress',
              'on_going',
              'on-going',
              'on_hold',
              'on_paused',
              'paused',
              'pending'
            ];
            
            if (status === 'completed') {
              completedTodos++;
            } else if (incompleteStatuses.includes(status) || !status) {
              pendingTodos++;
            } else {
              pendingTodos++;
            }
          }
        });
      }

      // Process tasks
      if (Array.isArray(tasksResult)) {
        tasksResult.forEach((task: any) => {
          if (task.completed_at) {
            completedTodos++;
          } else {
            const status = task.status?.toLowerCase().trim();
            const incompleteStatuses = [
              'not_started',
              'in_progress',
              'on_going',
              'on-going',
              'on_hold',
              'on_paused',
              'paused',
              'pending'
            ];
            
            if (status === 'completed') {
              completedTodos++;
            } else if (incompleteStatuses.includes(status) || !status) {
              pendingTodos++;
            } else {
              pendingTodos++;
            }
          }
        });
      }

    } catch (error) {
      console.error('Error calculating todos stats:', error);
    }

    return { completedTodos, pendingTodos };
  };

  const loadDashboardData = async () => {
    if (!user?.id) {
      setStats((s) => ({ ...s, totalProjects: 0, totalTasks: 0, totalMeetings: 0, totalTodos: 0, completedTodos: 0, pendingTodos: 0 }));
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Projects: try getProjectsByOwner -> getProjects -> getProjectCount
      const projectsResult = await tryCall(projectService, ['getProjectsByOwner', 'getProjects', 'getProjectCount'], user.id);
      let projectCount = 0;
      if (Array.isArray(projectsResult)) {
        projectCount = projectsResult.length;
      } else if (typeof projectsResult === 'number') {
        projectCount = projectsResult;
      } else if (projectsResult && typeof projectsResult.count === 'number') {
        projectCount = projectsResult.count;
      }

      // Tasks: try getTasksByCreator -> getTasks -> getTaskCount
      const tasksResult = await tryCall(taskService, ['getTasksByCreator', 'getTasks', 'getTaskCount'], user.id);
      let taskCount = 0;
      if (Array.isArray(tasksResult)) {
        taskCount = tasksResult.length;
      } else if (typeof tasksResult === 'number') {
        taskCount = tasksResult;
      } else if (tasksResult && typeof tasksResult.count === 'number') {
        taskCount = tasksResult.count;
      }

      // FIXED: Meetings - use correct function names that exist in meetingService
      const meetingsResult = await tryCall(meetingService, ['getMeetings', 'getMyMeetings'], user.id);
      let meetingCount = 0;
      if (Array.isArray(meetingsResult)) {
        meetingCount = meetingsResult.length;
      } else if (typeof meetingsResult === 'number') {
        meetingCount = meetingsResult;
      }

      // Calculate todos overview from projects and tasks
      const todosStats = await calculateTodosStats(user.id);

      // Total Todos = Projects + Tasks
      const totalTodosCount = projectCount + taskCount;

      setStats({
        totalProjects: projectCount,
        totalTasks: taskCount,
        totalMeetings: meetingCount,
        totalTodos: totalTodosCount, // This is now projects + tasks
        completedTodos: todosStats.completedTodos,
        pendingTodos: todosStats.pendingTodos,
      });
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getUserInitials = () => {
    if (!user?.user_metadata?.full_name) return 'U';
    return user.user_metadata.full_name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase();
  };

  const getUserDisplayName = () => {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.statusBar}>
          <Text style={[styles.time, { color: colors.text }]}>{formattedTime}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading your dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.statusBar}>
        <Text style={[styles.time, { color: colors.text }]}>{formattedTime}</Text>
      </View>

      <ScrollView
        style={[styles.content, isDrawerOpen && styles.contentWithDrawerOpen]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with user info and menu button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setIsDrawerOpen(true)} style={styles.menuButton}>
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
            <Text style={styles.avatarText}>{getUserInitials()}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.greeting, { color: colors.text }]}>Hey {getUserDisplayName()}!</Text>
            <Text style={[styles.subGreeting, { color: colors.secondaryText }]}>Good morning</Text>
          </View>
        </View>

        {/* Always display static workspace name as requested */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{workspaceName}</Text>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={styles.statHeader}>
              <Ionicons name="folder-outline" size={24} color={colors.tint} />
              <Text style={[styles.statNumber, { color: colors.text }]}>{stats.totalProjects}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Total Projects</Text>
            <TouchableOpacity style={styles.viewMoreButton} onPress={() => router.push('/(tabs)/projects')}>
              <Text style={[styles.viewMore, { color: colors.tint }]}>View more</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.tint} />
            </TouchableOpacity>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={styles.statHeader}>
              <Ionicons name="checkmark-done-outline" size={24} color={colors.tint} />
              <Text style={[styles.statNumber, { color: colors.text }]}>{stats.totalTasks}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Total Tasks</Text>
            <TouchableOpacity style={styles.viewMoreButton} onPress={() => router.push('/(tabs)/tasks')}>
              <Text style={[styles.viewMore, { color: colors.tint }]}>View more</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.tint} />
            </TouchableOpacity>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={styles.statHeader}>
              <Ionicons name="people-outline" size={24} color={colors.tint} />
              <Text style={[styles.statNumber, { color: colors.text }]}>{stats.totalMeetings}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Total Meetings</Text>
            <TouchableOpacity style={styles.viewMoreButton} onPress={() => router.push('/(tabs)/meetings')}>
              <Text style={[styles.viewMore, { color: colors.tint }]}>View more</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.tint} />
            </TouchableOpacity>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={styles.statHeader}>
              <Ionicons name="list-outline" size={24} color={colors.tint} />
              <Text style={[styles.statNumber, { color: colors.text }]}>{stats.totalTodos}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Total Todos</Text>
            <TouchableOpacity style={styles.viewMoreButton} onPress={() => router.push('/(tabs)/todos')}>
              <Text style={[styles.viewMore, { color: colors.tint }]}>View more</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.tint} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Todos Overview */}
        <View style={[styles.todosOverview, { backgroundColor: colors.card }]}>
          <Text style={[styles.todosTitle, { color: colors.text }]}>Todos Overview</Text>
          <View style={styles.todosStats}>
            <View style={styles.todoStat}>
              <Text style={[styles.todoStatNumber, { color: colors.success }]}>+{stats.completedTodos}</Text>
              <Text style={[styles.todoStatLabel, { color: colors.secondaryText }]}>Done</Text>
            </View>
            <View style={styles.todoStat}>
              <Text style={[styles.todoStatNumber, { color: colors.warning }]}>+{stats.pendingTodos}</Text>
              <Text style={[styles.todoStatLabel, { color: colors.secondaryText }]}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.card }]} onPress={() => router.push('../modals/AddProjectModal')}>
              <Ionicons name="add-circle-outline" size={20} color={colors.tint} />
              <Text style={[styles.actionText, { color: colors.text }]}>Add Project</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.card }]} onPress={() => router.push('../modals/CreateTaskModal')}>
              <Ionicons name="create-outline" size={20} color={colors.tint} />
              <Text style={[styles.actionText, { color: colors.text }]}>Create Task</Text>
            </TouchableOpacity>
            
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.card }]} onPress={() => router.push('../modals/AddMeetingModal')}>
              <Ionicons name="people-outline" size={20} color={colors.tint} />
              <Text style={[styles.actionText, { color: colors.text }]}>Create Meeting</Text>
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>

      <DrawerNavigator isVisible={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} currentScreen="dashboard" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusBar: { width: '100%', paddingTop: 50, paddingHorizontal: 30, alignItems: 'center' },
  time: { fontSize: 17, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  contentWithDrawerOpen: {},
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  menuButton: { marginRight: 15, padding: 4 },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  greeting: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  subGreeting: { fontSize: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 30 },
  statCard: { width: '48%', padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statNumber: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 14, marginBottom: 15, fontWeight: '500' },
  viewMoreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewMore: { fontSize: 14, fontWeight: '600' },
  todosOverview: { padding: 20, borderRadius: 16, marginBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  todosTitle: { fontSize: 18, fontWeight: '600', marginBottom: 15 },
  todosStats: { flexDirection: 'row', justifyContent: 'space-around' },
  todoStat: { alignItems: 'center' },
  todoStatNumber: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  todoStatLabel: { fontSize: 14, fontWeight: '500' },
  actionsContainer: { marginBottom: 30 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionButton: { width: '48%', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  actionText: { fontSize: 14, fontWeight: '600' },
});