import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { RankdSymbol } from './RankdLogo'

const SECTIONS = [
  'A1','A2','B1','B2','C1','C2','D1','D2','E1','E2',
  'F1','F2','G1','G2','H1','H2','I1','I2','J1','J2',
  'K1','K2','L1','L2','M1','M2','N1','N2','O1','O2',
  'P1','P2','Q1','Q2','R1','R2','S1','S2','T1','T2'
]

const BRANCHES = [
  { value: 'CTECH',   label: 'Computer Science & Technology' },
  { value: 'CINTEL',  label: 'Computer Science & Artificial Intelligence' },
  { value: 'DSBS',    label: 'Data Science & Business Systems' },
  { value: 'NWC',     label: 'Network & Communications' },
]

// ── Field component (declared at module scope to preserve DOM focus across keystrokes) ──
function Field({ id, label, type = 'text', placeholder, value, onChange, error, children }) {
  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-label">{label}</label>
      {children || (
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className={`auth-input ${error ? 'auth-input--error' : ''}`}
          autoComplete={type === 'password' ? 'current-password' : 'off'}
          spellCheck={false}
        />
      )}
      {error && <span className="auth-field-error">{error}</span>}
    </div>
  )
}

export default function AuthPage() {
  const navigate = useNavigate()
  const [role, setRole]       = useState('student') // 'student' | 'faculty'
  const [mode, setMode]       = useState('login')   // 'login' | 'register'
  const [form, setForm]       = useState({})
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [globalError, setGlobalError] = useState('')

  function setField(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
    setErrors(prev => ({ ...prev, [key]: '' }))
    setGlobalError('')
  }

  function switchRole(newRole) {
    setRole(newRole)
    setForm({})
    setErrors({})
    setGlobalError('')
  }

  function switchMode(newMode) {
    setMode(newMode)
    setForm({})
    setErrors({})
    setGlobalError('')
  }

  // ── Validation helpers ────────────────────────────────────
  function validateEmail(email) {
    if (!email) return 'Email is required'
    if (!email.toLowerCase().endsWith('@srmist.edu.in'))
      return 'Only official SRMIST email IDs (@srmist.edu.in) are permitted'
    return ''
  }

  function validateRegNo(regNo) {
    if (!regNo) return 'Registration number is required'
    if (!regNo.toUpperCase().startsWith('RA2411'))
      return 'Registration number must start with RA2411'
    if (regNo.length < 10)
      return 'Registration number is too short'
    return ''
  }

  function validatePassword(pass) {
    if (!pass) return 'Password is required'
    if (pass.length < 8) return 'Password must be at least 8 characters'
    return ''
  }

  // ── Register ──────────────────────────────────────────────
  async function handleRegister() {
    const newErrors = {}

    if (role === 'student') {
      if (!form.fullName?.trim() || form.fullName.trim().length < 2) {
        newErrors.fullName = 'Full name is required (min 2 characters)'
      }
      const regErr = validateRegNo(form.regNo || '')
      if (regErr) newErrors.regNo = regErr
      const emailErr = validateEmail(form.email || '')
      if (emailErr) newErrors.email = emailErr
      if (!form.branch) newErrors.branch = 'Please select your branch'
      if (!form.section) newErrors.section = 'Please select your section'
    } else {
      if (!form.fullName?.trim() || form.fullName.trim().length < 2) {
        newErrors.fullName = 'Full name is required (min 2 characters)'
      }
      if (!form.facultyId?.trim()) newErrors.facultyId = 'Faculty ID is required'
      const emailErr = validateEmail(form.email || '')
      if (emailErr) newErrors.email = emailErr
      if (!form.section) newErrors.section = 'Please select your section'
    }

    const passErr = validatePassword(form.password || '')
    if (passErr) newErrors.password = passErr
    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    setGlobalError('')

    try {
      const email = form.email.toLowerCase().trim()
      const regNo = role === 'student'
        ? form.regNo.toUpperCase().trim()
        : form.facultyId.trim()

      // Check for duplicate reg_no before creating auth user
      const { data: existing, error: checkErr } = await supabase
        .from('profiles')
        .select('id')
        .ilike('reg_no', regNo)
        .maybeSingle()

      if (checkErr && checkErr.code !== 'PGRST116') throw checkErr

      if (existing) {
        const label = role === 'student' ? 'Registration number' : 'Faculty ID'
        setGlobalError(`${label} already registered. Please sign in instead.`)
        setLoading(false)
        return
      }

      // Also check email uniqueness
      const { data: existingEmail } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (existingEmail) {
        setGlobalError('An account with this email already exists. Please sign in.')
        setLoading(false)
        return
      }

      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName.trim(),
            reg_no: regNo,
            role,
            department: role === 'student' ? form.branch : 'Faculty',
            section: form.section,
          }
        }
      })

      if (authError) throw authError

      // Check email confirmation status (Part 7)
      if (authData.session === null && authData.user?.identities?.length === 0) {
        setGlobalError('This email is already registered. Please sign in.')
        setLoading(false)
        return
      }
      if (authData.session === null) {
        setGlobalError('Please check your email to confirm your account, then sign in.')
        setLoading(false)
        return
      }

      const userId = authData.user?.id
      if (!userId) throw new Error('Account created but user ID not returned. Please sign in.')

      // Insert profile row immediately (Rule 5: never .single() on inserts)
      const { data: insertedData, error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        email,
        name: form.fullName.trim().split(' ')[0],
        full_name: form.fullName.trim(),
        reg_no: regNo,
        role,
        department: role === 'student' ? form.branch : 'Faculty',
        programme: role === 'student' ? 'B.Tech' : 'Faculty',
        section: form.section,
        batch: '2024 - 2028',
        batch_year: '2024 - 2028',
      }).select()

      if (profileError) {
        await supabase.auth.admin?.deleteUser(userId).catch(() => {})
        throw profileError
      }

      // Success — navigate to appropriate portal
      navigate(role === 'faculty' ? '/faculty/pending' : '/overview')

    } catch (err) {
      console.error('Registration error:', err)
      if (err.message?.includes('already registered') || err.message?.includes('already exists')) {
        setGlobalError('An account with this email or ID already exists. Please sign in.')
      } else if (err.message?.includes('email')) {
        setGlobalError('Email address is invalid or already in use.')
      } else {
        setGlobalError(err.message || 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Login ─────────────────────────────────────────────────
  async function handleLogin() {
    const newErrors = {}
    const identifier = (form.identifier || '').trim()
    const password = form.password || ''

    if (!identifier) {
      newErrors.identifier = role === 'student'
        ? 'Enter your registration number or email'
        : 'Enter your Faculty ID or email'
    }
    if (!password) newErrors.password = 'Password is required'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    setGlobalError('')

    try {
      let email = identifier

      // If identifier has no @, look up the email from profiles by reg_no
      if (!identifier.includes('@')) {
        const { data: profileRow, error: lookupErr } = await supabase
          .from('profiles')
          .select('email')
          .ilike('reg_no', identifier)
          .maybeSingle()

        if (lookupErr || !profileRow) {
          setGlobalError(
            role === 'student'
              ? 'Registration number not found. Check your ID or register first.'
              : 'Faculty ID not found. Check your ID or register first.'
          )
          setLoading(false)
          return
        }
        email = profileRow.email
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      })

      if (signInError) {
        if (signInError.message?.toLowerCase().includes('invalid') ||
            signInError.message?.toLowerCase().includes('credentials')) {
          setGlobalError('Incorrect password. Please try again.')
        } else {
          setGlobalError(signInError.message || 'Sign in failed. Please try again.')
        }
        return
      }

      // Confirm role matches what they selected
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profile?.role === 'faculty') {
        navigate('/faculty/pending')
      } else {
        navigate('/overview')
      }

    } catch (err) {
      setGlobalError(err.message || 'Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="auth-page">

      {/* Left brand panel — desktop only */}
      <div className="auth-brand-panel">
        <div className="auth-brand-grid" />
        <div className="auth-brand-logo">
          <RankdSymbol size={32} />
          <span className="auth-brand-name">rankd</span>
        </div>
        <p className="auth-brand-tagline">know your place.</p>
        <p className="auth-brand-institution">SRM Institute of Science and Technology<br/>KTR Campus</p>
        <div className="auth-brand-tiers">
          <span className="auth-tier-pill auth-tier--super">Super Dream</span>
          <span className="auth-tier-pill auth-tier--dream">Dream</span>
          <span className="auth-tier-pill auth-tier--eligible">Eligible</span>
        </div>
      </div>

      {/* Right auth card */}
      <div className="auth-card-wrap">
        <div className="auth-card">

          {/* Mobile logo */}
          <div className="auth-mobile-logo">
            <RankdSymbol size={24} />
            <span>rankd</span>
          </div>

          <h1 className="auth-card-title">
            {mode === 'login' ? 'Sign in to rankd' : 'Create your account'}
          </h1>
          <p className="auth-card-subtitle">
            {mode === 'login'
              ? 'Enter your credentials to access your placement portal'
              : 'Complete all fields to register your account'}
          </p>

          {/* Role tabs */}
          <div className="auth-role-tabs">
            <button
              className={`auth-tab ${role === 'student' ? 'auth-tab--active' : ''}`}
              onClick={() => switchRole('student')}
              type="button"
            >
              Student
            </button>
            <button
              className={`auth-tab ${role === 'faculty' ? 'auth-tab--active' : ''}`}
              onClick={() => switchRole('faculty')}
              type="button"
            >
              Faculty
            </button>
          </div>

          {/* Global error */}
          {globalError && (
            <div className="auth-global-error">{globalError}</div>
          )}

          {/* ── REGISTER FORM ── */}
          {mode === 'register' && (
            <div className="auth-form">

              <Field
                id="fullName" label="Full Name *"
                placeholder="Enter your full name"
                value={form.fullName} onChange={v => setField('fullName', v)}
                error={errors.fullName}
              />

              {role === 'student' ? (
                <Field
                  id="regNo" label="Registration Number *"
                  placeholder="RA2411XXXXXXXXX"
                  value={form.regNo} onChange={v => setField('regNo', v.toUpperCase())}
                  error={errors.regNo}
                />
              ) : (
                <Field
                  id="facultyId" label="Faculty ID *"
                  placeholder="FAC-XXX-000"
                  value={form.facultyId} onChange={v => setField('facultyId', v)}
                  error={errors.facultyId}
                />
              )}

              <Field
                id="email" label="Official SRMIST Email *" type="email"
                placeholder={role === 'student' ? 'ra2411xxxxx@srmist.edu.in' : 'name@srmist.edu.in'}
                value={form.email} onChange={v => setField('email', v.toLowerCase())}
                error={errors.email}
              />

              {role === 'student' && (
                <Field id="branch" label="Branch *" error={errors.branch}>
                  <select
                    id="branch"
                    className={`auth-input auth-select ${errors.branch ? 'auth-input--error' : ''}`}
                    value={form.branch || ''}
                    onChange={e => setField('branch', e.target.value)}
                  >
                    <option value="">Select your branch</option>
                    {BRANCHES.map(b => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </Field>
              )}

              <Field id="section" label="Section *" error={errors.section}>
                <select
                  id="section"
                  className={`auth-input auth-select ${errors.section ? 'auth-input--error' : ''}`}
                  value={form.section || ''}
                  onChange={e => setField('section', e.target.value)}
                >
                  <option value="">Select section</option>
                  {SECTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>

              <Field
                id="password" label="Password *" type="password"
                placeholder="Minimum 8 characters"
                value={form.password} onChange={v => setField('password', v)}
                error={errors.password}
              />

              <Field
                id="confirmPassword" label="Confirm Password *" type="password"
                placeholder="Re-enter your password"
                value={form.confirmPassword} onChange={v => setField('confirmPassword', v)}
                error={errors.confirmPassword}
              />

              <button
                className="auth-btn-primary"
                onClick={handleRegister}
                disabled={loading}
                type="button"
              >
                {loading ? <><span className="auth-spinner" /> Creating account...</> : 'Create Account'}
              </button>

              <p className="auth-mode-switch">
                Already have an account?{' '}
                <button type="button" className="auth-link" onClick={() => switchMode('login')}>
                  Sign in
                </button>
              </p>
            </div>
          )}

          {/* ── LOGIN FORM ── */}
          {mode === 'login' && (
            <div className="auth-form">

              <Field
                id="identifier"
                label={role === 'student' ? 'Registration Number or Email *' : 'Faculty ID or Email *'}
                placeholder={
                  role === 'student'
                    ? 'RA2411XXXXXXXXX or ra2411...@srmist.edu.in'
                    : 'FAC-XXX-000 or name@srmist.edu.in'
                }
                value={form.identifier}
                onChange={v => setField('identifier', v)}
                error={errors.identifier}
              />

              <Field
                id="password" label="Password *" type="password"
                placeholder="Enter your password"
                value={form.password} onChange={v => setField('password', v)}
                error={errors.password}
              />

              <button
                className="auth-btn-primary"
                onClick={handleLogin}
                disabled={loading}
                type="button"
              >
                {loading ? <><span className="auth-spinner" /> Signing in...</> : 'Sign In'}
              </button>

              <p className="auth-mode-switch">
                Don't have an account?{' '}
                <button type="button" className="auth-link" onClick={() => switchMode('register')}>
                  Register
                </button>
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
