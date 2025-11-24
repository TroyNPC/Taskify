// app/(tabs)/calendar.tsx
import { useAuth } from '@/.vscode/screens/AuthContext';
import { projectServices } from '@/app/services/projectservice';
import { taskServices } from '@/app/services/taskservice';
import DrawerNavigator from '@/components/DrawerNavigator';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';



interface CalendarItem {
  id: string;
  title: string;
  type: 'project' | 'task';
  due_date: string;
  status: string;
  completed_at?: string | null;
  project_name?: string | null;
  description?: string;
  priority?: string;
}

interface ProjectCard {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  due_date?: string | null;
  priority?: string | null;
}

export default function CalendarScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  const [items, setItems] = useState<CalendarItem[]>([]);
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadCalendarItems();
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

    useFocusEffect(
    React.useCallback(() => {
      if (user) {
           loadCalendarItems();
           loadProjects();
      }
    }, [user])
  );
  
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

  const loadCalendarItems = async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [projectsRes, tasks] = await Promise.all([
        projectServices.getProjectsByOwner(user.id),
        taskServices.getTasks(user.id),
      ]);

      console.log('[calendar] raw projects:', projectsRes?.length);
      console.log('[calendar] raw tasks:', tasks?.length);

      // build map project id -> name
      const projectMap: Record<string, string> = {};
      (projectsRes || []).forEach((p: any) => {
        if (p && p.id) projectMap[String(p.id)] = p.name ?? '';
      });

      const merged: CalendarItem[] = [
        ...(projectsRes || []).map((project: any) => ({
          id: String(project.id),
          title: project.name,
          type: 'project' as const,
          due_date: project.due_date,
          status: project.status || 'not_started',
          completed_at: project.completed_at ?? null,
          project_name: null,
          description: project.description || '',
          priority: project.priority || 'medium',
        })),
        ...(tasks || []).map((task: any) => ({
          id: String(task.id),
          title: task.title,
          type: 'task' as const,
          due_date: task.due_date,
          status: task.status || 'not_started',
          completed_at: task.completed_at ?? null,
          project_name: task.project_id ? projectMap[String(task.project_id)] ?? null : null,
          description: task.description || '',
          priority: task.priority || 'medium',
        })),
      ]
        .filter((it) => {
          // keep items that either have a parsable due_date OR keep them anyway (we want All lists too).
          // For the calendar highlights and due lists we rely on parseDateToISODate when needed.
          return true;
        });

      console.log('[calendar] final merged items:', merged.length);
      console.log('[calendar] items sample:', merged.slice(0, 10));

      setItems(merged);
    } catch (error) {
      console.error('Error loading calendar items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    if (!user) {
      setProjects([]);
      return;
    }

    try {
      const projectsData = await projectServices.getProjectsByOwner(user.id);
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
    }
  };

  // Improved function to check if item is incomplete - still used for calendar dot highlights
// Improved function to check if item is incomplete - FIXED STATUS CHECKING
const isItemIncomplete = (item: CalendarItem): boolean => {
  // If it has a completed_at date, it's complete
  if (item.completed_at) return false;
  
  // Check status - handle both lowercase and mixed case, and different formats
  const status = item.status?.toLowerCase().trim();
  
  // Consider these statuses as incomplete (handle both "on-going" and "on_going")
  const incompleteStatuses = [
    'not_started',
    'in_progress',
    'on_going',
    'on-going', // ADD THIS LINE to handle hyphen format
    'on_hold',
    'on_paused',
    'paused',
    'pending'
  ];
  
  // If status is 'completed', it's complete regardless of completed_at
  if (status === 'completed') return false;
  
  // If status is in incomplete list or not specified, it's incomplete
  return incompleteStatuses.includes(status) || !status;
};

  // returns true if there's at least one incomplete item due that day (for dot highlight)
    // returns true if there's at least one incomplete item due that day (for dot highlight)
// returns true if there's at least one incomplete item due that day (for dot highlight)
  const hasIncompleteActivities = (date: Date) => {
    const dayKey = date.toISOString().slice(0, 10);
    const hasIncomplete = items.some((item) => {
      const itemKey = parseDateToISODate(item.due_date);
      if (!itemKey) return false;
      const isIncomplete = itemKey === dayKey && isItemIncomplete(item);
      

      if (itemKey === dayKey) {
        console.log(`[calendar] ${item.title} - completed_at: ${item.completed_at}, status: ${item.status}, isIncomplete: ${isIncomplete}`);
      }
      
      return isIncomplete;
    });
    
    console.log(`[calendar] Date ${dayKey} has incomplete activities: ${hasIncomplete}`);
    return hasIncomplete;
  };

  // Get items for the selected date — NOW INCLUDE completed items as well (per your request)
// Get items for the selected date — NOW INCLUDE completed items as well (per your request)
const getItemsForDate = (date: Date) => {
  const dayKey = date.toISOString().slice(0, 10);
  return items.filter((item) => {
    const itemKey = parseDateToISODate(item.due_date);
    if (!itemKey) return false;
    return itemKey === dayKey; // include both completed and incomplete
  });
};

  const todayItems = getItemsForDate(currentDate);

  // Derived lists for All/Due sections
  const allTasks = items.filter((i) => i.type === 'task');
  const dueTasks = items.filter((i) => i.type === 'task' && !!parseDateToISODate(i.due_date));
  const dueProjects = items.filter((i) => i.type === 'project' && !!parseDateToISODate(i.due_date));

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const days: (Date | null)[] = [];
    const startingDay = firstDay.getDay();
    const adjustedStartingDay = startingDay === 0 ? 6 : startingDay - 1;

    for (let i = 0; i < adjustedStartingDay; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(new Date(year, month, day));
    return days;
  };

  const calendarDays = generateCalendarDays();

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'task':
        return 'checkmark-circle-outline';
      case 'project':
        return 'folder-outline';
      default:
        return 'help-outline';
    }
  };

  const getStatusBg = (status: string) => {
    if (!status) return 'transparent';
    switch (status?.toLowerCase()) {
      case 'on-going':
      case 'in_progress':
        return '#FF9800';
      case 'completed':
        return '#4CAF50';
      case 'paused':
      case 'on_paused':
      case 'on_hold':
        return '#F44336';
      case 'not_started':
        return '#F44336';
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
        return '#FF5722';
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.success;
      default:
        return '#F44336';
    }
  };

  const selectYear = (year: number) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(year);
    setCurrentDate(newDate);
    setShowDatePicker(false);
  };

  const selectMonth = (month: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(month);
    setCurrentDate(newDate);
    setShowDatePicker(false);
  };

  const selectDay = (day: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(day);
    setCurrentDate(newDate);
    setShowDatePicker(false);
  };

  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 10; i <= currentYear + 10; i++) {
      years.push(i);
    }
    return years;
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.statusBar}>
        <Text style={[styles.time, { color: colors.text }]}>9:41</Text>
      </View>

      <View style={styles.header}>
        <View style={styles.leftHeader}>
          <TouchableOpacity onPress={() => setIsDrawerOpen(true)} style={styles.menuButton}>
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Calendar</Text>
        </View>
        <View />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.calendarContainer, { backgroundColor: colors.card }]}>
          <View style={styles.monthNavigation}>
            <TouchableOpacity onPress={() => navigateMonth('prev')}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.monthSelector}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.monthText, { color: colors.text }]}>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigateMonth('next')}>
              <Ionicons name="chevron-forward" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekDays}>
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
              <Text key={d} style={[styles.weekDayText, { color: colors.secondaryText }]}>{d}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((date, index) => {
              const isToday = date && date.toDateString() === currentDate.toDateString();
              const hasHighlight = date ? hasIncompleteActivities(date) : false;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.calendarDay,
                    isToday && { backgroundColor: colors.tint },
                    hasHighlight && styles.highlightedDay,
                  ]}
                  onPress={() => date && setCurrentDate(date)}
                  disabled={!date}
                >
                  {date && (
                    <>
                      <Text style={[
                        styles.calendarDayText,
                        { 
                          color: isToday ? '#fff' : colors.text, 
                          fontWeight: isToday ? 'bold' : '500' 
                        },
                        hasHighlight && styles.highlightedDayText,
                      ]}>
                        {date.getDate()}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Due Items Section (all items for selected date, including completed) */}
        <View style={styles.itemsSection}>
          <Text style={[styles.itemsTitle, { color: colors.text }]}> 
            Due on {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>

          {loading ? (
            <View style={{ paddingVertical: 20 }}><ActivityIndicator /></View>
          ) : todayItems.length > 0 ? (
            todayItems.map((item) => (
              <View key={item.id} style={[styles.itemCard, { backgroundColor: colors.card }]}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemTitleSection}>
                    <Ionicons name={getItemIcon(item.type)} size={20} color={colors.text} />
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                  </View>
                </View>

                {item.description ? (
                  <Text style={[styles.itemDescription, { color: colors.secondaryText }]}>{item.description}</Text>
                ) : null}

                <View style={styles.statusPrioritySection}>
                  <View style={styles.statusPriorityItem}>
                    <Text style={[styles.statusPriorityLabel, { color: colors.secondaryText }]}>Status</Text>
                    <View style={styles.statusPriorityValues}>
                      <View style={[styles.pill, { backgroundColor: getStatusBg(item.status) }]}>
                        <Text style={[styles.pillText, { color: '#fff' }]}>{item.status || 'None'}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.statusPriorityItem}>
                    <Text style={[styles.statusPriorityLabel, { color: colors.secondaryText }]}>Priority</Text>
                    <View style={styles.statusPriorityValues}>
                      <View style={[styles.pill, { backgroundColor: getPriorityBg(item.priority) }]}>
                        <Text style={[styles.pillText, { color: '#fff' }]}>{item.priority || 'None'}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {item.type === 'task' && item.project_name ? (
                  <View style={styles.projectSection}>
                    <Ionicons name="folder-outline" size={14} color={colors.secondaryText} />
                    <Text style={[styles.projectText, { color: colors.secondaryText }]}>{item.project_name}</Text>
                  </View>
                ) : null}

                <View style={styles.typeSection}><Text style={[styles.typeText, { color: colors.secondaryText }]}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text></View>
              </View>
            ))
          ) : (
            <View style={styles.emptyItems}>
              <Ionicons name="calendar-outline" size={48} color={colors.secondaryText} />
              <Text style={[styles.emptyItemsText, { color: colors.secondaryText }]}>No due items for this date</Text>
            </View>
          )}
        </View>  
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.dateScrollView}>
              {/* Year Selection */}
              <View style={styles.dateSection}>
                <Text style={[styles.dateSectionTitle, { color: colors.text }]}>Year</Text>
                <View style={styles.dateGrid}>
                  {generateYears().map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.dateItem,
                        currentDate.getFullYear() === year && styles.selectedDateItem
                      ]}
                      onPress={() => selectYear(year)}
                    >
                      <Text style={[
                        styles.dateItemText,
                        { color: colors.text },
                        currentDate.getFullYear() === year && styles.selectedDateItemText
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Month Selection */}
              <View style={styles.dateSection}>
                <Text style={[styles.dateSectionTitle, { color: colors.text }]}>Month</Text>
                <View style={styles.dateGrid}>
                  {months.map((month, index) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.dateItem,
                        currentDate.getMonth() === index && styles.selectedDateItem
                      ]}
                      onPress={() => selectMonth(index)}
                    >
                      <Text style={[
                        styles.dateItemText,
                        { color: colors.text },
                        currentDate.getMonth() === index && styles.selectedDateItemText
                      ]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Day Selection */}
              <View style={styles.dateSection}>
                <Text style={[styles.dateSectionTitle, { color: colors.text }]}>Day</Text>
                <View style={styles.dateGrid}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dateItem,
                        currentDate.getDate() === day && styles.selectedDateItem
                      ]}
                      onPress={() => selectDay(day)}
                    >
                      <Text style={[
                        styles.dateItemText,
                        { color: colors.text },
                        currentDate.getDate() === day && styles.selectedDateItemText
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <DrawerNavigator isVisible={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} currentScreen="calendar" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusBar: { width: '100%', paddingTop: 50, paddingHorizontal: 30, alignItems: 'center' },
  time: { fontSize: 17, fontWeight: '600' },
  header: { paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  leftHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuButton: { padding: 4 },
  title: { fontSize: 28, fontWeight: '700' },
  content: { flex: 1, paddingHorizontal: 20 },
  calendarContainer: { borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  monthNavigation: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  monthSelector: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthText: { fontSize: 18, fontWeight: '600' },
  weekDays: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  weekDayText: { fontSize: 14, fontWeight: '600', textAlign: 'center', width: 40 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  calendarDay: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginVertical: 2, position: 'relative' },
  calendarDayText: { fontSize: 16 },
  highlightedDay: { backgroundColor: '#FF6B35' },
  highlightedDayText: { color: '#fff', fontWeight: 'bold' },
  itemsSection: { marginBottom: 20 },
  itemsTitle: { fontSize: 20, fontWeight: '600', marginBottom: 15 },
  projectsSection: { marginBottom: 20 },
  projectsTitle: { fontSize: 20, fontWeight: '600', marginBottom: 15 },
  itemCard: { padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6 },
  projectCard: { padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  itemTitleSection: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  itemTitle: { fontSize: 18, fontWeight: '600', flex: 1 },
  itemDescription: { fontSize: 14, lineHeight: 20, marginBottom: 15 },
  projectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  projectTitleSection: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  projectName: { fontSize: 18, fontWeight: '600', flex: 1 },
  projectDescription: { fontSize: 14, lineHeight: 20, marginBottom: 15 },
  statusPrioritySection: { marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPriorityItem: { flex: 1, marginRight: 12 },
  statusPriorityLabel: { fontSize: 12, fontWeight: '500', marginBottom: 6 },
  statusPriorityValues: { flexDirection: 'row', alignItems: 'center' },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, minHeight: 36, justifyContent: 'center', alignItems: 'center' },
  pillText: { fontSize: 14, fontWeight: '600' },
  projectSection: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  projectText: { fontSize: 12, fontWeight: '500' },
  dueDateSection: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  dueDateText: { fontSize: 12, fontWeight: '500' },
  typeSection: { marginTop: 8 },
  typeText: { fontSize: 12, fontWeight: '500', fontStyle: 'italic' },
  emptyItems: { alignItems: 'center', paddingVertical: 40 },
  emptyItemsText: { fontSize: 16, marginTop: 8 },
  emptyProjects: { alignItems: 'center', paddingVertical: 40 },
  emptyProjectsText: { fontSize: 16, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxHeight: '80%', borderRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '600' },
  dateScrollView: { maxHeight: 400 },
  dateSection: { marginBottom: 20 },
  dateSectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  dateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)', minWidth: 60, alignItems: 'center' },
  selectedDateItem: { backgroundColor: '#FF6B35' },
  dateItemText: { fontSize: 14, fontWeight: '500' },
  selectedDateItemText: { color: '#fff', fontWeight: '600' },
});
