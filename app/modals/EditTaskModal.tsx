// app/modals/EditTaskModal.tsx
import { useAuth } from '@/.vscode/screens/AuthContext';
import { TaskRow, taskServices } from '@/app/services/taskservice';
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

const STATUS_OPTIONS = ['not_started', 'in_progress'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

export default function EditTaskModal() {
  const router = useRouter();
  const { taskId } = useLocalSearchParams();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [task, setTask] = useState<TaskRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'not_started',
    priority: 'medium',
    due_date: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // derived: whether the task is completed (has completed_at)
  const isCompleted = !!task?.completed_at;

  useEffect(() => {
    if (taskId && user) {
      loadTask();
    }
  }, [taskId, user]);

  const loadTask = async () => {
    if (!taskId || !user) return;
    
    try {
      setLoading(true);
      // Get all tasks and find the specific one
      const tasksData = await taskServices.getTasks(user.id);
      const taskData = tasksData.find(task => task.id === taskId);
      
      if (taskData) {
        setTask(taskData);
        setFormData({
          title: taskData.title || '',
          description: taskData.description || '',
          status: taskData.status || 'not_started',
          priority: taskData.priority || 'medium',
          due_date: taskData.due_date || '',
        });
        
        // Set the selected date if due_date exists
        if (taskData.due_date) {
          setSelectedDate(new Date(taskData.due_date));
        } else {
          setSelectedDate(new Date());
        }
      }
    } catch (error) {
      console.error('Error loading task:', error);
      Alert.alert('Error', 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!taskId || !user || !formData.title.trim()) {
      Alert.alert('Error', 'Task title is required');
      return;
    }

    try {
      setSaving(true);

      // If the task is completed, only send title + description changes (do not modify status/priority/due_date)
      if (isCompleted) {
        await taskServices.updateTask(taskId as string, user.id, {
          title: formData.title.trim(),
          description: formData.description.trim() || null,
        });
      } else {
        await taskServices.updateTask(taskId as string, user.id, {
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          status: formData.status,
          priority: formData.priority,
          due_date: formData.due_date || null,
        });
      }

      // Emit refresh event (other screens can listen)
      if (emitter && typeof (emitter as any).emit === 'function') {
        (emitter as any).emit('refreshTasks');
        (emitter as any).emit('refreshDashboard');
      }

      router.back();
      
    } catch (error: any) {
      console.error('Error updating task:', error);
      Alert.alert('Error', error.message || 'Failed to update task');
    } finally {
      setSaving(false);
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
    // do not open datepicker when task is completed
    if (isCompleted) return;
    setShowDatePicker(true);
  };

  const clearDate = () => {
    if (isCompleted) return;
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
      'Delete Task',
      'Are you sure you want to delete this task? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!taskId || !user) return;
              await taskServices.deleteTask(taskId as string, user.id);
              // emit refresh so lists update
              if (emitter && typeof (emitter as any).emit === 'function') {
                (emitter as any).emit('refreshTasks');
                (emitter as any).emit('refreshDashboard');
              }
              router.back();
            } catch (error: any) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', error.message || 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'in_progress': return '#FF9800'; // Orange
      case 'not_started': return '#F44336'; // Gray
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

  const formatStatusText = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatPriorityText = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  if (loading) {
    return (
      <Modal animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Edit Task</Text>
            <View style={styles.saveButton} />
          </View>
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.text }]}>Loading task...</Text>
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
          <Text style={[styles.title, { color: colors.text }]}>Edit Task</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
            <Text style={[styles.saveText, { color: saving ? colors.secondaryText : colors.tint }]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Task Title (editable even when completed) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Task title</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Task title"
              placeholderTextColor={colors.secondaryText}
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
            />
          </View>

          {/* Description (editable even when completed) */}
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

          {/* Status  -- DISABLE when completed */}
          <View style={[styles.inputGroup, isCompleted ? { opacity: 0.45 } : undefined]} pointerEvents={isCompleted ? 'none' : 'auto'}>
            <Text style={[styles.label, { color: colors.text }]}>Status</Text>
            <View style={styles.optionsContainer}>
              {STATUS_OPTIONS.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.optionButton,
                    { 
                      backgroundColor: formData.status === status ? getStatusColor(status) : 'transparent',
                      borderColor: formData.status === status ? getStatusColor(status) : colors.border,
                      opacity: isCompleted ? 0.6 : 1
                    }
                  ]}
                  onPress={() => {
                    if (isCompleted) return;
                    setFormData(prev => ({ ...prev, status }));
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    { color: formData.status === status ? '#fff' : colors.text }
                  ]}>
                    {formatStatusText(status)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Priority -- DISABLE when completed */}
          <View style={[styles.inputGroup, isCompleted ? { opacity: 0.45 } : undefined]} pointerEvents={isCompleted ? 'none' : 'auto'}>
            <Text style={[styles.label, { color: colors.text }]}>Priority</Text>
            <View style={styles.optionsContainer}>
              {PRIORITY_OPTIONS.map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.optionButton,
                    { 
                      backgroundColor: formData.priority === priority ? getPriorityColor(priority) : 'transparent',
                      borderColor: formData.priority === priority ? getPriorityColor(priority) : colors.border,
                      opacity: isCompleted ? 0.6 : 1
                    }
                  ]}
                  onPress={() => {
                    if (isCompleted) return;
                    setFormData(prev => ({ ...prev, priority }));
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    { color: formData.priority === priority ? '#fff' : colors.text }
                  ]}>
                    {formatPriorityText(priority)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Due Date -- DISABLE when completed */}
          <View style={[styles.inputGroup, isCompleted ? { opacity: 0.45 } : undefined]} pointerEvents={isCompleted ? 'none' : 'auto'}>
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
              <TouchableOpacity onPress={clearDate} style={styles.clearDateButton} disabled={isCompleted}>
                <Text style={[styles.clearDateText, { color: colors.error }]}>
                  Clear date
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.hint, { color: colors.secondaryText }]}>
                Tap to select a date
              </Text>
            )}

            {showDatePicker && !isCompleted && (
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

          {/* Delete Button - allowed even if completed (if you want to disallow, add isCompleted guard) */}
          <TouchableOpacity 
            style={[styles.deleteButton, { backgroundColor: colors.error + '20' }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
            <Text style={[styles.deleteButtonText, { color: colors.error }]}>
              Delete Task
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
