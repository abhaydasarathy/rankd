const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
const envVars = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(l => l.trim().split('=')));

async function runE2E() {
  console.log('========================================================');
  console.log('1. FACULTY AUTHENTICATION & PENDING QUEUE TEST');
  console.log('========================================================');

  const facultyClient = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);
  const { data: facAuth, error: facErr } = await facultyClient.auth.signInWithPassword({
    email: 'faculty.coordinator@srmist.edu.in',
    password: 'password1234',
  });
  if (facErr) throw new Error('Faculty sign in failed: ' + facErr.message);
  console.log('✓ Faculty signed in:', facAuth.user.email, 'ID:', facAuth.user.id);

  // 1. Fetch pending submissions via faculty client
  const { data: allSubs, error: subErr } = await facultyClient
    .from('student_submissions')
    .select('*, profiles!student_submissions_student_id_fkey (id, name, full_name, email, reg_no, department, section, cgpa)')
    .order('created_at', { ascending: false });

  if (subErr) throw new Error('Faculty query error: ' + subErr.message);
  console.log(`✓ Faculty fetched all submissions: ${allSubs.length} total rows`);

  const pendingSubs = allSubs.filter(s => (s.status || '').toUpperCase() === 'PENDING');
  console.log(`✓ Faculty pending queue has ${pendingSubs.length} pending submissions`);
  if (pendingSubs.length === 0) {
    console.log('Notice: No pending submissions found to verify.');
    return;
  }

  // Pick the first pending submission (e.g. github or coding)
  const targetSub = pendingSubs[0];
  console.log(`Target submission to verify: [${targetSub.id}] "${targetSub.title}" in category "${targetSub.category_id}"`);

  console.log('\n========================================================');
  console.log('2. FACULTY VERIFIES AND AWARDS MARKS');
  console.log('========================================================');

  const awardMarks = targetSub.details?.calculated_marks || 8;
  const verifierNotes = 'Approved according to SRMIST Placement Rubric verification.';

  const { data: updatedRows, error: updateErr } = await facultyClient
    .from('student_submissions')
    .update({
      status: 'VERIFIED',
      awarded_marks: awardMarks,
      verifier_notes: verifierNotes,
      verifier_id: facAuth.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetSub.id)
    .select();

  if (updateErr) throw new Error('Verify update error: ' + updateErr.message);
  console.log('✓ Update succeeded in Supabase!');
  console.log('Verified row:', {
    id: updatedRows[0].id,
    status: updatedRows[0].status,
    awarded_marks: updatedRows[0].awarded_marks,
    verifier_id: updatedRows[0].verifier_id,
    verifier_notes: updatedRows[0].verifier_notes,
    updated_at: updatedRows[0].updated_at
  });

  console.log('\n========================================================');
  console.log('3. STUDENT PERSISTENCE CHECK');
  console.log('========================================================');

  const studentClient = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);
  const { data: stAuth, error: stErr } = await studentClient.auth.signInWithPassword({
    email: 'ar2461@srmist.edu.in',
    password: 'password1234',
  });
  if (stErr) throw new Error('Student sign in failed: ' + stErr.message);
  console.log('✓ Student signed in:', stAuth.user.email);

  // Student fetches their submissions
  const { data: studentSubs, error: stSubErr } = await studentClient
    .from('student_submissions')
    .select('*')
    .eq('student_id', stAuth.user.id)
    .order('created_at', { ascending: false });

  if (stSubErr) throw new Error('Student query error: ' + stSubErr.message);

  const updatedInStudentView = studentSubs.find(s => s.id === targetSub.id);
  console.log('✓ Fetched submission on student side:');
  console.log({
    id: updatedInStudentView.id,
    title: updatedInStudentView.title,
    status: updatedInStudentView.status,
    awarded_marks: updatedInStudentView.awarded_marks,
    verifier_notes: updatedInStudentView.verifier_notes,
    verifier_id: updatedInStudentView.verifier_id
  });

  if (updatedInStudentView.status !== 'VERIFIED') {
    throw new Error('Expected status to be VERIFIED, got ' + updatedInStudentView.status);
  }
  if (Number(updatedInStudentView.awarded_marks) !== awardMarks) {
    throw new Error(`Expected awarded_marks to be ${awardMarks}, got ${updatedInStudentView.awarded_marks}`);
  }

  console.log('\n========================================================');
  console.log('ALL TESTS PASSED! VERIFICATION PERMANENTLY PERSISTS IN DB!');
  console.log('========================================================');
}

runE2E().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
