// app/(tabs)/projects.tsx
import { projectService } from '@/.vscode/database';
import { useAuth } from '@/.vscode/screens/AuthContext';
import { projectServices } from '@/app/services/projectservice';
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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  color: string;
  due_date: string;
  priority: string;
}

export default function ProjectsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadProjects();
      }
    }, [user])
  );


  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const projectsData = await projectService.getProjects(user.id);
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const onEditProject = (projectId: string) => {
    router.push(`../modals/EditProjectModal?projectId=${projectId}`);
  };

  const onDeleteProject = (projectId: string) => {
    Alert.alert(
      'Delete project',
      'Are you sure you want to delete this project? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await projectServices.deleteProject(projectId, user.id);
              await loadProjects();
            } catch (err) {
              console.error('Failed to delete project', err);
              Alert.alert('Error', err?.message ?? 'Failed to delete project');
            }
          }
        },
      ],
    );
  };

  const getStatusBg = (status: string) => {
    if (!status) return 'transparent';
    switch (status?.toLowerCase()) {
      case 'on-going':
        return '#FF9800';
      case 'completed':
        return '#4CAF50'; // blue-ish
      case 'paused':
        return '#F44336'; // neutral gray (fallback)
      case 'discontinued':
        return colors.error;
      default:
        return '#BDBDBD';
    }
  };

  const getPriorityBg = (priority: string) => {
    if (!priority) return 'transparent';
    switch (priority?.toLowerCase()) {
      case 'high':
        return '#FF5722'; // orange
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.success;
      default:
        return '#F44336';
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
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
        <Text style={[styles.title, { color: colors.text }]}>Projects</Text>
      </View>

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
        {filteredProjects.map((project) => (
          <View key={project.id} style={[styles.projectCard, { backgroundColor: colors.card }]}>
            {/* Action buttons positioned at top-right */}
            <View style={styles.actionButtonsTopRight}>
              <TouchableOpacity 
                onPress={() => onEditProject(project.id)} 
                style={styles.iconButton}
                accessibilityLabel="Edit project"
              >
                <Ionicons name="pencil-outline" size={16} color={colors.tint} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => onDeleteProject(project.id)} 
                style={styles.iconButton}
                accessibilityLabel="Delete project"
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>

            {/* Project Header */}
            <View style={styles.projectHeader}>
              <Text style={[styles.projectName, { color: colors.text }]}>
                {project.name}
              </Text>
            </View>
            
            <Text style={[styles.projectDescription, { color: colors.secondaryText }]}>
              {project.description}
            </Text>

            {/* Status and Priority Pill Badges */}
            <View style={styles.statusPrioritySection}>
              <View style={styles.statusPriorityItem}>
                <Text style={[styles.statusPriorityLabel, { color: colors.secondaryText }]}>
                  Status
                </Text>
                <View style={styles.statusPriorityValues}>
                  <View style={[styles.pill, { backgroundColor: getStatusBg(project.status) }]}>
                    <Text style={[styles.pillText, { color: '#fff' }]}>{(project.status || 'None')}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.statusPriorityItem}>
                <Text style={[styles.statusPriorityLabel, { color: colors.secondaryText }]}>
                  Priority
                </Text>
                <View style={styles.statusPriorityValues}>
                  <View style={[styles.pill, { backgroundColor: getPriorityBg(project.priority) }]}>
                    <Text style={[styles.pillText, { color: '#fff' }]}>{(project.priority || 'None')}</Text>
                  </View>
                </View>
              </View>
            </View>

            {project.due_date && (
              <View style={styles.dueDate}>
                <Ionicons name="calendar-outline" size={16} color={colors.secondaryText} />
                <Text style={[styles.dueDateText, { color: colors.secondaryText }]}>
                  Due {new Date(project.due_date).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        ))}

        {filteredProjects.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="folder-outline" size={64} color={colors.secondaryText} />
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
              No projects found
            </Text>
          </View>
        )}
      </ScrollView>

      <DrawerNavigator 
        isVisible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentScreen="projects"
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
  projectCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative', // allow absolute child positioning
  },
  // action buttons on top-right inside the card
  actionButtonsTopRight: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  iconButton: {
    padding: 6,
    borderRadius: 8,
    // a subtle touch target background on press (kept transparent by default)
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  projectDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  statusPrioritySection: {
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPriorityItem: {
    flex: 1,
    marginRight: 12,
  },
  statusPriorityLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  statusPriorityValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    // If you want subtle shadow for pill:
    // shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dueDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  dueDateText: {
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
