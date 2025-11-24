// app/modals/AddProjectModal.tsx
import { useAuth } from '@/.vscode/screens/AuthContext';
import { projectServices } from '@/app/services/projectservice'; // adjust if your import path differs
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// native datetime picker
import DateTimePicker, { Event as DateTimeEvent } from '@react-native-community/datetimepicker';

export default function AddProjectModal() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDateISO, setDueDateISO] = useState<string | null>(null); // ISO string or null
  const [loading, setLoading] = useState(false);

  // status + color
  const [status, setStatus] = useState<'On-going' | 'Paused'>('On-going');
  const statusToColor = (s: string) => {
    if (s?.toLowerCase() === 'on-going' || s?.toLowerCase() === 'ongoing') return '#FF9800'; // blue
    if (s?.toLowerCase() === 'paused') return '#F44336'; // orange
    return '#2F80ED';
  };

  // priority state - ADDED
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');

  // date picker UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickedDate, setPickedDate] = useState<Date | null>(null);

  const onChangeDate = (event: DateTimeEvent, d?: Date) => {
    // On Android the event fires immediately and must be handled carefully
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    const selected = d ?? pickedDate ?? new Date();
    setPickedDate(selected);
    setDueDateISO(selected.toISOString());
    setShowDatePicker(false);
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter a project name.');
      return;
    }
    if (!user?.id) {
      Alert.alert('Error', 'User not signed in.');
      return;
    }

    setLoading(true);
    try {
      await projectServices.createProject({
        name: name.trim(),
        description: description.trim() || null,
        owner_id: user.id,
        status,
        color: statusToColor(status),
        due_date: dueDateISO ?? null,
        priority: priority, // ADDED priority
      });

      // on success go to projects list
      router.replace('/(tabs)/projects');
    } catch (err: any) {
      console.error('createProject error', err);
      Alert.alert('Error', err?.message ?? 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Add Project</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.tint }}>Close</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.secondaryText }]}>Project name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Project name"
          placeholderTextColor={colors.placeholder}
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        />

        <Text style={[styles.label, { color: colors.secondaryText }]}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description"
          placeholderTextColor={colors.placeholder}
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          multiline
        />

        <Text style={[styles.label, { color: colors.secondaryText }]}>Status</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => setStatus('On-going')}
            style={[
              styles.statusButton,
              { backgroundColor: status === 'On-going' ? statusToColor('On-going') : '#2F80ED' },
            ]}
          >
            <Text style={{ color: status === 'On-going' ? '#fff' : colors.text }}>On-going</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setStatus('Paused')}
            style={[
              styles.statusButton,
              { backgroundColor: status === 'Paused' ? statusToColor('Paused') : '#F44336' },
            ]}
          >
            <Text style={{ color: status === 'Paused' ? '#fff' : colors.text }}>Paused</Text>
          </TouchableOpacity>
        </View>

        {/* ADDED Priority Selection */}
        <Text style={[styles.label, { color: colors.secondaryText }]}>Priority</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => setPriority('Low')}
            style={[
              styles.priorityButton,
              { backgroundColor: priority === 'Low' ? '#4CAF50' : colors.card },
            ]}
          >
            <Text style={{ color: priority === 'Low' ? '#fff' : colors.text }}>Low</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPriority('Medium')}
            style={[
              styles.priorityButton,
              { backgroundColor: priority === 'Medium' ? '#FF9800' : colors.card },
            ]}
          >
            <Text style={{ color: priority === 'Medium' ? '#fff' : colors.text }}>Medium</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPriority('High')}
            style={[
              styles.priorityButton,
              { backgroundColor: priority === 'High' ? '#FF5722 ' : colors.card },
            ]}
          >
            <Text style={{ color: priority === 'High' ? '#fff' : colors.text }}>High</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPriority('Urgent')}
            style={[
              styles.priorityButton,
              { backgroundColor: priority === 'Urgent' ? '#F44336' : colors.card },
            ]}
          >
            <Text style={{ color: priority === 'Urgent' ? '#fff' : colors.text }}>Urgent</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: colors.secondaryText }]}>Due date</Text>
          <View style={{ marginBottom: 12 }}>
            <TouchableOpacity onPress={openDatePicker} style={[styles.dateButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ color: colors.text }}>{pickedDate ? pickedDate.toDateString() : 'Pick a date (optional)'}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={pickedDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={onChangeDate}
                minimumDate={new Date()} // This prevents selecting dates before today
              />
            )}
          </View>

        <TouchableOpacity style={[styles.button, { backgroundColor: colors.tint }]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Project</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  form: { padding: 20 },
  label: { fontSize: 13, marginBottom: 6 },
  input: { height: 44, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, marginBottom: 12 },
  dateButton: { height: 44, borderRadius: 10, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1 },
  statusButton: { height: 40, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },
  priorityButton: { // ADDED
    flex: 1,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  button: { height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: '700' },
});