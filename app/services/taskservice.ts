// app/services/taskService.ts
import { supabase } from '@/.vscode/supabase';
import { emitter } from '@/app/utils/refreshEmitter'; // <-- added

export type TaskRow = {
  id: string;
  title: string;
  description?: string | null;
  project_id?: string | null;
  assigned_to?: string | null; // user id
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  created_by?: string | null; // owner
  created_at?: string | null;
  updated_at?: string | null;
};

export const taskServices = {
  async getTasks(userId: string) {
    // return tasks created by or assigned to the user (adjust if desired)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getTasksByProject(projectId: string, userId?: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async createTask(payload: {
    title: string;
    description?: string;
    project_id?: string;
    assigned_to?: string | null;
    status?: string;
    priority?: string;
    due_date?: string;
    created_by: string; // required
  }) {
    const body = {
      title: payload.title,
      description: payload.description ?? null,
      project_id: payload.project_id ?? null,
      assigned_to: payload.assigned_to ?? null,
      status: payload.status ?? null,
      priority: payload.priority ?? null,
      due_date: payload.due_date ?? null,
      created_by: payload.created_by,
    };
    const { data, error } = await supabase.from('tasks').insert([body]).select().single();
    if (error) throw error;
    return data;
  },

  async updateTask(id: string, userId: string, patch: Partial<TaskRow>) {
    // permit update only if userId is creator or assigned_to — enforce with RLS too
    const { data, error } = await supabase
      .from('tasks')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTask(id: string, userId: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;

    // notify app to refresh dashboard (or other listeners)
    try {
      emitter?.emit?.('refreshDashboard');
    } catch (e) {
      // non-critical: if emitter fails, still return success
      console.warn('emitter.emit refreshDashboard failed', e);
    }

    return true;
  }
};
