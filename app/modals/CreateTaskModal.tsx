// app/modals/CreateTaskModal.tsx
import { useAuth } from '@/.vscode/screens/AuthContext';
import { projectServices } from '@/app/services/projectservice';
import { taskServices } from '@/app/services/taskservice';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import DateTimePicker, { Event as DateTimeEvent } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function CreateTaskModal() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [assignedTo, setAssignedTo] = useState<string | undefined>(undefined);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // New states for status, priority, and due_date
  const [status, setStatus] = useState<'not_started' | 'in_progress'>('not_started');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoadingProjects(true);

        if (!user?.id) {
          setProjects([]);
          setProjectId(undefined);
          setAssignedTo(undefined);
          return;
        }

        const list = await projectServices.getProjectsByOwner(user.id);
        const safeList = Array.isArray(list) ? list : [];
        setProjects(safeList);
        // Set projectId to first project if available, otherwise undefined
        if (safeList.length > 0) {
          setProjectId(safeList[0].id);
        } else {
          setProjectId(undefined);
        }
        setAssignedTo(user.id);
      } catch (err) {
        console.error('load projects error', err);
        setProjects([]);
        setProjectId(undefined);
        setAssignedTo(undefined);
      } finally {
        setLoadingProjects(false);
      }
    })();
  }, [user?.id]);

  // Date picker handler
  const onChangeDate = (event: DateTimeEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  // Priority color mapping
  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'low': return '#4CAF50'; // green
      case 'medium': return '#FF9800'; // orange
      case 'high': return '#FF5722'; // deep orange
      case 'urgent': return '#F44336'; // red
      default: return '#FF9800';
    }
  };

  // Status color mapping
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'not_started': return '#9E9E9E'; // gray
      case 'in_progress': return '#FF9800'; // orange
      default: return '#9E9E9E';
    }
  };

  const submit = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Please enter a task title.');
      return;
    }
    if (!user?.id) {
      Alert.alert('Error', 'User not signed in.');
      return;
    }

    // NEW VALIDATION: Check if project is selected
    if (!projectId) {
      Alert.alert('Validation', 'Please select a project first.');
      return;
    }

    setLoading(true);
    try {
      await taskServices.createTask({
        title: title.trim(),
        description: description.trim() || null,
        project_id: projectId,
        assigned_to: assignedTo ?? user.id,
        created_by: user.id,
        status: status,
        priority: priority,
        due_date: dueDate ? dueDate.toISOString() : null,
      });

      router.replace('/(tabs)/tasks');
    } catch (err: any) {
      console.error('createTask error', err);
      Alert.alert('Error', err?.message ?? 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Create Task</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.tint }}>Close</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.secondaryText }]}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Task title"
          placeholderTextColor={colors.placeholder}
        />

        <Text style={[styles.label, { color: colors.secondaryText }]}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Optional"
          placeholderTextColor={colors.placeholder}
          multiline
        />

        <Text style={[styles.label, { color: colors.secondaryText }]}>Project</Text>
        {loadingProjects ? (
          <ActivityIndicator />
        ) : (
          <View style={[styles.input, { padding: 0, overflow: 'hidden' }]}>
            <Picker
              selectedValue={projectId}
              onValueChange={(v) => {
                setProjectId(v === 'undefined' ? undefined : String(v));
              }}
            >
              <Picker.Item label="Select a project" value={undefined} />
              {projects.map((p) => (
                <Picker.Item key={p.id} label={p.name ?? p.title ?? '(Unnamed)'} value={p.id} />
              ))}
            </Picker>
          </View>
        )}

        {/* Show message if no projects exist */}
        {!loadingProjects && projects.length === 0 && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.error }]}>
              No projects found. Please create a project first.
            </Text>
            <TouchableOpacity 
              style={[styles.createProjectButton, { backgroundColor: colors.tint }]}
              onPress={() => router.push('/modals/AddProjectModal')}
            >
              <Text style={styles.createProjectText}>Create Project</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status Selection - BUTTON STYLE */}
        <Text style={[styles.label, { color: colors.secondaryText }]}>Status</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => setStatus('not_started')}
            style={[
              styles.selectionButton,
              { 
                backgroundColor: status === 'not_started' ? getStatusColor('not_started') : 'transparent',
                borderColor: status === 'not_started' ? getStatusColor('not_started') : colors.border
              }
            ]}
          >
            <Text style={{ 
              color: status === 'not_started' ? '#fff' : colors.text,
              fontWeight: '600'
            }}>
              Not Started
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setStatus('in_progress')}
            style={[
              styles.selectionButton,
              { 
                backgroundColor: status === 'in_progress' ? getStatusColor('in_progress') : 'transparent',
                borderColor: status === 'in_progress' ? getStatusColor('in_progress') : colors.border
              }
            ]}
          >
            <Text style={{ 
              color: status === 'in_progress' ? '#fff' : colors.text,
              fontWeight: '600'
            }}>
              In Progress
            </Text>
          </TouchableOpacity>
        </View>

        {/* Priority Selection - BUTTON STYLE */}
        <Text style={[styles.label, { color: colors.secondaryText }]}>Priority</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <TouchableOpacity
            onPress={() => setPriority('low')}
            style={[
              styles.priorityButton,
              { 
                backgroundColor: priority === 'low' ? getPriorityColor('low') : 'transparent',
                borderColor: priority === 'low' ? getPriorityColor('low') : colors.border
              }
            ]}
          >
            <Text style={{ 
              color: priority === 'low' ? '#fff' : colors.text,
              fontWeight: '600'
            }}>
              Low
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPriority('medium')}
            style={[
              styles.priorityButton,
              { 
                backgroundColor: priority === 'medium' ? getPriorityColor('medium') : 'transparent',
                borderColor: priority === 'medium' ? getPriorityColor('medium') : colors.border
              }
            ]}
          >
            <Text style={{ 
              color: priority === 'medium' ? '#fff' : colors.text,
              fontWeight: '600'
            }}>
              Medium
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPriority('high')}
            style={[
              styles.priorityButton,
              { 
                backgroundColor: priority === 'high' ? getPriorityColor('high') : 'transparent',
                borderColor: priority === 'high' ? getPriorityColor('high') : colors.border
              }
            ]}
          >
            <Text style={{ 
              color: priority === 'high' ? '#fff' : colors.text,
              fontWeight: '600'
            }}>
              High
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPriority('urgent')}
            style={[
              styles.priorityButton,
              { 
                backgroundColor: priority === 'urgent' ? getPriorityColor('urgent') : 'transparent',
                borderColor: priority === 'urgent' ? getPriorityColor('urgent') : colors.border
              }
            ]}
          >
            <Text style={{ 
              color: priority === 'urgent' ? '#fff' : colors.text,
              fontWeight: '600'
            }}>
              Urgent
            </Text>
          </TouchableOpacity>
        </View>

        {/* Due Date */}
        <Text style={[styles.label, { color: colors.secondaryText }]}>Due Date (optional)</Text>
        <TouchableOpacity
          onPress={openDatePicker}
          style={[styles.input, { justifyContent: 'center', backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={{ color: dueDate ? colors.text : colors.placeholder }}>
            {dueDate ? dueDate.toLocaleDateString() : 'Pick a date (optional)'}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={dueDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={onChangeDate}
            minimumDate={new Date()}
          />
        )}

        <TouchableOpacity 
          style={[
            styles.button, 
            { backgroundColor: colors.tint },
            (!projectId || projects.length === 0) && { opacity: 0.5 }
          ]} 
          onPress={submit} 
          disabled={loading || !projectId || projects.length === 0}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Task</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  header: { 
    paddingHorizontal: 15, 
    paddingBottom: 12, 
    borderBottomWidth: 1, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  title: { fontSize: 18, fontWeight: '700' },
  form: { padding: 20 },
  label: { fontSize: 13, marginBottom: 6 },
  input: { 
    height: 44, 
    borderRadius: 10, 
    paddingHorizontal: 12, 
    borderWidth: 1, 
    marginBottom: 12 
  },
  selectionButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  priorityButton: {
    flex: 1,
    minWidth: '22%',
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  button: { 
    height: 48, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 10 
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  errorContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  createProjectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createProjectText: {
    color: '#fff',
    fontWeight: '600',
  },
});