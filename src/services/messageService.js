import { supabase } from '../lib/supabaseClient';

export async function getStudentMessages(studentId) {
  if (!studentId) return [];

  const { data, error } = await supabase
    .from('student_messages')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getStudentMessages error:', error);
    throw error;
  }
  return data || [];
}

export async function markMessageRead(messageId) {
  if (!messageId) return;

  const { error } = await supabase
    .from('student_messages')
    .update({ is_read: true })
    .eq('id', messageId);

  if (error) {
    console.warn('markMessageRead error:', error);
  }
}

export async function markAllMessagesRead(studentId) {
  if (!studentId) return;

  const { error } = await supabase
    .from('student_messages')
    .update({ is_read: true })
    .eq('student_id', studentId)
    .eq('is_read', false);

  if (error) {
    console.warn('markAllMessagesRead error:', error);
  }
}

export async function getUnreadCount(studentId) {
  if (!studentId) return 0;

  const { count, error } = await supabase
    .from('student_messages')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('is_read', false);

  if (error) {
    console.warn('getUnreadCount error:', error);
    return 0;
  }
  return count || 0;
}
