import { supabase } from './supabaseClient'

export function extractUsername(raw) {
  if (!raw || typeof raw !== 'string') return ''
  let clean = raw.trim()
  clean = clean.replace(/^https?:\/\/(www\.)?leetcode\.com\/(u\/)?/i, '')
  clean = clean.replace(/^leetcode\.com\/(u\/)?/i, '')
  clean = clean.replace(/^u\//i, '')
  clean = clean.replace(/^@/, '')
  clean = clean.replace(/\/+$/, '')
  return clean.trim().toLowerCase()
}

const LEETCODE_GRAPHQL_QUERY = `
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

export async function fetchLeetCodeProfile(rawUsername) {
  const cleanUsername = extractUsername(rawUsername)

  if (!cleanUsername) {
    throw new Error('Enter a valid LeetCode username.')
  }

  try {
    // 1. Primary path: Supabase Edge Function
    try {
      const { data, error } = await supabase.functions.invoke('fetch-leetcode', {
        body: { username: cleanUsername }
      })

      if (!error && data) {
        if (data.error) throw new Error(data.error)
        return data
      }
    } catch (edgeErr) {
      if (edgeErr.message && edgeErr.message.includes('not found')) {
        throw edgeErr
      }
      console.warn('Edge function not reachable, attempting fallback...', edgeErr?.message)
    }

    // 2. Resilient fallback (via local Vite dev proxy /api/leetcode)
    try {
      const response = await fetch('/api/leetcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: LEETCODE_GRAPHQL_QUERY,
          variables: { username: cleanUsername }
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data?.data?.matchedUser) {
          const user = data.data.matchedUser
          const stats = user.submitStats?.acSubmissionNum || []
          const easySolved   = stats.find(s => s.difficulty === 'Easy')?.count  ?? 0
          const mediumSolved = stats.find(s => s.difficulty === 'Medium')?.count ?? 0
          const hardSolved   = stats.find(s => s.difficulty === 'Hard')?.count  ?? 0
          const badgeCount   = user.badges?.length ?? 0

          return {
            username: user.username,
            profileUrl: `https://leetcode.com/u/${user.username}/`,
            easySolved,
            mediumSolved,
            hardSolved,
            mediumHardSolved: mediumSolved + hardSolved,
            badgeCount,
            fetchedAt: new Date().toISOString()
          }
        }
      }
    } catch (proxyErr) {
      console.warn('Vite proxy fallback notice:', proxyErr?.message)
    }

    // 3. Resilient tier 3 fallback: Public LeetCode REST API
    try {
      const [solvedRes, badgesRes] = await Promise.all([
        fetch(`https://alfa-leetcode-api.onrender.com/${cleanUsername}/solved`),
        fetch(`https://alfa-leetcode-api.onrender.com/${cleanUsername}/badges`)
      ])

      if (solvedRes.ok) {
        const solvedData = await solvedRes.json()
        let badgesData = {}
        try {
          if (badgesRes.ok) badgesData = await badgesRes.json()
        } catch (e) {}

        const easySolved = solvedData.easySolved ?? 0
        const mediumSolved = solvedData.mediumSolved ?? 0
        const hardSolved = solvedData.hardSolved ?? 0
        const badgeCount = badgesData.badgesCount ?? badgesData.badges?.length ?? 0

        return {
          username: cleanUsername,
          profileUrl: `https://leetcode.com/u/${cleanUsername}/`,
          easySolved,
          mediumSolved,
          hardSolved,
          mediumHardSolved: mediumSolved + hardSolved,
          badgeCount,
          fetchedAt: new Date().toISOString()
        }
      }
    } catch (alfaErr) {
      console.warn('Alfa LeetCode API fallback notice:', alfaErr?.message)
    }

    throw new Error('LeetCode profile not found or service unreachable. Check the username and try again.')
  } catch (err) {
    throw new Error(err.message || 'Failed to fetch LeetCode profile. Please try again.')
  }
}

export function getLocalMappedLeetCodeUsername(studentId) {
  if (!studentId || typeof window === 'undefined') return ''
  return localStorage.getItem(`rankd_leetcode_user_${studentId}`) || ''
}

export function saveLocalMappedLeetCodeUsername(studentId, username) {
  if (!studentId || typeof window === 'undefined') return
  if (!username) {
    localStorage.removeItem(`rankd_leetcode_user_${studentId}`)
  } else {
    localStorage.setItem(`rankd_leetcode_user_${studentId}`, username.trim().toLowerCase())
  }
}

export async function saveLeetCodeProfile({ studentId, profileData, calculatedScores, submissionId }) {
  if (studentId && profileData?.username) {
    saveLocalMappedLeetCodeUsername(studentId, profileData.username)
  }
  try {
    const { data, error } = await supabase
      .from('leetcode_profiles')
      .upsert({
        student_id:        studentId,
        submission_id:     submissionId ?? null,
        platform:          'leetcode',
        profile_username:  profileData.username,
        profile_url:       profileData.profileUrl,
        easy_solved:       profileData.easySolved,
        medium_solved:     profileData.mediumSolved,
        hard_solved:       profileData.hardSolved,
        badge_count:       profileData.badgeCount,
        badge_marks:       calculatedScores.badgeMarks,
        difficulty_marks:  calculatedScores.difficultyMarks,
        calculated_marks:  calculatedScores.total,
        fetched_at:        profileData.fetchedAt,
        last_synced_at:    new Date().toISOString()
      }, {
        onConflict: 'student_id'
      })
      .select()
      .maybeSingle()

    if (!error && data) return data
  } catch (err) {
    console.warn('leetcode_profiles table notice:', err?.message)
  }
  return null
}

export async function getExistingLeetCodeProfile(studentId) {
  if (!studentId) return null

  // 1. Try leetcode_profiles table
  try {
    const { data, error } = await supabase
      .from('leetcode_profiles')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle()

    if (!error && data) {
      if (data.profile_username) {
        saveLocalMappedLeetCodeUsername(studentId, data.profile_username)
      }
      return data
    }
  } catch (err) {
    // leetcode_profiles table might not exist
  }

  // 2. Fallback: check student_submissions for latest LeetCode snapshot
  try {
    const { data: subs, error } = await supabase
      .from('student_submissions')
      .select('*')
      .eq('student_id', studentId)
      .in('category_id', ['coding-platforms', 'coding_practice'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (!error && subs && subs.length > 0) {
      const sub = subs[0]
      const d = sub.details || {}
      if (d.platform === 'leetcode' || d.profile_username) {
        const username = d.profile_username || d.username
        if (username) {
          saveLocalMappedLeetCodeUsername(studentId, username)
        }
        return {
          id: sub.id,
          student_id: studentId,
          submission_id: sub.id,
          platform: 'leetcode',
          profile_username: username,
          profile_url: d.profile_url || `https://leetcode.com/u/${username}/`,
          easy_solved: d.easy_solved ?? 0,
          medium_solved: d.medium_solved ?? 0,
          hard_solved: d.hard_solved ?? 0,
          medium_hard_solved: d.medium_hard_solved ?? ((d.medium_solved ?? 0) + (d.hard_solved ?? 0)),
          badge_count: d.badge_count ?? 0,
          badge_marks: d.badge_marks ?? 0,
          difficulty_marks: d.difficulty_marks ?? 0,
          calculated_marks: d.calculated_marks ?? sub.awarded_marks ?? 0,
          fetched_at: d.fetched_at || sub.created_at,
          last_synced_at: sub.created_at
        }
      }
    }
  } catch (fallbackErr) {
    console.warn('Fallback getExistingLeetCodeProfile notice:', fallbackErr?.message)
  }

  // 3. Fallback: check local storage mapped username
  const localUser = getLocalMappedLeetCodeUsername(studentId)
  if (localUser) {
    return {
      student_id: studentId,
      platform: 'leetcode',
      profile_username: localUser,
      profile_url: `https://leetcode.com/u/${localUser}/`,
      easy_solved: 0,
      medium_solved: 0,
      hard_solved: 0,
      medium_hard_solved: 0,
      badge_count: 0,
      badge_marks: 0,
      difficulty_marks: 0,
      calculated_marks: 0,
      isLocalOnly: true
    }
  }

  return null
}

