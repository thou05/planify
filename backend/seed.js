global.WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');

const env = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: require('ws') },
});

async function runSeed() {
  console.log('🌱 Đang kiểm tra kết nối tới Supabase:', supabaseUrl);

  const passwordHash = await bcrypt.hash('Password123!', 10);
  const demoEmail = 'demo@planify.io';

  // 1. Check or Insert User
  let { data: user, error: userErr } = await supabase
    .from('users')
    .select('*')
    .eq('email', demoEmail)
    .maybeSingle();

  if (userErr) {
    console.error('❌ Lỗi truy vấn bảng users:', userErr);
    console.log(
      '\n👉 Lưu ý quan trọng: Vui lòng mở Supabase SQL Editor và chạy nội dung file database/seed_demo_data.sql để cấp quyền truy cập bảng cho service_role/anon và tạo dữ liệu mẫu!',
    );
    return;
  }

  if (!user) {
    console.log('👤 Đang tạo tài khoản demo: demo@planify.io...');
    const { data: newUser, error: createErr } = await supabase
      .from('users')
      .insert({
        name: 'Nguyễn Công Thắng',
        email: demoEmail,
        password_hash: passwordHash,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (createErr) {
      console.error('❌ Lỗi tạo user:', createErr.message);
      return;
    }
    user = newUser;
  }

  console.log('✅ User Demo ID:', user.id);

  // 2. Check or Insert Workspace
  let { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!workspace) {
    console.log('🏢 Đang tạo Workspace...');
    const { data: newWs } = await supabase
      .from('workspaces')
      .insert({
        name: 'Planify Engineering & Design',
        description: 'Không gian làm việc và phát triển hệ thống Planify Kanban chuẩn Glassmorphism 2026.',
        owner_id: user.id,
      })
      .select()
      .single();

    workspace = newWs;
    await supabase.from('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'OWNER',
    });
  }

  console.log('✅ Workspace ID:', workspace.id);

  // 3. Check or Insert Board
  let { data: board } = await supabase
    .from('boards')
    .select('*')
    .eq('workspace_id', workspace.id)
    .maybeSingle();

  if (!board) {
    console.log('📋 Đang tạo Kanban Board...');
    const { data: newBoard } = await supabase
      .from('boards')
      .insert({
        workspace_id: workspace.id,
        name: '🚀 Sprint 1: Phát Triển Tính Năng Sản Phẩm',
        description: 'Quản lý công việc sprint: UI Glassmorphism, Backend NestJS, Supabase API & Realtime Kanban.',
        is_favorite: true,
      })
      .select()
      .single();

    board = newBoard;
    await supabase.from('board_members').insert({
      board_id: board.id,
      user_id: user.id,
      role: 'ADMIN',
    });

    // Tạo các List
    console.log('📑 Đang tạo các cột Kanban (Lists)...');
    const { data: lists } = await supabase
      .from('lists')
      .insert([
        { board_id: board.id, title: 'Cần Làm (Backlog)', position: 0 },
        { board_id: board.id, title: 'Đang Thực Hiện', position: 1, limit: 3 },
        { board_id: board.id, title: 'Review & Kiểm Thử', position: 2 },
        { board_id: board.id, title: 'Đã Hoàn Thành', position: 3 },
      ])
      .select();

    if (lists && lists.length > 0) {
      const todoList = lists.find((l) => l.title.includes('Cần Làm'));
      const inprogList = lists.find((l) => l.title.includes('Đang'));
      const reviewList = lists.find((l) => l.title.includes('Review'));
      const doneList = lists.find((l) => l.title.includes('Hoàn Thành'));

      // Tạo các Card
      console.log('🃏 Đang tạo các thẻ công việc (Cards)...');
      await supabase.from('cards').insert([
        {
          list_id: todoList ? todoList.id : lists[0].id,
          title: 'Tích hợp thông báo Realtime với Supabase Channels',
          description: 'Đăng ký các sự kiện broadcast khi có thẻ được di chuyển.',
          position: 0,
          status: 'TODO',
          created_by: user.id,
        },
        {
          list_id: inprogList ? inprogList.id : lists[1].id,
          title: 'Hoàn thiện kéo thả Kanban Card bằng @dnd-kit',
          description: 'Tối ưu kéo thả mượt mà trên chuẩn Glassmorphism 2026.',
          position: 0,
          status: 'IN_PROGRESS',
          created_by: user.id,
        },
        {
          list_id: reviewList ? reviewList.id : lists[2].id,
          title: 'Thiết kế Design System Glassmorphism chuẩn Deep Purple',
          description: 'Tạo hệ thống token CSS Deep Purple, Sky Glass, Frosted surfaces.',
          position: 0,
          status: 'REVIEW',
          created_by: user.id,
        },
        {
          list_id: doneList ? doneList.id : lists[3].id,
          title: 'Khởi tạo Backend NestJS & Tích hợp Supabase SDK',
          description: 'Bảo mật các biến môi trường qua .env, kết nối an toàn qua SUPABASE_SERVICE_ROLE_KEY.',
          position: 0,
          status: 'DONE',
          created_by: user.id,
          is_due_date_completed: true,
        },
      ]);
    }
  }

  console.log('🎉 KHỞI TẠO DỮ LIỆU MẪU THÀNH CÔNG!');
  console.log('-------------------------------------------');
  console.log('👉 Email đăng nhập : demo@planify.io');
  console.log('👉 Mật khẩu        : Password123!');
  console.log('👉 Workspace ID    :', workspace.id);
  console.log('👉 Board ID        :', board.id);
  console.log('-------------------------------------------');
}

runSeed().catch(console.error);
