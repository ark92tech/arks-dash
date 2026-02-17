import { useState, useEffect } from 'react'
import { supabase, fetchProjects, createProject, updateProjectColumn, createSubtask } from './supabase'

function App() {
  const [activeView, setActiveView] = useState('nodes')
  const [projects, setProjects] = useState([])
  const [expandedProjects, setExpandedProjects] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadProjects()
    const subscription = supabase
      .channel('projects_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        loadProjects()
      })
      .subscribe()
    return () => subscription.unsubscribe()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const data = await fetchProjects()
      setProjects(data || [])
      setError(null)
    } catch (err) {
      setError('Failed to load. Check your Supabase connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddProject = async () => {
    const name = prompt('Project name:')
    if (!name) return
    try {
      await createProject(name)
      await loadProjects()
    } catch (err) {
      alert('Failed to create project')
    }
  }

  const handleMoveProject = async (projectId, newColumn) => {
    try {
      await updateProjectColumn(projectId, newColumn)
      await loadProjects()
    } catch (err) {
      alert('Failed to move project')
    }
  }

  const handleAddSubtask = async (projectId) => {
    const text = prompt('New subtask:')
    if (!text) return
    try {
      await createSubtask(projectId, text)
      await loadProjects()
    } catch (err) {
      alert('Failed to add subtask')
    }
  }

  const toggleProject = (id) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(id)) newExpanded.delete(id)
    else newExpanded.add(id)
    setExpandedProjects(newExpanded)
  }

  const renderProject = (project) => {
    const isExpanded = expandedProjects.has(project.id)
    const timeNode = project.nodes?.find(n => n.node_type === 'time')
    const typeNode = project.nodes?.find(n => n.node_type === 'type')
    const statusNode = project.nodes?.find(n => n.node_type === 'status')

    return (
      <div key={project.id} className="node-card">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 cursor-pointer" onClick={() => toggleProject(project.id)}>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
              <h3 className="font-semibold text-white">{project.name}</h3>
            </div>
          </div>
          <button className="text-gray-500 hover:text-gray-300">⋮</button>
        </div>

        {isExpanded ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {timeNode && <div className="embedded-node"><span>{timeNode.icon}</span><span>Time: {timeNode.value}</span></div>}
            {typeNode && <div className="embedded-node"><span>{typeNode.icon}</span><span>Type: {typeNode.value}</span></div>}
            {statusNode && <div className="embedded-node"><span>{statusNode.icon}</span><span>Status: {statusNode.value}</span></div>}
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-2">
            {timeNode && <span className="text-lg">{timeNode.icon}</span>}
            {typeNode && <span className="text-lg">{typeNode.icon}</span>}
            {statusNode && <span className="text-lg">{statusNode.icon}</span>}
          </div>
        )}

        {isExpanded && project.subtasks && project.subtasks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-2">
            {project.subtasks.map(subtask => (
              <div key={subtask.id} className="text-sm text-gray-400 flex items-center gap-2">
                <span className="text-gray-600">▸</span>{subtask.text}
              </div>
            ))}
          </div>
        )}

        {isExpanded && (
          <button onClick={() => handleAddSubtask(project.id)} className="text-sm text-green-400 hover:text-green-300 mt-2">
            + Add subtask
          </button>
        )}

        {project.column_type === 'planning' && (
          <div className="mt-3 pt-3 border-t border-gray-700/50">
            <button onClick={() => handleMoveProject(project.id, 'progress')} className="text-xs text-blue-400 hover:text-blue-300">→ In Progress</button>
          </div>
        )}
        {project.column_type === 'progress' && (
          <div className="flex gap-3 mt-3 pt-3 border-t border-gray-700/50">
            <button onClick={() => handleMoveProject(project.id, 'planning')} className="text-xs text-gray-400 hover:text-gray-300">← Planning</button>
            <button onClick={() => handleMoveProject(project.id, 'completed')} className="text-xs text-green-400 hover:text-green-300">✓ Complete</button>
          </div>
        )}
        {project.column_type === 'completed' && (
          <div className="mt-3 pt-3 border-t border-gray-700/50">
            <button onClick={() => handleMoveProject(project.id, 'progress')} className="text-xs text-blue-400 hover:text-blue-300">↩ Reopen</button>
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>
  if (error) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-red-400">{error}</div>

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <div className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold">Ark's Dash</h1>
        </div>
        <nav className="p-4 flex-1">
          <button onClick={() => setActiveView('overview')} className={`w-full text-left px-4 py-2 rounded-lg mb-2 text-sm ${activeView === 'overview' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'text-gray-400 hover:bg-gray-900'}`}>Overview</button>
          <button onClick={() => setActiveView('calendar')} className={`w-full text-left px-4 py-2 rounded-lg mb-4 text-sm ${activeView === 'calendar' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'text-gray-400 hover:bg-gray-900'}`}>Calendar</button>
          <div className="border-t border-gray-700/50 my-4"></div>
          <div className="relative">
            <button onClick={() => setActiveView('nodes')} className={`w-full text-left px-4 py-2 rounded-lg mb-3 text-sm ${activeView === 'nodes' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'text-gray-400 hover:bg-gray-900'}`}>Projects</button>
            <button onClick={handleAddProject} className="absolute right-2 top-2 text-green-400 hover:text-green-300 text-xl leading-none">+</button>
          </div>
          <div className="space-y-2">
            <div className="sidebar-node"><div className="flex items-center gap-2"><span>⏰</span><span>Time</span></div></div>
            <div className="sidebar-node"><div className="flex items-center gap-2"><span>🏷️</span><span>Type</span></div></div>
            <div className="sidebar-node"><div className="flex items-center gap-2"><span>📊</span><span>Status</span></div></div>
          </div>
        </nav>
      </div>

      <div className="flex-1 relative">
        {activeView === 'overview' && (
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-6">Overview</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700/50"><div className="text-sm text-gray-400 uppercase mb-2">Today</div><div className="text-3xl font-bold">0.0h</div></div>
              <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700/50"><div className="text-sm text-gray-400 uppercase mb-2">Commercial</div><div className="text-3xl font-bold">0.0h</div></div>
              <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700/50"><div className="text-sm text-gray-400 uppercase mb-2">Value</div><div className="text-3xl font-bold">£0</div></div>
              <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700/50"><div className="text-sm text-gray-400 uppercase mb-2">Target</div><div className="text-3xl font-bold text-gray-500">○ £400</div></div>
            </div>
          </div>
        )}
        {activeView === 'calendar' && (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-300">Calendar</h3>
            <p className="text-gray-500">Coming soon...</p>
          </div>
        )}
        {activeView === 'nodes' && (
          <div className="canvas grid-bg flex h-screen">
            <div className="column border-r border-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">In Planning</h3>
              {projects.filter(p => p.column_type === 'planning').map(renderProject)}
            </div>
            <div className="column border-r border-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">In Progress</h3>
              {projects.filter(p => p.column_type === 'progress').map(renderProject)}
            </div>
            <div className="column">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Completed</h3>
              {projects.filter(p => p.column_type === 'completed').map(renderProject)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
