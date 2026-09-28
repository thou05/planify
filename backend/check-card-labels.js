const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function checkCardWithLabels() {
  const { data: user } = await supabase.from('users').select('id').limit(1).single();
  const { data: ws } = await supabase.from('workspaces').select('id').limit(1).single();
  const { data: newBoard } = await supabase.from('boards').insert({
    workspace_id: ws.id,
    name: 'Test Board'
  }).select().single();

  const { data: createdLabel } = await supabase.from('labels').insert({
    board_id: newBoard.id,
    name: 'Frontend',
    color: '#3b82f6'
  }).select().single();

  const { data: newList } = await supabase.from('lists').insert({
    board_id: newBoard.id,
    title: 'To Do',
    position: 1
  }).select().single();

  // Test insert into cards with created_by
  const { data: newCard, error: cErr } = await supabase.from('cards').insert({
    list_id: newList.id,
    title: 'Card with label',
    position: 1,
    created_by: user.id
  }).select().single();

  console.log('Card insert result:', newCard?.id, 'error:', cErr);

  const { data: newCl, error: clErr } = await supabase.from('card_labels').insert({
    card_id: newCard.id,
    label_id: createdLabel.id
  }).select();

  console.log('card_labels insert result:', newCl, 'error:', clErr);

  // Now query board details like boards.service.ts findById
  const { data: boardWithCards } = await supabase.from('boards').select(`
    id,
    lists (
      id,
      cards (
        id,
        title,
        card_labels (
          label:labels (id, name, color)
        )
      )
    ),
    labels (id, name, color)
  `).eq('id', newBoard.id).single();

  console.log('Full board query result:', JSON.stringify(boardWithCards, null, 2));

  await supabase.from('boards').delete().eq('id', newBoard.id);
}

checkCardWithLabels().catch(console.error);
