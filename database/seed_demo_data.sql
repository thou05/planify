-- ==============================================================================
-- PLANIFY - DEMO DATA & SUPABASE PERMISSION SETUP
-- ==============================================================================
-- Chạy script này trong Supabase Dashboard -> SQL Editor
-- Script sẽ:
-- 1. Cấp quyền truy cập bảng cho service_role và anon để Backend/Frontend query được
-- 2. Tạo tài khoản mẫu: demo@planify.io / Password123!
-- 3. Tạo Workspace, Board Kanban, List, Card, Label, Checklist hoàn chỉnh
-- ==============================================================================

-- BƯỚC 1: CẤP QUYỀN TRUY CẬP CHO SUPABASE API (Cực kỳ quan trọng)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ==============================================================================
-- BƯỚC 2: TẠO DỮ LIỆU MẪU (Sử dụng DO $$ block để tạo đồng bộ với UUID)
-- ==============================================================================
DO $$
DECLARE
    v_user_id UUID := '11111111-1111-1111-1111-111111111111';
    v_workspace_id UUID := '22222222-2222-2222-2222-222222222222';
    v_board1_id UUID := '33333333-3333-3333-3333-333333333333';
    v_board2_id UUID := '44444444-4444-4444-4444-444444444444';
    v_board_member1_id UUID := gen_random_uuid();
    v_board_member2_id UUID := gen_random_uuid();

    -- Danh sách các List
    v_list_todo UUID := gen_random_uuid();
    v_list_inprogress UUID := gen_random_uuid();
    v_list_review UUID := gen_random_uuid();
    v_list_done UUID := gen_random_uuid();

    -- Các Card
    v_card1 UUID := gen_random_uuid();
    v_card2 UUID := gen_random_uuid();
    v_card3 UUID := gen_random_uuid();
    v_card4 UUID := gen_random_uuid();
    v_card5 UUID := gen_random_uuid();
    v_card6 UUID := gen_random_uuid();

    -- Các Label
    v_label_frontend UUID := gen_random_uuid();
    v_label_backend UUID := gen_random_uuid();
    v_label_uiux UUID := gen_random_uuid();
    v_label_urgent UUID := gen_random_uuid();

    -- Checklist
    v_checklist1 UUID := gen_random_uuid();
    v_checklist2 UUID := gen_random_uuid();
BEGIN
    -- 1. TẠO USER DEMO: demo@planify.io / Password123!
    -- Mật khẩu Password123! đã hash bằng bcrypt
    INSERT INTO public.users (id, name, email, password_hash, avatar, status, created_at)
    VALUES (
        v_user_id,
        'Nguyễn Công Thắng',
        'demo@planify.io',
        '$2b$10$L3JmenCA4S8bxuFXSUVXROKsaimCF6fcG10TYHC1QlbuEd/2UWLme',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        'ACTIVE',
        NOW()
    )
    ON CONFLICT (email) DO UPDATE 
    SET password_hash = '$2b$10$L3JmenCA4S8bxuFXSUVXROKsaimCF6fcG10TYHC1QlbuEd/2UWLme',
        name = 'Nguyễn Công Thắng';

    -- 2. TẠO WORKSPACE
    INSERT INTO public.workspaces (id, name, description, owner_id, created_at)
    VALUES (
        v_workspace_id,
        'Planify Engineering & Design',
        'Không gian làm việc và phát triển hệ thống Planify Kanban chuẩn Glassmorphism 2026.',
        v_user_id,
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Gán user làm OWNER trong Workspace
    INSERT INTO public.workspace_members (id, workspace_id, user_id, role, joined_at)
    VALUES (gen_random_uuid(), v_workspace_id, v_user_id, 'OWNER', NOW())
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    -- 3. TẠO BOARDS
    -- Board 1: Kanban Sprint (Yêu thích)
    INSERT INTO public.boards (id, workspace_id, name, description, is_favorite)
    VALUES (
        v_board1_id,
        v_workspace_id,
        '🚀 Sprint 1: Phát Triển Tính Năng Sản Phẩm',
        'Quản lý công việc sprint: UI Glassmorphism, Backend NestJS, Supabase API & Realtime Kanban.',
        TRUE
    )
    ON CONFLICT (id) DO NOTHING;

    -- Board 2: Marketing & Growth
    INSERT INTO public.boards (id, workspace_id, name, description, is_favorite)
    VALUES (
        v_board2_id,
        v_workspace_id,
        '🎨 Thiết Kế Nhận Diện & Chiến Dịch Ra Mắt',
        'Lên kế hoạch thiết kế bộ tài nguyên Marketing, Landing Page và truyền thông sản phẩm.',
        FALSE
    )
    ON CONFLICT (id) DO NOTHING;

    -- Thêm Board Member
    INSERT INTO public.board_members (id, board_id, user_id, role, joined_at)
    VALUES (v_board_member1_id, v_board1_id, v_user_id, 'ADMIN', NOW())
    ON CONFLICT (board_id, user_id) DO NOTHING;

    INSERT INTO public.board_members (id, board_id, user_id, role, joined_at)
    VALUES (v_board_member2_id, v_board2_id, v_user_id, 'ADMIN', NOW())
    ON CONFLICT (board_id, user_id) DO NOTHING;

    -- 4. TẠO LABELS CHO BOARD 1
    INSERT INTO public.labels (id, board_id, name, color)
    VALUES 
        (v_label_frontend, v_board1_id, 'Frontend', '#3b82f6'),
        (v_label_backend, v_board1_id, 'Backend', '#10b981'),
        (v_label_uiux, v_board1_id, 'UI/UX Glass', '#a855f7'),
        (v_label_urgent, v_board1_id, 'Gấp (Urgent)', '#ef4444')
    ON CONFLICT (board_id, name) DO NOTHING;

    -- 5. TẠO 4 DANH SÁCH (LISTS) CHO BOARD 1
    INSERT INTO public.lists (id, board_id, title, position, "limit")
    VALUES 
        (v_list_todo, v_board1_id, 'Cần Làm (Backlog)', 0, NULL),
        (v_list_inprogress, v_board1_id, 'Đang Thực Hiện', 1, 3),
        (v_list_review, v_board1_id, 'Review & Kiểm Thử', 2, NULL),
        (v_list_done, v_board1_id, 'Đã Hoàn Thành', 3, NULL)
    ON CONFLICT (id) DO NOTHING;

    -- 6. TẠO CARDS TRONG CÁC LIST
    -- List Todo:
    INSERT INTO public.cards (id, list_id, title, description, position, status, start_date, due_date, is_due_date_completed, created_by)
    VALUES (
        v_card1,
        v_list_todo,
        'Tích hợp thông báo Realtime với Supabase Channels',
        'Đăng ký các sự kiện broadcast khi có thẻ được di chuyển hoặc cập nhật để hiển thị ngay lập tức cho các thành viên trong board.',
        0,
        'TODO',
        NOW(),
        NOW() + INTERVAL '5 days',
        FALSE,
        v_user_id
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.cards (id, list_id, title, description, position, status, start_date, due_date, is_due_date_completed, created_by)
    VALUES (
        v_card2,
        v_list_todo,
        'Xây dựng bộ Custom Fields động cho Card',
        'Cho phép người dùng bổ sung các trường tùy biến như Chi phí (Currency), Deadline phụ và Thẻ phân loại riêng.',
        1,
        'TODO',
        NOW(),
        NOW() + INTERVAL '7 days',
        FALSE,
        v_user_id
    ) ON CONFLICT (id) DO NOTHING;

    -- List In Progress:
    INSERT INTO public.cards (id, list_id, title, description, position, status, start_date, due_date, is_due_date_completed, created_by)
    VALUES (
        v_card3,
        v_list_inprogress,
        'Hoàn thiện kéo thả Kanban Card bằng @dnd-kit',
        'Tối ưu cảm giác kéo thả mượt mà trên chuẩn Glassmorphism 2026, hỗ trợ reorder trong list và di chuyển giữa các cột.',
        0,
        'IN_PROGRESS',
        NOW() - INTERVAL '1 days',
        NOW() + INTERVAL '2 days',
        FALSE,
        v_user_id
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.cards (id, list_id, title, description, position, status, start_date, due_date, is_due_date_completed, created_by)
    VALUES (
        v_card4,
        v_list_inprogress,
        'Thiết kế Card Detail Modal với Checklist & Bình luận',
        'Giao diện Frosted Glass cực kỳ hiện đại với tab hoạt động, checklist tương tác và đính kèm tệp.',
        1,
        'IN_PROGRESS',
        NOW() - INTERVAL '2 days',
        NOW() + INTERVAL '3 days',
        FALSE,
        v_user_id
    ) ON CONFLICT (id) DO NOTHING;

    -- List Review:
    INSERT INTO public.cards (id, list_id, title, description, position, status, start_date, due_date, is_due_date_completed, created_by)
    VALUES (
        v_card5,
        v_list_review,
        'Thiết kế Design System Glassmorphism chuẩn Deep Purple',
        'Tạo hệ thống token CSS sắc thái Deep Purple, Sky Glass, Frosted surfaces và Backdrop Blur theo đúng DESIGN_SYSTEM.md.',
        0,
        'REVIEW',
        NOW() - INTERVAL '3 days',
        NOW() + INTERVAL '1 days',
        FALSE,
        v_user_id
    ) ON CONFLICT (id) DO NOTHING;

    -- List Done:
    INSERT INTO public.cards (id, list_id, title, description, position, status, start_date, due_date, is_due_date_completed, created_by)
    VALUES (
        v_card6,
        v_list_done,
        'Khởi tạo Backend NestJS & Tích hợp Supabase SDK',
        'Bảo mật các biến môi trường qua .env, cấu hình kết nối an toàn qua SUPABASE_SERVICE_ROLE_KEY và WebSocket polyfill.',
        0,
        'DONE',
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '1 days',
        TRUE,
        v_user_id
    ) ON CONFLICT (id) DO NOTHING;

    -- 7. GÁN LABEL CHO CARDS
    INSERT INTO public.card_labels (id, card_id, label_id)
    VALUES 
        (gen_random_uuid(), v_card3, v_label_frontend),
        (gen_random_uuid(), v_card3, v_label_urgent),
        (gen_random_uuid(), v_card4, v_label_uiux),
        (gen_random_uuid(), v_card5, v_label_uiux),
        (gen_random_uuid(), v_card6, v_label_backend)
    ON CONFLICT DO NOTHING;

    -- 8. TẠO CHECKLIST & CHECKLIST ITEMS CHO CARD 3 (Kéo thả Kanban)
    INSERT INTO public.checklists (id, card_id, title, position)
    VALUES (v_checklist1, v_card3, 'Tiến độ tính năng kéo thả', 0)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.checklist_items (id, checklist_id, content, is_completed, position)
    VALUES 
        (gen_random_uuid(), v_checklist1, 'Cài đặt @dnd-kit/core và @dnd-kit/sortable', TRUE, 0),
        (gen_random_uuid(), v_checklist1, 'Xử lý kéo thả reorder trong cùng 1 cột', TRUE, 1),
        (gen_random_uuid(), v_checklist1, 'Xử lý di chuyển card sang cột khác', FALSE, 2),
        (gen_random_uuid(), v_checklist1, 'Lưu vị trí position mới vào Supabase', FALSE, 3)
    ON CONFLICT (id) DO NOTHING;

    -- 9. TẠO CHECKLIST CHO CARD 5 (Glassmorphism)
    INSERT INTO public.checklists (id, card_id, title, position)
    VALUES (v_checklist2, v_card5, 'Kiểm tra chuẩn thiết kế', 0)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.checklist_items (id, checklist_id, content, is_completed, position)
    VALUES 
        (gen_random_uuid(), v_checklist2, 'Bảng màu Deep Purple #2b1572 & Sky Glass #a6d1fd', TRUE, 0),
        (gen_random_uuid(), v_checklist2, 'Hiệu ứng Frosted Glass & viền vi điểm border-white/10', TRUE, 1),
        (gen_random_uuid(), v_checklist2, 'Tương thích giao diện Responsive Desktop & Tablet', TRUE, 2)
    ON CONFLICT (id) DO NOTHING;

END $$;
