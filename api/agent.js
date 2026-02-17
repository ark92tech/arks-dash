export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { agent, action, params } = req.body

    let result
    switch (agent) {
      case 'dashboard':
        result = await handleDashboardAgent(action, params)
        break

      default:
        return res.status(400).json({ error: `Unknown agent: ${agent}` })
    }

    return res.status(200).json(result)
  } catch (error) {
    console.error('API Gateway error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}

async function handleDashboardAgent(action, params) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) throw new Error('SUPABASE_URL is not set')
  if (!supabaseKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')

  const response = await fetch(`${supabaseUrl}/functions/v1/dashboard-agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey
    },
    body: JSON.stringify({ action, ...params })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Dashboard agent error: ${errorText}`)
  }

  return await response.json()
}
