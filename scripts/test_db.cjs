const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
const envVars = {};
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    envVars[key] = val;
  }
}

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log('--- 1. PROFILES ---');
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  console.log('Profiles count:', profiles?.length, 'Error:', pErr);
  console.log(profiles);

  console.log('\n--- 2. STUDENT SUBMISSIONS (ANON) ---');
  const { data: subsAnon, error: sErrAnon } = await supabase.from('student_submissions').select('*');
  console.log('Anon subs count:', subsAnon?.length, 'Error:', sErrAnon);

  console.log('\n--- 3. AUTH TEST: ar2461@srmist.edu.in ---');
  const { data: studentAuth, error: stErr } = await supabase.auth.signInWithPassword({
    email: 'ar2461@srmist.edu.in',
    password: 'password1234'
  });
  console.log('Student auth error:', stErr?.message, 'User ID:', studentAuth?.user?.id);

  if (studentAuth?.user) {
    const { data: studentSubs, error: subErr } = await supabase
      .from('student_submissions')
      .select('*');
    console.log('Student subs count with auth:', studentSubs?.length, 'Error:', subErr);
  }

  await supabase.auth.signOut();

  console.log('\n--- 4. AUTH TEST: faculty.coordinator@srmist.edu.in ---');
  const { data: facAuth, error: facErr } = await supabase.auth.signInWithPassword({
    email: 'faculty.coordinator@srmist.edu.in',
    password: 'password1234'
  });
  console.log('Faculty auth error:', facErr?.message, 'Faculty user ID:', facAuth?.user?.id);

  if (facAuth?.user) {
    const { data: facSubs, error: fSubErr } = await supabase
      .from('student_submissions')
      .select('*, profiles!student_submissions_student_id_fkey(name, email, reg_no)');
    console.log('Faculty subs count with join:', facSubs?.length, 'Error:', fSubErr);
    
    if (fSubErr) {
      const { data: facSubsSimple, error: fSubSimpleErr } = await supabase
        .from('student_submissions')
        .select('*');
      console.log('Faculty subs count without join:', facSubsSimple?.length, 'Error:', fSubSimpleErr);
    }
  }
}

run().catch(console.error);
