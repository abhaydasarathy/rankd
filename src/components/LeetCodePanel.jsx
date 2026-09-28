import { useState, useEffect } from 'react'
import { fetchLeetCodeProfile, saveLeetCodeProfile, getExistingLeetCodeProfile } from '../lib/leetcodeService'
import { calculateCodingPlatformScore } from '../utils/scoringEngine'
import { supabase } from '../lib/supabaseClient'
import { upsertStudentSubmission } from '../services/submissionService'

export default function LeetCodePanel({ studentId, categoryId = 'coding-platforms', onSubmitProof, onSubmitSuccess }) {
  const [username, setUsername]         = useState('')
  const [profile, setProfile]           = useState(null)   // fetched data
  const [scores, setScores]             = useState(null)   // calculated marks
  const [existing, setExisting]         = useState(null)   // saved profile from DB
  const [fetchState, setFetchState]     = useState('idle') // idle | loading | success | error
  const [submitState, setSubmitState]   = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg]         = useState('')

  // Load existing profile on mount
  useEffect(() => {
    if (!studentId) return
    getExistingLeetCodeProfile(studentId)
      .then(data => {
        if (data) {
          setExisting(data)
          setUsername(data.profile_username)
        }
      })
      .catch(() => {}) // silent — no profile yet is fine
  }, [studentId])

  async function handleFetch() {
    if (!username.trim()) {
      setErrorMsg('Enter a LeetCode username first.')
      return
    }
    setFetchState('loading')
    setErrorMsg('')
    setProfile(null)
    setScores(null)

    try {
      const data = await fetchLeetCodeProfile(username)
      setUsername(data.username)
      const calc = calculateCodingPlatformScore({
        badgeCount:    data.badgeCount,
        mediumSolved:  data.mediumSolved,
        hardSolved:    data.hardSolved
      })
      setProfile(data)
      setScores(calc)
      setFetchState('success')
    } catch (err) {
      setErrorMsg(err.message)
      setFetchState('error')
    }
  }

  async function handleSubmit() {
    if (!profile || !scores) return
    setSubmitState('loading')
    setErrorMsg('')

    try {
      // 1. Try to save snapshot to leetcode_profiles (fail-safe)
      let saved = null
      try {
        saved = await saveLeetCodeProfile({
          studentId,
          profileData: profile,
          calculatedScores: scores
        })
      } catch (e) {
        console.warn('leetcode_profiles save skipped:', e?.message)
      }

      // 2. Prepare submission payload
      const submissionPayload = {
        student_id:    studentId,
        category_id:   categoryId || 'coding-platforms',
        title:         `LeetCode — ${profile.username}`,
        details: {
          platform:            'leetcode',
          leetcode_profile_id: saved?.id || null,
          profile_username:    profile.username,
          profile_url:         profile.profileUrl,
          easy_solved:         profile.easySolved,
          medium_solved:       profile.mediumSolved,
          hard_solved:         profile.hardSolved,
          medium_hard_solved:  scores.mediumHardSolved,
          badge_count:         profile.badgeCount,
          badge_marks:         scores.badgeMarks,
          difficulty_marks:    scores.difficultyMarks,
          calculated_marks:    scores.total,
          fetched_at:          profile.fetchedAt
        },
        proof_url:     profile.profileUrl,
        status:        'PENDING', // Submissions require faculty verification
        awarded_marks: scores.total
      }

      // 3. Delegate to onSubmitProof if provided (which saves to Supabase and reloads studentSubmissions in App)
      if (onSubmitProof) {
        await onSubmitProof(categoryId || 'coding-platforms', submissionPayload)
      } else {
        const submission = await upsertStudentSubmission({
          studentId,
          categoryId: categoryId || 'coding-platforms',
          title: submissionPayload.title,
          details: submissionPayload.details,
          proofUrl: submissionPayload.proof_url || null,
          calculatedMarks: scores.total,
        });

        if (saved?.id && submission?.id) {
          await supabase
            .from('leetcode_profiles')
            .update({ submission_id: submission.id })
            .eq('id', saved.id)
            .catch(() => {})
        }
      }

      setSubmitState('success')
      onSubmitSuccess?.(submissionPayload)
    } catch (err) {
      console.error('LeetCode submission error:', err)
      setErrorMsg('Submission failed. ' + err.message)
      setSubmitState('error')
    }
  }


  async function handleRefresh() {
    setFetchState('loading')
    setErrorMsg('')
    try {
      const data = await fetchLeetCodeProfile(existing.profile_username)
      const calc = calculateCodingPlatformScore({
        badgeCount:   data.badgeCount,
        mediumSolved: data.mediumSolved,
        hardSolved:   data.hardSolved
      })
      setProfile(data)
      setScores(calc)
      setFetchState('success')
    } catch (err) {
      setErrorMsg(err.message)
      setFetchState('error')
    }
  }

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="leetcode-panel">

      {/* Platform header */}
      <div className="lc-platform-header">
        <span className="lc-platform-icon">⌨</span>
        <span className="lc-platform-name">LeetCode</span>
      </div>

      {/* Existing profile — show refresh option */}
      {existing && !profile && (
        <div className="lc-existing-card">
          <div className="lc-existing-row">
            <div>
              <div className="lc-label">Connected profile</div>
              <a href={existing.profile_url} target="_blank" rel="noreferrer" className="lc-username-link">
                @{existing.profile_username}
              </a>
            </div>
            <button
              className="lc-btn-secondary"
              onClick={handleRefresh}
              disabled={fetchState === 'loading'}
            >
              {fetchState === 'loading' ? 'Refreshing...' : 'Refresh stats'}
            </button>
          </div>
          <div className="lc-stat-row">
            <StatChip label="Medium+Hard" value={existing.medium_solved + existing.hard_solved} />
            <StatChip label="Badges" value={existing.badge_count} />
            <StatChip label="Score" value={`${existing.calculated_marks} / 10`} highlight />
          </div>
          <div className="lc-synced-at">Last synced {new Date(existing.last_synced_at).toLocaleString()}</div>
        </div>
      )}

      {/* Username input — always show if no existing OR if refreshing */}
      {!existing && (
        <div className="lc-input-group">
          <label className="lc-field-label">LeetCode username</label>
          <div className="lc-input-row">
            <span className="lc-input-prefix">leetcode.com/u/</span>
            <input
              className="lc-input"
              type="text"
              placeholder="your-username"
              value={username}
              onChange={e => {
                let val = e.target.value
                val = val.replace(/^https?:\/\/(www\.)?leetcode\.com\/(u\/)?/i, '').replace(/^leetcode\.com\/(u\/)?/i, '').replace(/^u\//i, '').replace(/^@/, '')
                setUsername(val)
              }}
              onKeyDown={e => e.key === 'Enter' && handleFetch()}
              disabled={fetchState === 'loading'}
              autoComplete="off"
              spellCheck={false}
            />

          </div>
          <button
            className="lc-btn-primary"
            onClick={handleFetch}
            disabled={fetchState === 'loading' || !username.trim()}
          >
            {fetchState === 'loading' ? (
              <><span className="lc-spinner" /> Fetching profile...</>
            ) : 'Fetch Profile'}
          </button>
        </div>
      )}

      {/* Error state */}
      {errorMsg && (
        <div className="lc-error">
          <span>⚠</span> {errorMsg}
        </div>
      )}

      {/* Fetched profile stats */}
      {profile && scores && fetchState === 'success' && (
        <>
          <div className="lc-profile-card">
            <div className="lc-profile-header">
              <div className="lc-profile-avatar">
                {profile.username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="lc-profile-username">@{profile.username}</div>
                <a href={profile.profileUrl} target="_blank" rel="noreferrer" className="lc-profile-link">
                  View on LeetCode ↗
                </a>
              </div>
              <div className="lc-fetched-badge">Live data</div>
            </div>

            <div className="lc-stats-grid">
              <StatChip label="Easy" value={profile.easySolved} color="easy" />
              <StatChip label="Medium" value={profile.mediumSolved} color="medium" />
              <StatChip label="Hard" value={profile.hardSolved} color="hard" />
              <StatChip label="Medium + Hard" value={scores.mediumHardSolved} />
              <StatChip label="Badges" value={profile.badgeCount} />
            </div>
          </div>

          {/* Rubric breakdown */}
          <div className="lc-rubric-card">
            <div className="lc-rubric-title">Rubric calculation</div>
            <div className="lc-rubric-row">
              <span className="lc-rubric-label">Badge score</span>
              <div className="lc-rubric-right">
                <div className="lc-rubric-bar">
                  <div className="lc-rubric-fill" style={{ width: `${(scores.badgeMarks / 5) * 100}%` }} />
                </div>
                <span className="lc-rubric-score">{scores.badgeMarks} / 5</span>
              </div>
            </div>
            <div className="lc-rubric-row">
              <span className="lc-rubric-label">Medium + Hard score</span>
              <div className="lc-rubric-right">
                <div className="lc-rubric-bar">
                  <div className="lc-rubric-fill" style={{ width: `${(scores.difficultyMarks / 5) * 100}%` }} />
                </div>
                <span className="lc-rubric-score">{scores.difficultyMarks} / 5</span>
              </div>
            </div>
            <div className="lc-rubric-total">
              <span>Coding Platform Score</span>
              <span className="lc-total-score">{scores.total} / 10</span>
            </div>
          </div>

          <div className="lc-notice">
            Statistics fetched automatically from LeetCode. Submitting creates a pending verification request for faculty review.
          </div>

          <button
            className="lc-btn-submit"
            onClick={handleSubmit}
            disabled={submitState === 'loading' || submitState === 'success'}
          >
            {submitState === 'loading' ? 'Submitting...' :
             submitState === 'success' ? '✓ Submitted for verification' :
             'Submit for Verification'}
          </button>
        </>
      )}
    </div>
  )
}

function StatChip({ label, value, color, highlight }) {
  return (
    <div className={`lc-stat-chip ${highlight ? 'lc-stat-chip--highlight' : ''} ${color ? `lc-stat-chip--${color}` : ''}`}>
      <div className="lc-stat-value">{value}</div>
      <div className="lc-stat-label">{label}</div>
    </div>
  )
}
