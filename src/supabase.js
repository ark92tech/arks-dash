import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const fetchProjects = async () => {
  const { data, error } = await supabase
    .from('projects')
    .select('*, nodes (*), subtasks (*)')
    .order('position', { ascending: true })
  if (error) throw error
  return data
}

export const createProject = async (name) => {
  const { data, error } = await supabase
    .from('projects')
    .insert([{ name, column_type: 'planning', position: 999 }])
    .select()
    .single()
  if (error) throw error
  await supabase.from('nodes').insert([
    { project_id: data.id, node_type: 'time', value: '0h', icon: '⏰' },
    { project_id: data.id, node_type: 'type', value: 'personal', icon: '🏷️' },
    { project_id: data.id, node_type: 'status', value: 'planning', icon: '📊' }
  ])
  return data
}

export const updateProjectColumn = async (projectId, newColumn) => {
  const { error } = await supabase
    .from('projects')
    .update({ column_type: newColumn })
    .eq('id', projectId)
  if (error) throw error
}

export const createSubtask = async (projectId, text) => {
  const { data, error } = await supabase
    .from('subtasks')
    .insert([{ project_id: projectId, text, position: 999 }])
    .select()
    .single()
  if (error) throw error
  return data
}
