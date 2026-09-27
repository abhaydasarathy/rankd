import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const LEETCODE_GRAPHQL = 'https://leetcode.com/graphql'

const QUERY = `
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        realName
      }
      submitStats {
        acSubmissionNum {
          difficulty
          count
        }
      }
      badges {
        id
        displayName
      }
    }
  }
`

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { username } = await req.json()

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cleanUsername = username.trim().toLowerCase()

    const response = await fetch(LEETCODE_GRAPHQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com',
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { username: cleanUsername }
      })
    })

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'LeetCode is currently unavailable. Try again later.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()

    if (!data?.data?.matchedUser) {
      return new Response(
        JSON.stringify({ error: 'LeetCode profile not found. Check the username and try again.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const user = data.data.matchedUser
    const stats = user.submitStats.acSubmissionNum

    const easySolved   = stats.find(s => s.difficulty === 'Easy')?.count  ?? 0
    const mediumSolved = stats.find(s => s.difficulty === 'Medium')?.count ?? 0
    const hardSolved   = stats.find(s => s.difficulty === 'Hard')?.count  ?? 0
    const badgeCount   = user.badges?.length ?? 0

    return new Response(
      JSON.stringify({
        username: user.username,
        profileUrl: `https://leetcode.com/u/${user.username}/`,
        easySolved,
        mediumSolved,
        hardSolved,
        badgeCount,
        fetchedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch LeetCode profile. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
