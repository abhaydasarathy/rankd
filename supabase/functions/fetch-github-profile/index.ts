import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const GITHUB_GRAPHQL = 'https://api.github.com/graphql'
const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN')

const QUERY = `
  query($username: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $username) {
      login
      repositories(first: 100, ownerAffiliations: OWNER, orderBy: {field: CREATED_AT, direction: DESC}) {
        totalCount
        nodes { createdAt }
      }
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
        contributionCalendar {
          weeks {
            contributionDays { contributionCount date }
          }
        }
      }
    }
  }
`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { username } = await req.json()
    if (!username?.trim()) {
      return new Response(JSON.stringify({ error: 'GitHub username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const now = new Date()
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

    const resp = await fetch(GITHUB_GRAPHQL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'rankd-placement-portal',
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { username: username.trim(), from: oneYearAgo.toISOString(), to: now.toISOString() }
      })
    })

    const json = await resp.json()

    if (json.errors || !json.data?.user) {
      return new Response(JSON.stringify({ error: 'GitHub profile not found. Check the username and try again.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const user = json.data.user
    const repos = user.repositories
    const contrib = user.contributionsCollection

    // Repos/contributions in last 1 year
    const reposLastYear = repos?.nodes ? repos.nodes.filter((r: { createdAt: string }) => new Date(r.createdAt) >= oneYearAgo).length : 0
    const totalContributions = (contrib?.totalCommitContributions || 0) + (contrib?.totalPullRequestContributions || 0) + (contrib?.totalIssueContributions || 0)

    // Monthly frequency — count distinct months (last 12) with at least 1 contribution
    const monthsWithActivity = new Set<string>()
    contrib?.contributionCalendar?.weeks?.forEach((week: { contributionDays: Array<{ contributionCount: number; date: string }> }) => {
      week.contributionDays?.forEach((day: { contributionCount: number; date: string }) => {
        if (day.contributionCount > 0) {
          monthsWithActivity.add(day.date.slice(0, 7)) // "YYYY-MM"
        }
      })
    })
    const activeMonthsCount = monthsWithActivity.size
    const avgMonthlyFrequency = Math.round((activeMonthsCount / 12) * 10) / 10

    return new Response(JSON.stringify({
      username: user.login,
      profileUrl: `https://github.com/${user.login}`,
      reposLastYear,
      totalContributions,
      activeMonthsCount,
      avgMonthlyFrequency,
      fetchedAt: new Date().toISOString()
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch GitHub profile';
    return new Response(JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
