-- ==============================================================================
-- PLANIFY - MIGRATION TEMPLATES EXPANSION (FR22, UC-TEMPLATE)
-- ==============================================================================
-- 1. Bảng public.templates:
--    - Lưu trữ danh mục mẫu bảng Kanban chuyên nghiệp sẵn sàng sử dụng
--    - Hỗ trợ lưu trữ cấu trúc lists, cards, checklists, labels
-- 2. Dữ liệu mẫu khởi tạo (Seed Templates):
--    - Hiệu suất (Productivity)
--    - Quản lý dự án (Project Management)
--    - Kỹ thuật & Phát triển phần mềm (Engineering)
--    - Thiết kế & Sáng tạo (Design)
--    - Marketing & Nội dung (Marketing)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title VARCHAR(200) NOT NULL,

    description TEXT NULL,

    category VARCHAR(50) NOT NULL DEFAULT 'productivity',

    background VARCHAR(100) NULL DEFAULT '#2b1572',

    author_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,

    author_name VARCHAR(100) NOT NULL DEFAULT 'Planify Team',

    is_public BOOLEAN NOT NULL DEFAULT TRUE,

    usage_count INTEGER NOT NULL DEFAULT 0,

    view_count INTEGER NOT NULL DEFAULT 0,

    structure JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.templates IS
'Thư viện mẫu Bảng Kanban cho các quy trình làm việc chuẩn.';

COMMENT ON COLUMN public.templates.title IS 'Tên của mẫu Template.';
COMMENT ON COLUMN public.templates.description IS 'Mô tả chi tiết và hướng dẫn áp dụng mẫu.';
COMMENT ON COLUMN public.templates.category IS 'Danh mục: productivity, project-management, engineering, design, marketing, hr-operations, personal, remote-work, sales, support, team-management.';
COMMENT ON COLUMN public.templates.background IS 'Màu sắc hoặc gradient phông nền của Board khi tạo từ mẫu.';
COMMENT ON COLUMN public.templates.structure IS 'Cấu trúc JSON chứa danh sách Lists, Cards, Checklists và Labels của mẫu.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON public.templates(is_public);
CREATE INDEX IF NOT EXISTS idx_templates_author ON public.templates(author_id);
CREATE INDEX IF NOT EXISTS idx_templates_usage ON public.templates(usage_count DESC);

-- Quyền truy cập Supabase
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- ==============================================================================
-- SEED DATA: CÁC MẪU CHUẨN CỦA HỆ THỐNG
-- ==============================================================================

INSERT INTO public.templates (title, description, category, background, author_name, is_public, usage_count, view_count, structure)
VALUES
(
    'My Tasks | Quản lý công việc cá nhân',
    'Theo dõi các công việc, hạn chót và những việc bạn cần hoàn thành — hôm nay, ngày mai hoặc bất kỳ lúc nào. Mẫu này cung cấp quy trình phân loại rõ ràng giúp tối ưu hóa hiệu suất làm việc mỗi ngày.',
    'productivity',
    'linear-gradient(135deg, #2b1572 0%, #1e0854 100%)',
    'Planify Team',
    TRUE,
    28,
    145,
    '{
        "lists": [
            {
                "title": "Bắt đầu (Getting Started)",
                "position": 0,
                "cards": [
                    {
                        "title": "Chào mừng bạn đến với Planify Tasks 👋",
                        "description": "Thêm tất cả các nhiệm vụ cần làm vào đây. Kéo thả thẻ sang các cột tương ứng khi bạn bắt đầu thực hiện.",
                        "position": 0,
                        "checklists": [
                            {"title": "Các bước cơ bản", "items": [{"title": "Tạo thẻ công việc đầu tiên", "is_completed": true}, {"title": "Gán nhãn ưu tiên", "is_completed": false}, {"title": "Đặt thời hạn hoàn thành", "is_completed": false}]}
                        ]
                    },
                    {
                        "title": "Lưu các ý tưởng và ghi chú nhanh 💡",
                        "description": "Ghi chú nhanh các ý tưởng nảy sinh trong ngày để không bị quên.",
                        "position": 1,
                        "checklists": []
                    }
                ]
            },
            {
                "title": "Cần làm hôm nay (To-Do Today)",
                "position": 1,
                "cards": [
                    {
                        "title": "Xem xét email và tin nhắn quan trọng",
                        "description": "Phản hồi các thông tin khẩn cấp vào đầu buổi sáng.",
                        "position": 0,
                        "checklists": []
                    },
                    {
                        "title": "Hoàn thiện báo cáo tiến độ tuần",
                        "description": "Tổng kết kết quả đạt được và các vướng mắc cần tháo gỡ.",
                        "position": 1,
                        "checklists": [
                            {"title": "Mục tiêu", "items": [{"title": "Thu thập số liệu", "is_completed": true}, {"title": "Viết tóm tắt", "is_completed": false}]}
                        ]
                    }
                ]
            },
            {
                "title": "Đang thực hiện (In Progress)",
                "position": 2,
                "cards": [
                    {
                        "title": "Chuẩn bị tài liệu thuyết trình khách hàng",
                        "description": "Thiết kế slide và chuẩn bị kịch bản demo sản phẩm.",
                        "position": 0,
                        "checklists": []
                    }
                ]
            },
            {
                "title": "Đã hoàn thành (Done 🎉)",
                "position": 3,
                "cards": [
                    {
                        "title": "Đăng ký tài khoản Planify",
                        "description": "Bắt đầu làm việc với hệ thống quản lý công việc thế hệ mới.",
                        "position": 0,
                        "checklists": []
                    }
                ]
            }
        ]
    }'::jsonb
),
(
    'Kanban Agile Sprint | Kỹ thuật phần mềm',
    'Mẫu quy trình phát triển phần mềm chuẩn Agile/Scrum: từ Backlog, Sprint Planning, In Development, Code Review, Testing đến Production Deployment.',
    'engineering',
    'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    'Planify Engineering',
    TRUE,
    42,
    310,
    '{
        "lists": [
            {
                "title": "Product Backlog",
                "position": 0,
                "cards": [
                    {
                        "title": "[Feature] Tích hợp đăng nhập bằng Google OAuth",
                        "description": "Người dùng có thể đăng nhập 1-click qua tài khoản Google.",
                        "position": 0,
                        "checklists": [
                            {"title": "Acceptance Criteria", "items": [{"title": "Cấu hình Google Console", "is_completed": false}, {"title": "Xử lý JWT token ở Backend", "is_completed": false}, {"title": "Nút bấm đăng nhập ở Frontend", "is_completed": false}]}
                        ]
                    }
                ]
            },
            {
                "title": "Sprint Backlog",
                "position": 1,
                "cards": [
                    {
                        "title": "[API] Tối ưu hóa truy vấn danh sách thẻ Kanban",
                        "description": "Bổ sung indexing cho board_id và list_id để tăng tốc độ load trang.",
                        "position": 0,
                        "checklists": []
                    }
                ]
            },
            {
                "title": "In Development 💻",
                "position": 2,
                "cards": [
                    {
                        "title": "[UI] Hoàn thiện giao diện Thư viện Template",
                        "description": "Xây dựng trang xem chi tiết mẫu và chức năng tạo Board từ mẫu.",
                        "position": 0,
                        "checklists": []
                    }
                ]
            },
            {
                "title": "Code Review 🔍",
                "position": 3,
                "cards": [
                    {
                        "title": "PR #12: Thêm xác thực lời mời qua token",
                        "description": "Kiểm tra mã nguồn và chạy tự động test suites.",
                        "position": 0,
                        "checklists": []
                    }
                ]
            },
            {
                "title": "QA / Testing 🧪",
                "position": 4,
                "cards": []
            },
            {
                "title": "Released to Prod 🚀",
                "position": 5,
                "cards": [
                    {
                        "title": "Triển khai v1.0 Planify Core",
                        "description": "Đưa phiên bản đầu tiên lên môi trường sản xuất.",
                        "position": 0,
                        "checklists": []
                    }
                ]
            }
        ]
    }'::jsonb
),
(
    'Thiết kế UI/UX & Design Sprint',
    'Quy trình quản lý các yêu cầu thiết kế từ nghiên cứu người dùng (User Research), Wireframe, Thiết kế Figma, Design Review đến Bàn giao cho lập trình viên (Dev Handoff).',
    'design',
    'linear-gradient(135deg, #a000c8 0%, #4a00e0 100%)',
    'Planify Design Team',
    TRUE,
    19,
    188,
    '{
        "lists": [
            {
                "title": "Ý tưởng & Nghiên cứu (Research)",
                "position": 0,
                "cards": [
                    {
                        "title": "Khảo sát trải nghiệm người dùng về Kanban Board",
                        "description": "Phỏng vấn 5 người dùng mục tiêu để tìm hiểu điểm nghẽn thao tác kéo thả.",
                        "position": 0,
                        "checklists": []
                    }
                ]
            },
            {
                "title": "Wireframing & Prototyping",
                "position": 1,
                "cards": [
                    {
                        "title": "Phác thảo layout trang Thư viện Template",
                        "description": "Bao gồm danh mục bên trái, lưới thẻ mẫu và màn hình xem trước.",
                        "position": 0,
                        "checklists": []
                    }
                ]
            },
            {
                "title": "Thiết kế chi tiết (UI Design)",
                "position": 2,
                "cards": [
                    {
                        "title": "Bổ sung hiệu ứng Glassmorphism cho Modal Preview",
                        "description": "Áp dụng bảng màu Deep Purple và Sky Glass chuẩn Design System.",
                        "position": 0,
                        "checklists": []
                    }
                ]
            },
            {
                "title": "Sẵn sàng bàn giao (Ready for Dev)",
                "position": 3,
                "cards": [
                    {
                        "title": "Design System Tokens v1.2",
                        "description": "Xuất mã màu, kích thước font và icons để FE tích hợp.",
                        "position": 0,
                        "checklists": []
                    }
                ]
            }
        ]
    }'::jsonb
),
(
    'Kế hoạch Marketing & Content Calendar',
    'Mẫu lập lịch và quản lý nội dung đa kênh: từ Lên ý tưởng, Soạn thảo, Thiết kế đồ họa, Đăng bài và Đánh giá hiệu quả chiến dịch.',
    'marketing',
    'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
    'Growth & Marketing Hub',
    TRUE,
    35,
    260,
    '{
        "lists": [
            {
                "title": "Kho ý tưởng (Content Backlog)",
                "position": 0,
                "cards": [
                    {
                        "title": "Bài viết: 5 mẹo quản lý công việc hiệu quả với Kanban",
                        "description": "Chia sẻ kinh nghiệm tối ưu năng suất cá nhân và làm việc nhóm.",
                        "position": 0,
                        "checklists": []
                    }
                ]
            },
            {
                "title": "Đang soạn thảo & Thiết kế",
                "position": 1,
                "cards": [
                    {
                        "title": "Infographic: So sánh quy trình Scrum và Kanban",
                        "description": "Thiết kế đồ họa trực quan đăng trên Facebook và LinkedIn.",
                        "position": 0,
                        "checklists": []
                    }
                ]
            },
            {
                "title": "Chờ duyệt (Review & Approval)",
                "position": 2,
                "cards": []
            },
            {
                "title": "Lên lịch đăng bài (Scheduled)",
                "position": 3,
                "cards": [
                    {
                        "title": "Thông báo tính năng Thư viện Mẫu mới",
                        "description": "Gửi email newsletter tới danh sách người dùng đăng ký.",
                        "position": 0,
                        "checklists": []
                    }
                ]
            },
            {
                "title": "Đã xuất bản (Published 📢)",
                "position": 4,
                "cards": []
            }
        ]
    }'::jsonb
),
(
    'Quy trình Tuyển dụng & Onboarding nhân viên mới',
    'Theo dõi ứng viên từ nộp hồ sơ, phỏng vấn vòng 1, bài test kỹ thuật, phỏng vấn chuyên sâu, gửi offer và quy trình đón tiếp nhân viên mới.',
    'hr-operations',
    'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    'HR & People Team',
    TRUE,
    15,
    120,
    '{
        "lists": [
            {
                "title": "Hồ sơ mới nhận (New Applicants)",
                "position": 0,
                "cards": [
                    {
                        "title": "Ứng viên: Frontend Developer (React/Next.js)",
                        "description": "3 năm kinh nghiệm, kỹ năng tốt về TypeScript và Tailwind/CSS.",
                        "position": 0,
                        "checklists": []
                    }
                ]
            },
            {
                "title": "Sàng lọc & Phỏng vấn sơ bộ",
                "position": 1,
                "cards": []
            },
            {
                "title": "Bài kiểm tra kỹ thuật (Take-home Test)",
                "position": 2,
                "cards": []
            },
            {
                "title": "Đã gửi Offer",
                "position": 3,
                "cards": []
            },
            {
                "title": "Chào đón nhân viên mới (Onboarding)",
                "position": 4,
                "cards": [
                    {
                        "title": "Checklist chào đón tuần đầu tiên",
                        "description": "Cấp phát máy tính, tài khoản email, giới thiệu văn hóa công ty.",
                        "position": 0,
                        "checklists": [
                            {"title": "Ngày đầu tiên", "items": [{"title": "Cài đặt môi trường làm việc", "is_completed": true}, {"title": "Gặp gỡ Buddy hỗ trợ", "is_completed": false}]}
                        ]
                    }
                ]
            }
        ]
    }'::jsonb
);
