// app/services/projectService.ts
import { supabase } from '@/.vscode/supabase';
// Emit a refresh event so the dashboard (explore.tsx) can react to deletions.
// Make sure you have an emitter exported from '@/app/utils/refreshEmitter'.
import { emitter } from '@/app/utils/refreshEmitter';

export type ProjectRow = {
  id: string;
  name: string;
  description?: string | null;
  owner_id?: string | null; // auth.users.id
  status?: string | null;
  color?: string | null;
  due_date?: string | null;
  priority?: string | null; // Added priority
  created_at?: string | null;
  updated_at?: string | null;
};

export const projectServices = {
  async getProjectsByOwner(ownerId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async getProjectById(id: string, ownerId?: string) {
    let query = supabase.from('projects').select('*').eq('id', id).limit(1).single();
    if (ownerId) query = supabase.from('projects').select('*').eq('id', id).eq('owner_id', ownerId).limit(1).single();
    const { data, error } = await query;
    if (error) throw error;
    return data ?? null;
  },

  async createProject(payload: {
    name: string;
    description?: string;
    owner_id: string; // required, the current user id
    status?: string;
    color?: string;
    due_date?: string;
    priority?: string; // Added priority
  }) {
    // Note: workspace_id has been intentionally removed per your request.
    const body: Partial<ProjectRow> = {
      name: payload.name,
      description: payload.description ?? null,
      owner_id: payload.owner_id,
      status: payload.status ?? null,
      color: payload.color ?? null,
      due_date: payload.due_date ?? null,
      priority: payload.priority ?? null, // Added priority
    };

    const { data, error } = await supabase.from('projects').insert([body]).select().single();
    if (error) throw error;
    return data;
  },

  async updateProject(id: string, ownerId: string, patch: Partial<ProjectRow>) {
    const { data, error } = await supabase
      .from('projects')
      .update(patch)
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteProject(id: string, ownerId: string) {
    const { error } = await supabase.from('projects').delete().eq('id', id).eq('owner_id', ownerId);
    if (error) throw error;

    // notify listeners so UI (dashboard) can refresh live
    try {
      // guard in case emitter isn't defined or doesn't have emit
      if (emitter && typeof (emitter as any).emit === 'function') {
        (emitter as any).emit('refreshDashboard');
      }
    } catch (e) {
      // swallow emitter errors — deletion already succeeded
      console.warn('refresh emit failed', e);
    }

    return true;
  }
};