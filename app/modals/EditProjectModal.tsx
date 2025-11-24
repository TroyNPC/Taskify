// app/modals/EditProjectModal.tsx
import { useAuth } from '@/.vscode/screens/AuthContext';
import { ProjectRow, projectServices } from '@/app/services/projectservice';
import { emitter } from '@/app/utils/refreshEmitter';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const STATUS_OPTIONS = ['On-going', 'Paused', 'Completed'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];

export default function EditProjectModal() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'On-going',
    priority: 'Medium',
    due_date: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (projectId && user) {
      loadProject();
    }
  }, [projectId, user]);

  const loadProject = async () => {
    if (!projectId || !user) return;
    
    try {
      setLoading(true);
      const projectData = await projectServices.getProjectById(projectId as string, user.id);
      
      if (projectData) {
        setProject(projectData);
        setFormData({
          name: projectData.name || '',
          description: projectData.description || '',
          status: projectData.status || 'On-going',
          priority: projectData.priority || 'Medium',
          due_date: projectData.due_date || '',
        });
        
        // Set the selected date if due_date exists
        if (projectData.due_date) {
          setSelectedDate(new Date(projectData.due_date));
        }
      }
    } catch (error) {
      console.error('Error loading project:', error);
      Alert.alert('Error', 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      await projectServices.updateProject(projectId as string, user.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || null,
      });

      // Emit refresh events for both projects and tasks
      if (emitter && typeof (emitter as any).emit === 'function') {
        (emitter as any).emit('refreshProjects');
        (emitter as any).emit('refreshTasks'); // Add this line to refresh tasks
      }

      router.back();
      
    } catch (error: any) {
      console.error('Error updating project:', error);
      Alert.alert('Error', error.message || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  // NEW: Function to handle immediate status change
  const handleStatusChange = async (status: string) => {
    try {
      setFormData(prev => ({ ...prev, status }));
      
      // Immediately update the status in the database
      await projectServices.updateProject(projectId as string, user.id, {
        status: status,
        // Keep other fields the same
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        priority: formData.priority,
        due_date: formData.due_date || null,
      });

      // Emit refresh events immediately
      if (emitter && typeof (emitter as any).emit === 'function') {
        (emitter as any).emit('refreshProjects');
        (emitter as any).emit('refreshTasks'); // Refresh tasks too
      }

    } catch (error: any) {
      console.error('Error updating project status:', error);
      Alert.alert('Error', error.message || 'Failed to update project status');
      // Revert the status change in UI if failed
      setFormData(prev => ({ ...prev, status: project?.status || 'On-going' }));
    }
  };

  // NEW: Function to handle immediate priority change
  const handlePriorityChange = async (priority: string) => {
    try {
      setFormData(prev => ({ ...prev, priority }));
      
      // Immediately update the priority in the database
      await projectServices.updateProject(projectId as string, user.id, {
        priority: priority,
        // Keep other fields the same
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        due_date: formData.due_date || null,
      });

      // Emit refresh events immediately
      if (emitter && typeof (emitter as any).emit === 'function') {
        (emitter as any).emit('refreshProjects');
      }

    } catch (error: any) {
      console.error('Error updating project priority:', error);
      Alert.alert('Error', error.message || 'Failed to update project priority');
      // Revert the priority change in UI if failed
      setFormData(prev => ({ ...prev, priority: project?.priority || 'Medium' }));
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (date) {
      // Prevent selecting past dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (date < today) {
        Alert.alert('Invalid Date', 'Please select a future date');
        return;
      }
      
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
      setFormData(prev => ({ ...prev, due_date: formattedDate }));
    }
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const clearDate = () => {
    setSelectedDate(new Date());
    setFormData(prev => ({ ...prev, due_date: '' }));
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return 'Pick a date (optional)';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Project',
      'Are you sure you want to delete this project? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!projectId || !user) return;
              await projectServices.deleteProject(projectId as string, user.id);
              
              // Emit refresh events after deletion
              if (emitter && typeof (emitter as any).emit === 'function') {
                (emitter as any).emit('refreshProjects');
                (emitter as any).emit('refreshTasks'); // Refresh tasks too
              }
              
              router.back();
            } catch (error: any) {
              console.error('Error deleting project:', error);
              Alert.alert('Error', error.message || 'Failed to delete project');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#4CAF50'; // Green
      case 'on-going': return '#FF9800'; // Orange
      case 'paused': return '#F44336'; // Gray
      default: return '#9E9E9E';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return '#F44336'; // Red
      case 'high': return '#FF5722'; // Deep Orange
      case 'medium': return '#FF9800'; // Orange
      case 'low': return '#4CAF50'; // Green
      default: return '#9E9E9E';
    }
  };

  if (loading) {
    return (
      <Modal animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Edit Project</Text>
            <View style={styles.saveButton} />
          </View>
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.text }]}>Loading project...</Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Edit Project</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
            <Text style={[styles.saveText, { color: saving ? colors.secondaryText : colors.tint }]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Project Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Project name</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Project name"
              placeholderTextColor={colors.secondaryText}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Optional description"
              placeholderTextColor={colors.secondaryText}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Status */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Status</Text>
            <View style={styles.optionsContainer}>
              {STATUS_OPTIONS.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.optionButton,
                    { 
                      backgroundColor: formData.status === status ? getStatusColor(status) : 'transparent',
                      borderColor: formData.status === status ? getStatusColor(status) : colors.border
                    }
                  ]}
                  onPress={() => handleStatusChange(status)} // Updated to use new function
                >
                  <Text style={[
                    styles.optionText,
                    { color: formData.status === status ? '#fff' : colors.text }
                  ]}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Priority */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Priority</Text>
            <View style={styles.optionsContainer}>
              {PRIORITY_OPTIONS.map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.optionButton,
                    { 
                      backgroundColor: formData.priority === priority ? getPriorityColor(priority) : 'transparent',
                      borderColor: formData.priority === priority ? getPriorityColor(priority) : colors.border
                    }
                  ]}
                  onPress={() => handlePriorityChange(priority)} // Updated to use new function
                >
                  <Text style={[
                    styles.optionText,
                    { color: formData.priority === priority ? '#fff' : colors.text }
                  ]}>
                    {priority}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Due Date */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Due date</Text>
            
            <TouchableOpacity 
              style={[styles.dateInput, { 
                backgroundColor: colors.card,
                borderColor: colors.border 
              }]}
              onPress={showDatepicker}
            >
              <Text style={[
                styles.dateInputText, 
                { color: formData.due_date ? colors.text : colors.secondaryText }
              ]}>
                {formatDisplayDate(formData.due_date)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={colors.secondaryText} />
            </TouchableOpacity>

            {formData.due_date ? (
              <TouchableOpacity onPress={clearDate} style={styles.clearDateButton}>
                <Text style={[styles.clearDateText, { color: colors.error }]}>
                  Clear date
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.hint, { color: colors.secondaryText }]}>
                Tap to select a date
              </Text>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()} // Prevent past dates
                style={styles.datePicker}
              />
            )}
          </View>

          {/* Delete Button */}
          <TouchableOpacity 
            style={[styles.deleteButton, { backgroundColor: colors.error + '20' }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
            <Text style={[styles.deleteButtonText, { color: colors.error }]}>
              Delete Project
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    padding: 8,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 80,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInputText: {
    fontSize: 16,
  },
  clearDateButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    padding: 8,
  },
  clearDateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    flex: 1,
    minWidth: 100,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
  },
  datePicker: {
    marginTop: 10,
  },
});