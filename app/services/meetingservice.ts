// app/services/meetingservice.ts
import { supabase } from '@/.vscode/supabase';
import { emitter } from '@/app/utils/refreshEmitter';

export type MeetingRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  created_by: string; // Required - meetings must have a creator
  scheduled_for?: string | null;
  duration_min?: number | null;
  meeting_url?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

// REMOVED MeetingWithCreator type - just use MeetingRow now

export const meetingService = {
  async getMeetings(userId?: string) {
    // If userId provided, fetch meetings created by that user
    // Otherwise, fetch all meetings (adjust based on your RLS policies)
    let query = supabase
      .from('meetings')
      .select('*') // REMOVED profiles join
      .order('scheduled_for', { ascending: true });
    
    if (userId) {
      query = query.eq('created_by', userId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return (data as MeetingRow[]) ?? []; // Changed to MeetingRow
  },

  async getMeeting(id: string) {
    const { data, error } = await supabase
      .from('meetings')
      .select('*') // REMOVED profiles join
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as MeetingRow; // Changed to MeetingRow
  },

  async createMeeting(payload: {
    title?: string | null;
    description?: string | null;
    created_by: string; // Required - must provide user ID
    scheduled_for?: string | null; // ISO date/time
    duration_min?: number | null;
    meeting_url?: string | null;
    status?: string | null;
  }) {
    // Validate that created_by is provided
    if (!payload.created_by) {
      throw new Error('created_by is required');
    }

    const body = {
      title: payload.title ?? null,
      description: payload.description ?? null,
      created_by: payload.created_by,
      scheduled_for: payload.scheduled_for ?? null,
      duration_min: payload.duration_min ?? 60,
      meeting_url: payload.meeting_url ?? null,
      status: payload.status ?? 'scheduled',
    };

    const { data, error } = await supabase
      .from('meetings')
      .insert([body])
      .select('*') // REMOVED profiles join
      .single();
    
    if (error) throw error;
    
    // Notify listeners
    try { emitter?.emit?.('refreshMeetings'); } catch (e) {}
    return data as MeetingRow; // Changed to MeetingRow
  },

  async updateMeeting(id: string, patch: Partial<Omit<MeetingRow, 'id' | 'created_by'>>) {
    // Prevent updating created_by and id
    const { created_by, id: _, ...safePatch } = patch as any;
    
    const { data, error } = await supabase
      .from('meetings')
      .update(safePatch)
      .eq('id', id)
      .select('*') // REMOVED profiles join
      .single();
    
    if (error) throw error;
    
    try { emitter?.emit?.('refreshMeetings'); } catch (e) {}
    return data as MeetingRow; // Changed to MeetingRow
  },

  async deleteMeeting(id: string) {
    const { error } = await supabase.from('meetings').delete().eq('id', id);
    if (error) throw error;
    
    try { emitter?.emit?.('refreshMeetings'); } catch (e) {}
    return true;
  },

  // Helper method to get current user's meetings
  async getMyMeetings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    return this.getMeetings(user.id);
  },

  // Helper method to create meeting for current user
  async createMeetingForCurrentUser(payload: Omit<Parameters<typeof meetingService.createMeeting>[0], 'created_by'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    return this.createMeeting({
      ...payload,
      created_by: user.id
    });
  }
};