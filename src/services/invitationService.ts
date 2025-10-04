import { supabase } from '../lib/supabaseClient';

export async function processUserInvitations(userId: string, userEmail: string) {
  try {
    const { data: pendingInvitations, error: fetchError } = await supabase
      .from('invitations')
      .select('*')
      .eq('email', userEmail)
      .eq('status', 'pending');

    if (fetchError) {
      console.error('Error fetching invitations:', fetchError);
      return;
    }

    if (!pendingInvitations || pendingInvitations.length === 0) {
      return;
    }

    for (const invitation of pendingInvitations) {
      const { error: insertError } = await supabase
        .from('user_company_roles')
        .insert({
          user_id: userId,
          company_id: invitation.company_id,
          role: invitation.role,
        });

      if (insertError) {
        console.error('Error inserting user company role:', insertError);
        continue;
      }

      const { error: updateError } = await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Error updating invitation status:', updateError);
      }
    }
  } catch (err) {
    console.error('Error processing invitations:', err);
  }
}
