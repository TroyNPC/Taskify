// app/(tabs)/meetings.tsx
import { useAuth } from '@/.vscode/screens/AuthContext';
import { meetingService, type MeetingWithCreator } from '@/app/services/meetingservice';
import DrawerNavigator from '@/components/DrawerNavigator';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function MeetingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  const [meetings, setMeetings] = useState<MeetingWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user) loadMeetings();
    }, [user])
  );

  useEffect(() => {
    if (user) loadMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadMeetings = async () => {
    if (!user) {
      setMeetings([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await meetingService.getMyMeetings();
      setMeetings(data ?? []);
    } catch (err) {
      console.error('loadMeetings error', err);
      Alert.alert('Error', 'Failed to load meetings');
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'No date';
    const d = new Date(dateString);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const providerBadge = (url?: string | null) => {
    if (!url) return { label: 'Link', icon: 'link-outline' };
    const u = url.toLowerCase();
    if (u.includes('zoom.us') || u.includes('zoom.com')) return { label: 'Zoom', icon: 'videocam-outline' };
    if (u.includes('meet.google') || u.includes('google.com')) return { label: 'Google', icon: 'logo-google' };
    if (u.includes('teams.microsoft') || u.includes('office.com') || u.includes('microsoft')) return { label: 'Teams', icon: 'logo-windows' };
    if (u.includes('webex') || u.includes('cisco')) return { label: 'Webex', icon: 'server-outline' };
    if (u.includes('jitsi') || u.includes('whereby') || u.includes('appear.in')) return { label: 'Meeting', icon: 'people-outline' };
    return { label: 'Link', icon: 'link-outline' };
  };

  const openOrCopy = async (url?: string | null) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Link', 'Cannot open link on this device. Copy it manually:\n' + url);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open link');
    }
  };

  const getStatusColor = (status?: string | null) => {
    switch (status?.toLowerCase()) {
      case 'done': return '#4CAF50';
      case 'canceled': return '#F44336';
      case 'paused': return '#FF9800';
      case 'scheduled': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  // Toggle completed/done state for a meeting (updates status)
  const onToggleDone = async (meetingId: string, currentStatus?: string | null) => {
    try {
      const current = (currentStatus ?? '').toLowerCase();
      let newStatus: string;
      
      if (current === 'done') {
        newStatus = 'scheduled';
      } else if (current === 'canceled') {
        newStatus = 'scheduled';
      } else {
        newStatus = 'done';
      }
      
      await meetingService.updateMeeting(meetingId, { status: newStatus });
      await loadMeetings();
    } catch (err: any) {
      console.error('toggle meeting status error', err);
      Alert.alert('Error', err?.message ?? 'Failed to update meeting status');
    }
  };

  // Add a function to cancel a meeting
  const onCancelMeeting = async (meetingId: string) => {
    Alert.alert(
      'Cancel Meeting',
      'Are you sure you want to cancel this meeting?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await meetingService.updateMeeting(meetingId, { status: 'canceled' });
              await loadMeetings();
            } catch (err: any) {
              console.error('cancel meeting error', err);
              Alert.alert('Error', err?.message ?? 'Failed to cancel meeting');
            }
          },
        },
      ]
    );
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    Alert.alert(
      'Delete Meeting',
      'Are you sure you want to delete this meeting?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await meetingService.deleteMeeting(meetingId);
              await loadMeetings();
            } catch (err: any) {
              console.error('delete meeting error', err);
              Alert.alert('Error', err?.message ?? 'Failed to delete meeting');
            }
          },
        },
      ]
    );
  };

  // counts
  const doneCount = meetings.filter((m) => (m.status || '').toLowerCase() === 'done').length;
  const canceledCount = meetings.filter((m) => (m.status || '').toLowerCase() === 'canceled').length;
  const pendingCount = meetings.filter((m) => {
    const status = (m.status || '').toLowerCase();
    return status !== 'done' && status !== 'canceled';
  }).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsDrawerOpen(true)} style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Meetings</Text>
      </View>

      <View style={[styles.stats, { backgroundColor: colors.card }]}>
        <View style={styles.statItem}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 6, backgroundColor: '#4CAF50' }} />
            <Text style={{ color: colors.secondaryText }}>Done</Text>
          </View>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{doneCount}</Text>
        </View>

        <View style={styles.statItem}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 6, backgroundColor: '#2196F3' }} />
            <Text style={{ color: colors.secondaryText }}>Pending</Text>
          </View>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{pendingCount}</Text>
        </View>

        <View style={styles.statItem}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 6, backgroundColor: '#F44336' }} />
            <Text style={{ color: colors.secondaryText }}>Canceled</Text>
          </View>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{canceledCount}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ paddingVertical: 40 }}><ActivityIndicator /></View>
        ) : meetings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.secondaryText} />
            <Text style={{ color: colors.secondaryText, marginTop: 8 }}>No meetings scheduled</Text>
          </View>
        ) : (
          meetings.map((meeting) => {
            const badge = providerBadge(meeting.meeting_url ?? undefined);
            const isDone = (meeting.status || '').toLowerCase() === 'done';
            const isCanceled = (meeting.status || '').toLowerCase() === 'canceled';
            return (
              <View key={meeting.id} style={[styles.meetingCard, { backgroundColor: colors.card }]}>
                <View style={styles.topSection}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View style={[styles.providerIcon, { backgroundColor: getStatusColor(meeting.status) }]}>
                      <Ionicons name={badge.icon as any} size={18} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.meetingTitle, { color: colors.text }]} numberOfLines={2}>
                        {meeting.title}
                      </Text>
                      {meeting.profiles?.full_name && (
                        <Text style={[styles.creatorName, { color: colors.secondaryText }]}>
                          by {meeting.profiles.full_name}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.topRightSection}>
                    {/* Provider badge moved to top right */}
                    <View style={[styles.badge, { backgroundColor: '#E6F0FF' }]}>
                      <Text style={{ color: '#0B5FFF', fontSize: 12 }}>{badge.label}</Text>
                    </View>

                    {/* Delete button */}
                    <TouchableOpacity onPress={() => handleDeleteMeeting(meeting.id)} style={styles.iconButton}>
                      <Ionicons name="trash-outline" size={18} color={colors.secondaryText} />
                    </TouchableOpacity>
                  </View>
                </View>

                {meeting.description ? (
                  <Text style={[styles.description, { color: colors.secondaryText }]} numberOfLines={2}>
                    {meeting.description}
                  </Text>
                ) : null}

                <View style={styles.statusPriorityContainer}>
                  <View style={styles.statusPriorityItem}>
                    <Text style={[styles.statusPriorityLabel, { color: colors.secondaryText }]}>Status</Text>
                    <View style={[styles.statusPriorityValue, { backgroundColor: getStatusColor(meeting.status) }]}>
                      <Text style={styles.statusPriorityValueText}>
                        {meeting.status ?? 'scheduled'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statusPriorityItem}>
                    <Text style={[styles.statusPriorityLabel, { color: colors.secondaryText }]}>Date</Text>
                    <Text style={{ color: colors.secondaryText }}>{meeting.scheduled_for ? formatDate(meeting.scheduled_for) : 'No date'}</Text>
                  </View>
                </View>

                <View style={styles.meetingBottom}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {meeting.duration_min ? <Text style={{ color: colors.secondaryText }}>{meeting.duration_min} min</Text> : null}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => openOrCopy(meeting.meeting_url)}
                      style={[styles.openBtn, { opacity: meeting.meeting_url ? 1 : 0.5 }]}
                      disabled={!meeting.meeting_url}
                    >
                      <Text style={{ color: '#fff', fontSize: 12 }}>Open</Text>
                    </TouchableOpacity>

                    {/* Cancel button for non-canceled and non-done meetings */}
                    {!isCanceled && !isDone && (
                      <TouchableOpacity
                        onPress={() => onCancelMeeting(meeting.id)}
                        style={[styles.cancelBtn, { backgroundColor: '#F44336' }]}
                      >
                        <Text style={{ color: '#fff', fontSize: 12 }}>Cancel</Text>
                      </TouchableOpacity>
                    )}

                    {/* Completed toggle */}
                    <View style={styles.completeSection}>
                      <Text style={[styles.completeLabel, { color: colors.secondaryText }]}>Complete</Text>
                      <Switch
                        value={isDone}
                        onValueChange={() => onToggleDone(meeting.id, meeting.status)}
                        trackColor={{ false: '#767577', true: getStatusColor('done') }}
                        thumbColor={isDone ? '#fff' : '#f4f3f4'}
                      />
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <DrawerNavigator isVisible={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} currentScreen="meetings" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? 60 : (StatusBar.currentHeight ?? 12) + 12,
  },
  menuButton: { marginRight: 12 },
  title: { fontSize: 24, fontWeight: '700' },

  stats: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: { alignItems: 'center', flex: 1 },

  content: { flex: 1, paddingHorizontal: 20 },

  meetingCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  topRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  providerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  creatorName: {
    fontSize: 12,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 18,
  },

  statusPriorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusPriorityItem: { flex: 1 },
  statusPriorityLabel: { fontSize: 12, fontWeight: '500', marginBottom: 6 },
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

  meetingBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  openBtn: {
    backgroundColor: '#0B5FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },

  iconButton: { padding: 4 },

  // complete toggle area
  completeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
});
