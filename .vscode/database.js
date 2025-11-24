import { supabase } from './supabase';

// Profile functions
export const profileService = {
  getProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  updateProfile: async (userId, updates) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};

// Workspace functions
export const workspaceService = {
  getWorkspaces: async (userId) => {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('owner_id', userId);
    
    if (error) throw error;
    return data;
  },

  getDefaultWorkspace: async (userId) => {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('owner_id', userId)
      .eq('is_default', true)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
  },
};

// Project functions
export const projectService = {
  getProjects: async (userId) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', userId);
    
    if (error) throw error;
    return data;
  },

  getProjectCount: async (userId) => {
    const { data, error } = await supabase
      .from('projects')
      .select('id', { count: 'exact' })
      .eq('owner_id', userId);
    
    if (error) throw error;
    return data.length;
  },
};

// Task functions
export const taskService = {
  getTasks: async (userId) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`);
    
    if (error) throw error;
    return data;
  },

  getTaskCount: async (userId) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`);
    
    if (error) throw error;
    return data.length;
  },

  getTasksByStatus: async (userId) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('status')
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`);
    
    if (error) throw error;
    
    const completed = data.filter(task => task.status === 'completed').length;
    const pending = data.filter(task => task.status !== 'completed').length;
    
    return { completed, pending };
  },
};

// Todo functions
export const todoService = {
  getTodos: async (userId) => {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data;
  },

  getTodoCount: async (userId) => {
    const { data, error } = await supabase
      .from('todos')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);
    
    if (error) throw error;
    return data.length;
  },

  getTodosByCompletion: async (userId) => {
    const { data, error } = await supabase
      .from('todos')
      .select('is_completed')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    const completed = data.filter(todo => todo.is_completed).length;
    const pending = data.filter(todo => !todo.is_completed).length;
    
    return { completed, pending };
  },

  // ADD THIS MISSING FUNCTION
  toggleTodo: async (todoId, isCompleted) => {
    const { data, error } = await supabase
      .from('todos')
      .update({ 
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null 
      })
      .eq('id', todoId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Optional: Add these for completeness
  createTodo: async (todo) => {
    const { data, error } = await supabase
      .from('todos')
      .insert(todo)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateTodo: async (todoId, updates) => {
    const { data, error } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', todoId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};

// Meeting functions
export const meetingService = {
  getMeetings: async (userId) => {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('created_by', userId);
    
    if (error) throw error;
    return data;
  },

  getMeetingCount: async (userId) => {
    const { data, error } = await supabase
      .from('meetings')
      .select('id', { count: 'exact' })
      .eq('created_by', userId);
    
    if (error) throw error;
    return data.length;
  },
};