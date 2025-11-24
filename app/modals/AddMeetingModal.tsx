// app/(tabs)/meetings.tsx
import { useAuth } from '@/.vscode/screens/AuthContext';
import { meetingService } from '@/app/services/meetingservice';
import { emitter } from '@/app/utils/refreshEmitter';
import DrawerNavigator from '@/components/DrawerNavigator';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function MeetingsAddScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const router = useRouter();

  // form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null);
  const [durationMin, setDurationMin] = useState<number>(0);
  const [status, setStatus] = useState<'Ongoing' | 'Paused'>('Ongoing');
  const [saving, setSaving] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

const createForCurrentUser = async () => {
  if (!user?.id) { Alert.alert('Not signed in'); return; }
  if (!title.trim()) { Alert.alert('Validation', 'Title is required'); return; }
  if (!meetingUrl.trim()) { Alert.alert('Validation', 'Meeting URL is required'); return; }

  // Enhanced URL validation
  const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
  if (!urlRegex.test(meetingUrl.trim())) {
    Alert.alert('Validation', 'Please enter a valid URL (e.g., https://zoom.us/j/123456)');
    return;
  }

  setSaving(true);
  try {
    await meetingService.createMeetingForCurrentUser({
      title: title.trim(),
      description: description.trim() || null,
      meeting_url: meetingUrl.trim(),
      scheduled_for: scheduledFor ? scheduledFor.toISOString() : null,
      duration_min: Number(durationMin) || 0,
      status: status,
    });
    Alert.alert('Success', 'Meeting created successfully!');
    
    // Refresh the dashboard to update total meetings count
    try { emitter?.emit?.('refreshDashboard'); } catch (e) {}
    
    // clear form
    setTitle(''); 
    setDescription(''); 
    setMeetingUrl(''); 
    setScheduledFor(null); 
    setDurationMin(0);
    setStatus('Ongoing');
    
    // Navigate back to meetings list screen
    router.push('/(tabs)/meetings');
    
  } catch (err: any) {
    console.error(err);
    Alert.alert('Error', err?.message ?? 'Failed to create meeting');
  } finally {
    setSaving(false);
  }
};

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // If we already have a time, combine with new date
      if (scheduledFor) {
        const newDateTime = new Date(selectedDate);
        newDateTime.setHours(scheduledFor.getHours());
        newDateTime.setMinutes(scheduledFor.getMinutes());
        setScheduledFor(newDateTime);
      } else {
        setScheduledFor(selectedDate);
      }
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      // If we already have a date, combine with new time
      if (scheduledFor) {
        const newDateTime = new Date(scheduledFor);
        newDateTime.setHours(selectedTime.getHours());
        newDateTime.setMinutes(selectedTime.getMinutes());
        setScheduledFor(newDateTime);
      } else {
        // If no date selected, use today with selected time
        const today = new Date();
        today.setHours(selectedTime.getHours());
        today.setMinutes(selectedTime.getMinutes());
        setScheduledFor(today);
      }
    }
  };

  const formatDateTime = (date: Date | null) => {
    if (!date) return 'Not scheduled';
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMinDate = () => {
    return new Date(); // Today - can't select past dates
  };

  const handleClose = () => {
    router.back(); // Go back to previous screen
  };

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: colors.background }]}>
      {/* Header with Add New Meeting on left and Close on right */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Add New Meeting</Text>
                <TouchableOpacity onPress={() => router.back()}>
                  <Text style={{ color: colors.tint }}>Close</Text>
                </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {/* Title */}
          <Text style={[styles.label, { color: colors.secondaryText }]}>Title *</Text>
          <View style={[styles.inputWrap, { borderColor: colors.border }]}>
            <TextInput 
              value={title} 
              onChangeText={setTitle} 
              placeholder="Enter meeting title" 
              placeholderTextColor={colors.placeholder} 
              style={[styles.input, { color: colors.text }]} 
            />
          </View>

          {/* Meeting URL */}
          <Text style={[styles.label, { color: colors.secondaryText }]}>Meeting URL *</Text>
          <View style={[styles.inputWrap, { borderColor: colors.border }]}>
            <TextInput 
              value={meetingUrl} 
              onChangeText={setMeetingUrl} 
              placeholder="https://zoom.us/j/123456" 
              autoCapitalize="none"
              keyboardType="url"
              placeholderTextColor={colors.placeholder} 
              style={[styles.input, { color: colors.text }]} 
            />
          </View>

          {/* Description */}
          <Text style={[styles.label, { color: colors.secondaryText }]}>Description</Text>
          <View style={[styles.inputWrap, { borderColor: colors.border }]}>
            <TextInput 
              value={description} 
              onChangeText={setDescription} 
              placeholder="Optional meeting description" 
              placeholderTextColor={colors.placeholder} 
              multiline 
              numberOfLines={4}
              style={[styles.textArea, { color: colors.text }]} 
            />
          </View>

          {/* Schedule Section */}
          <Text style={[styles.label, { color: colors.secondaryText }]}>Schedule</Text>
          <View style={styles.scheduleSection}>
            <TouchableOpacity 
              style={[styles.dateTimeButton, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.text} />
              <Text style={[styles.dateTimeText, { color: colors.text }]}>
                {scheduledFor ? scheduledFor.toLocaleDateString() : 'Select Date'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.dateTimeButton, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color={colors.text} />
              <Text style={[styles.dateTimeText, { color: colors.text }]}>
                {scheduledFor ? scheduledFor.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Select Time'}
              </Text>
            </TouchableOpacity>
          </View>

          {scheduledFor && (
            <Text style={[styles.selectedDateTime, { color: colors.tint }]}>
              Scheduled for: {formatDateTime(scheduledFor)}
            </Text>
          )}

          {/* Duration */}
          <Text style={[styles.label, { color: colors.secondaryText }]}>Duration (minutes) *</Text>
          <View style={[styles.inputWrap, { borderColor: colors.border }]}>
            <TextInput 
              value={String(durationMin)} 
              keyboardType="number-pad" 
              onChangeText={(v) => setDurationMin(Number(v) || 0)} 
              placeholder="0"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, { color: colors.text }]} 
            />
          </View>

          {/* Status */}
          <Text style={[styles.label, { color: colors.secondaryText }]}>Status</Text>
          <View style={styles.statusContainer}>
            <TouchableOpacity 
              style={[
                styles.statusButton, 
                { 
                  backgroundColor: status === 'Ongoing' ? '#2196F3' : 'transparent',
                  borderColor: status === 'Ongoing' ? '#2196F3' : colors.border
                }
              ]}
              onPress={() => setStatus('Ongoing')}
            >
              <Ionicons 
                name="time-outline" 
                size={16} 
                color={status === 'Ongoing' ? '#fff' : colors.text} 
              />
              <Text style={[styles.statusText, { color: status === 'Ongoing' ? '#fff' : colors.text }]}>
                Ongoing
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.statusButton, 
                { 
                  backgroundColor: status === 'Paused' ? '#F44336' : 'transparent',
                  borderColor: status === 'Paused' ? '#F44336' : colors.border
                }
              ]}
              onPress={() => setStatus('Paused')}
            >
              <Ionicons 
                name="pause-circle-outline" 
                size={16} 
                color={status === 'Paused' ? '#fff' : colors.text} 
              />
              <Text style={[styles.statusText, { color: status === 'Paused' ? '#fff' : colors.text }]}>
                Paused
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              onPress={() => { 
                setTitle(''); 
                setDescription(''); 
                setMeetingUrl(''); 
                setScheduledFor(null); 
                setDurationMin(0);
                setStatus('Ongoing');
              }} 
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="close-outline" size={18} color={colors.secondaryText} />
              <Text style={[styles.cancelText, { color: colors.secondaryText }]}>Clear All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={createForCurrentUser} 
              style={[styles.saveBtn, { backgroundColor: '#FF6B35', opacity: saving ? 0.6 : 1 }]} 
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-outline" size={18} color="#fff" />
                  <Text style={styles.saveText}>Save Meeting</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Date Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={scheduledFor || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={getMinDate()}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={scheduledFor || new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
        />
      )}

      <DrawerNavigator isVisible={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} currentScreen="meetings" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { 
    flex: 1 
  },
  header: { 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700',
    flex: 1,
    textAlign: 'left'
  },
  closeButton: {
    padding: 4,
    marginLeft: 'auto'
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20, // Extra padding at bottom for better scrolling
  },
  card: { 
    margin: 16, 
    borderRadius: 16, 
    padding: 20, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 12, 
    elevation: 4 
  },
  label: { 
    fontSize: 14, 
    fontWeight: '600',
    marginBottom: 8 
  },
  inputWrap: { 
    borderWidth: 1, 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    marginBottom: 20 
  },
  input: { 
    fontSize: 16,
    padding: 0
  },
  textArea: { 
    fontSize: 15,
    textAlignVertical: 'top',
    minHeight: 80
  },
  
  // Schedule Section
  scheduleSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: '500'
  },
  selectedDateTime: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 20,
    textAlign: 'center'
  },

  // Status
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600'
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600'
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12
  },
  saveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  }
});