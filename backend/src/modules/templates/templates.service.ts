import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { ActivitiesService } from '../activities/activities.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { CreateBoardFromTemplateDto } from './dto/create-board-from-template.dto';
import { CreateTemplateFromBoardDto } from './dto/create-template-from-board.dto';

// Mẫu tích hợp sẵn dự phòng (Built-in Fallback Seed Templates)
const BUILT_IN_TEMPLATES = [
  {
    id: 'tpl-productivity-tasks',
    title: 'My Tasks | Quản lý công việc cá nhân',
    description:
      'Theo dõi các công việc, hạn chót và những việc bạn cần hoàn thành — hôm nay, ngày mai hoặc bất kỳ lúc nào. Mẫu này cung cấp quy trình phân loại rõ ràng giúp tối ưu hóa hiệu suất làm việc mỗi ngày.',
    category: 'productivity',
    background: 'linear-gradient(135deg, #2b1572 0%, #1e0854 100%)',
    author_name: 'Planify Team',
    is_public: true,
    usage_count: 28,
    view_count: 145,
    structure: {
      lists: [
        {
          title: 'Bắt đầu (Getting Started)',
          position: 0,
          cards: [
            {
              title: 'Chào mừng bạn đến với Planify Tasks 👋',
              description: 'Thêm tất cả các nhiệm vụ cần làm vào đây. Kéo thả thẻ sang các cột tương ứng khi bạn bắt đầu thực hiện.',
              position: 0,
              checklists: [
                {
                  title: 'Các bước cơ bản',
                  items: [
                    { title: 'Tạo thẻ công việc đầu tiên', is_completed: true },
                    { title: 'Gán nhãn ưu tiên', is_completed: false },
                    { title: 'Đặt thời hạn hoàn thành', is_completed: false },
                  ],
                },
              ],
            },
            {
              title: 'Lưu các ý tưởng và ghi chú nhanh 💡',
              description: 'Ghi chú nhanh các ý tưởng nảy sinh trong ngày để không bị quên.',
              position: 1,
              checklists: [],
            },
          ],
        },
        {
          title: 'Cần làm hôm nay (To-Do Today)',
          position: 1,
          cards: [
            {
              title: 'Xem xét email và tin nhắn quan trọng',
              description: 'Phản hồi các thông tin khẩn cấp vào đầu buổi sáng.',
              position: 0,
              checklists: [],
            },
            {
              title: 'Hoàn thiện báo cáo tiến độ tuần',
              description: 'Tổng kết kết quả đạt được và các vướng mắc cần tháo gỡ.',
              position: 1,
              checklists: [
                {
                  title: 'Mục tiêu',
                  items: [
                    { title: 'Thu thập số liệu', is_completed: true },
                    { title: 'Viết tóm tắt', is_completed: false },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Đang thực hiện (In Progress)',
          position: 2,
          cards: [
            {
              title: 'Chuẩn bị tài liệu thuyết trình khách hàng',
              description: 'Thiết kế slide và chuẩn bị kịch bản demo sản phẩm.',
              position: 0,
              checklists: [],
            },
          ],
        },
        {
          title: 'Đã hoàn thành (Done 🎉)',
          position: 3,
          cards: [
            {
              title: 'Đăng ký tài khoản Planify',
              description: 'Bắt đầu làm việc với hệ thống quản lý công việc thế hệ mới.',
              position: 0,
              checklists: [],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'tpl-engineering-agile',
    title: 'Kanban Agile Sprint | Kỹ thuật phần mềm',
    description:
      'Mẫu quy trình phát triển phần mềm chuẩn Agile/Scrum: từ Backlog, Sprint Planning, In Development, Code Review, Testing đến Production Deployment.',
    category: 'engineering',
    background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    author_name: 'Planify Engineering',
    is_public: true,
    usage_count: 42,
    view_count: 310,
    structure: {
      lists: [
        {
          title: 'Product Backlog',
          position: 0,
          cards: [
            {
              title: '[Feature] Tích hợp đăng nhập bằng Google OAuth',
              description: 'Người dùng có thể đăng nhập 1-click qua tài khoản Google.',
              position: 0,
              checklists: [
                {
                  title: 'Tiêu chí nghiệm thu (AC)',
                  items: [
                    { title: 'Cấu hình Google Console', is_completed: false },
                    { title: 'Xử lý JWT token ở Backend', is_completed: false },
                    { title: 'Nút bấm đăng nhập ở Frontend', is_completed: false },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Sprint Backlog',
          position: 1,
          cards: [
            {
              title: '[API] Tối ưu hóa truy vấn danh sách thẻ Kanban',
              description: 'Bổ sung indexing cho board_id và list_id để tăng tốc độ load trang.',
              position: 0,
              checklists: [],
            },
          ],
        },
        {
          title: 'In Development 💻',
          position: 2,
          cards: [
            {
              title: '[UI] Hoàn thiện giao diện Thư viện Template',
              description: 'Xây dựng trang xem chi tiết mẫu và chức năng tạo Board từ mẫu.',
              position: 0,
              checklists: [],
            },
          ],
        },
        {
          title: 'Code Review 🔍',
          position: 3,
          cards: [
            {
              title: 'PR #12: Thêm xác thực lời mời qua token',
              description: 'Kiểm tra mã nguồn và chạy tự động test suites.',
              position: 0,
              checklists: [],
            },
          ],
        },
        {
          title: 'QA / Testing 🧪',
          position: 4,
          cards: [],
        },
        {
          title: 'Released to Prod 🚀',
          position: 5,
          cards: [
            {
              title: 'Triển khai v1.0 Planify Core',
              description: 'Đưa phiên bản đầu tiên lên môi trường sản xuất.',
              position: 0,
              checklists: [],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'tpl-design-sprint',
    title: 'Thiết kế UI/UX & Design Sprint',
    description:
      'Quy trình quản lý các yêu cầu thiết kế từ nghiên cứu người dùng (User Research), Wireframe, Thiết kế Figma, Design Review đến Bàn giao cho lập trình viên (Dev Handoff).',
    category: 'design',
    background: 'linear-gradient(135deg, #a000c8 0%, #4a00e0 100%)',
    author_name: 'Planify Design Team',
    is_public: true,
    usage_count: 19,
    view_count: 188,
    structure: {
      lists: [
        {
          title: 'Ý tưởng & Nghiên cứu (Research)',
          position: 0,
          cards: [
            {
              title: 'Khảo sát trải nghiệm người dùng về Kanban Board',
              description: 'Phỏng vấn 5 người dùng mục tiêu để tìm hiểu điểm nghẽn thao tác kéo thả.',
              position: 0,
              checklists: [],
            },
          ],
        },
        {
          title: 'Wireframing & Prototyping',
          position: 1,
          cards: [
            {
              title: 'Phác thảo layout trang Thư viện Template',
              description: 'Bao gồm danh mục bên trái, lưới thẻ mẫu và màn hình xem trước.',
              position: 0,
              checklists: [],
            },
          ],
        },
        {
          title: 'Thiết kế chi tiết (UI Design)',
          position: 2,
          cards: [
            {
              title: 'Bổ sung hiệu ứng Glassmorphism cho Modal Preview',
              description: 'Áp dụng bảng màu Deep Purple và Sky Glass chuẩn Design System.',
              position: 0,
              checklists: [],
            },
          ],
        },
        {
          title: 'Sẵn sàng bàn giao (Ready for Dev)',
          position: 3,
          cards: [
            {
              title: 'Design System Tokens v1.2',
              description: 'Xuất mã màu, kích thước font và icons để FE tích hợp.',
              position: 0,
              checklists: [],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'tpl-marketing-content',
    title: 'Kế hoạch Marketing & Content Calendar',
    description:
      'Mẫu lập lịch và quản lý nội dung đa kênh: từ Lên ý tưởng, Soạn thảo, Thiết kế đồ họa, Đăng bài và Đánh giá hiệu quả chiến dịch.',
    category: 'marketing',
    background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
    author_name: 'Growth & Marketing Hub',
    is_public: true,
    usage_count: 35,
    view_count: 260,
    structure: {
      lists: [
        {
          title: 'Kho ý tưởng (Content Backlog)',
          position: 0,
          cards: [
            {
              title: 'Bài viết: 5 mẹo quản lý công việc hiệu quả với Kanban',
              description: 'Chia sẻ kinh nghiệm tối ưu năng suất cá nhân và làm việc nhóm.',
              position: 0,
              checklists: [],
            },
          ],
        },
        {
          title: 'Đang soạn thảo & Thiết kế',
          position: 1,
          cards: [
            {
              title: 'Infographic: So sánh quy trình Scrum và Kanban',
              description: 'Thiết kế đồ họa trực quan đăng trên Facebook và LinkedIn.',
              position: 0,
              checklists: [],
            },
          ],
        },
        {
          title: 'Chờ duyệt (Review & Approval)',
          position: 2,
          cards: [],
        },
        {
          title: 'Lên lịch đăng bài (Scheduled)',
          position: 3,
          cards: [
            {
              title: 'Thông báo tính năng Thư viện Mẫu mới',
              description: 'Gửi email newsletter tới danh sách người dùng đăng ký.',
              position: 0,
              checklists: [],
            },
          ],
        },
        {
          title: 'Đã xuất bản (Published 📢)',
          position: 4,
          cards: [],
        },
      ],
    },
  },
  {
    id: 'tpl-hr-onboarding',
    title: 'Quy trình Tuyển dụng & Onboarding nhân viên mới',
    description:
      'Theo dõi ứng viên từ nộp hồ sơ, phỏng vấn vòng 1, bài test kỹ thuật, phỏng vấn chuyên sâu, gửi offer và quy trình đón tiếp nhân viên mới.',
    category: 'hr-operations',
    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    author_name: 'HR & People Team',
    is_public: true,
    usage_count: 15,
    view_count: 120,
    structure: {
      lists: [
        {
          title: 'Hồ sơ mới nhận (New Applicants)',
          position: 0,
          cards: [
            {
              title: 'Ứng viên: Frontend Developer (React/Next.js)',
              description: '3 năm kinh nghiệm, kỹ năng tốt về TypeScript và Tailwind/CSS.',
              position: 0,
              checklists: [],
            },
          ],
        },
        {
          title: 'Sàng lọc & Phỏng vấn sơ bộ',
          position: 1,
          cards: [],
        },
        {
          title: 'Bài kiểm tra kỹ thuật (Take-home Test)',
          position: 2,
          cards: [],
        },
        {
          title: 'Đã gửi Offer',
          position: 3,
          cards: [],
        },
        {
          title: 'Chào đón nhân viên mới (Onboarding)',
          position: 4,
          cards: [
            {
              title: 'Checklist chào đón tuần đầu tiên',
              description: 'Cấp phát máy tính, tài khoản email, giới thiệu văn hóa công ty.',
              position: 0,
              checklists: [
                {
                  title: 'Ngày đầu tiên',
                  items: [
                    { title: 'Cài đặt môi trường làm việc', is_completed: true },
                    { title: 'Gặp gỡ Buddy hỗ trợ', is_completed: false },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
];

@Injectable()
export class TemplatesService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  /**
   * Lấy danh sách Template (hỗ trợ lọc theo category, search, author)
   */
  async findAll(query?: { category?: string; search?: string; authorId?: string }, currentUserId?: string) {
    try {
      let dbQuery = this.supabase
        .from('templates')
        .select('id, title, description, category, background, author_id, author_name, is_public, usage_count, view_count, created_at, updated_at')
        .order('usage_count', { ascending: false });

      if (query?.category && query.category !== 'all') {
        dbQuery = dbQuery.eq('category', query.category);
      }

      if (query?.authorId) {
        if (currentUserId && currentUserId === query.authorId) {
          // Tác giả đang xem mẫu của chính mình -> được xem cả công khai và riêng tư
          dbQuery = dbQuery.eq('author_id', query.authorId);
        } else {
          // Người khác xem mẫu của tác giả này -> chỉ xem mẫu công khai
          dbQuery = dbQuery.eq('author_id', query.authorId).eq('is_public', true);
        }
      } else {
        dbQuery = dbQuery.eq('is_public', true);
      }

      if (query?.search && query.search.trim()) {
        dbQuery = dbQuery.ilike('title', `%${query.search.trim()}%`);
      }

      const { data, error } = await dbQuery;

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {
      // Fallback nếu bảng chưa có trong database
    }

    // Trả về built-in templates được lọc
    let fallback = [...BUILT_IN_TEMPLATES];
    if (query?.category && query.category !== 'all') {
      fallback = fallback.filter((t) => t.category === query.category);
    }
    if (query?.search && query.search.trim()) {
      const q = query.search.trim().toLowerCase();
      fallback = fallback.filter(
        (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
      );
    }
    return fallback.map(({ structure, ...rest }) => rest);
  }

  /**
   * Xem chi tiết Template kèm cấu trúc Lists/Cards/Checklists
   */
  async findById(id: string, currentUserId?: string) {
    try {
      const { data, error } = await this.supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        // Ngăn chặn truy cập trái phép vào mẫu riêng tư
        if (!data.is_public && (!currentUserId || data.author_id !== currentUserId)) {
          throw new ForbiddenException('Bạn không có quyền truy cập mẫu riêng tư này');
        }

        // Tăng view count trong nền
        this.supabase
          .from('templates')
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq('id', id)
          .then();

        return data;
      }
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      // ignore
    }

    // Tra cứu trong built-in templates
    const found = BUILT_IN_TEMPLATES.find((t) => t.id === id);
    if (found) {
      if (!found.is_public && (!currentUserId || (found as any).author_id !== currentUserId)) {
        throw new ForbiddenException('Bạn không có quyền truy cập mẫu riêng tư này');
      }
      return found;
    }

    throw new NotFoundException('Không tìm thấy mẫu Template');
  }

  /**
   * UC-TPL-001: Tạo Template mới từ đầu
   */
  async create(userId: string, dto: CreateTemplateDto) {
    let authorName = 'Thành viên Planify';
    try {
      const { data: user } = await this.supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .maybeSingle();
      if (user?.name) authorName = user.name;
    } catch {}

    const { data: created, error } = await this.supabase
      .from('templates')
      .insert({
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        category: dto.category || 'productivity',
        background: dto.background || 'linear-gradient(135deg, #2b1572 0%, #1e0854 100%)',
        author_id: userId,
        author_name: authorName,
        is_public: dto.is_public ?? true,
        structure: dto.structure || { lists: [] },
      })
      .select()
      .single();

    if (error || !created) {
      throw new BadRequestException(error?.message || 'Không thể tạo Template');
    }

    return created;
  }

  /**
   * UC-TPL-001: Lưu một Board hiện tại thành Template tái sử dụng
   */
  async createFromBoard(boardId: string, userId: string, dto: CreateTemplateFromBoardDto) {
    // 0. Xác thực quyền truy cập vào Board nguồn
    await this.verifyBoardAccess(boardId, userId);

    // 1. Lấy thông tin Board
    const { data: board, error: bError } = await this.supabase
      .from('boards')
      .select('id, name, description, background, workspace_id')
      .eq('id', boardId)
      .maybeSingle();

    if (bError || !board) {
      throw new NotFoundException('Không tìm thấy Board nguồn');
    }

    // 2. Lấy thông tin user
    let authorName = 'Thành viên Planify';
    try {
      const { data: user } = await this.supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .maybeSingle();
      if (user?.name) authorName = user.name;
    } catch {}

    // 3. Lấy toàn bộ lists, cards, checklists của Board
    const { data: lists } = await this.supabase
      .from('lists')
      .select('id, title, position, limit')
      .eq('board_id', boardId)
      .order('position', { ascending: true });

    const formattedLists: any[] = [];

    if (lists && lists.length > 0) {
      const listIds = lists.map((l) => l.id);

      const { data: cards } = await this.supabase
        .from('cards')
        .select('id, list_id, title, description, position')
        .in('list_id', listIds)
        .order('position', { ascending: true });

      const cardIds = (cards || []).map((c) => c.id);

      let checklists: any[] = [];
      if (cardIds.length > 0) {
        const { data: ckData } = await this.supabase
          .from('checklists')
          .select('id, card_id, title, position')
          .in('card_id', cardIds)
          .order('position', { ascending: true });

        const ckIds = (ckData || []).map((ck) => ck.id);

        let items: any[] = [];
        if (ckIds.length > 0) {
          const { data: itData } = await this.supabase
            .from('checklist_items')
            .select('id, checklist_id, title, is_completed, position')
            .in('checklist_id', ckIds)
            .order('position', { ascending: true });
          items = itData || [];
        }

        checklists = (ckData || []).map((ck) => ({
          ...ck,
          items: items.filter((it) => it.checklist_id === ck.id),
        }));
      }

      for (const l of lists) {
        const listCards = (cards || [])
          .filter((c) => c.list_id === l.id)
          .map((c) => ({
            title: c.title,
            description: c.description,
            position: c.position,
            checklists: checklists
              .filter((ck) => ck.card_id === c.id)
              .map((ck) => ({
                title: ck.title,
                items: (ck.items || []).map((it: any) => ({
                  title: it.title,
                  is_completed: false,
                })),
              })),
          }));

        formattedLists.push({
          title: l.title,
          position: l.position,
          limit: l.limit,
          cards: listCards,
        });
      }
    }

    // 4. Lưu thành Template mới
    const { data: created, error } = await this.supabase
      .from('templates')
      .insert({
        title: dto.title.trim(),
        description: dto.description?.trim() || board.description || null,
        category: dto.category || 'productivity',
        background: board.background || 'linear-gradient(135deg, #2b1572 0%, #1e0854 100%)',
        author_id: userId,
        author_name: authorName,
        is_public: dto.is_public ?? true,
        structure: { lists: formattedLists },
      })
      .select()
      .single();

    if (error || !created) {
      throw new BadRequestException(error?.message || 'Không thể lưu Board thành Template');
    }

    return created;
  }

  /**
   * UC-TPL-002: Sửa Template
   */
  async update(id: string, userId: string, dto: UpdateTemplateDto) {
    const template = await this.findById(id, userId);

    if (!template.author_id || template.author_id !== userId) {
      throw new ForbiddenException('Bạn chỉ có quyền chỉnh sửa mẫu do chính mình tạo ra');
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (dto.title !== undefined) updateData.title = dto.title.trim();
    if (dto.description !== undefined) updateData.description = dto.description.trim();
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.background !== undefined) updateData.background = dto.background;
    if (dto.is_public !== undefined) updateData.is_public = dto.is_public;
    if (dto.structure !== undefined) updateData.structure = dto.structure;

    const { data: updated, error } = await this.supabase
      .from('templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      throw new BadRequestException(error?.message || 'Không thể cập nhật Template');
    }

    return updated;
  }

  /**
   * UC-TPL-003: Xóa Template
   */
  async delete(id: string, userId: string) {
    const template = await this.findById(id, userId);

    if (!template.author_id || template.author_id !== userId) {
      throw new ForbiddenException('Bạn chỉ có quyền xóa mẫu do chính mình tạo ra');
    }

    const { error } = await this.supabase.from('templates').delete().eq('id', id);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Đã xóa Template thành công' };
  }

  /**
   * UC-TPL-004: Khởi tạo Board mới từ Template (Use Template)
   */
  async createBoardFromTemplate(
    templateId: string,
    userId: string,
    dto: CreateBoardFromTemplateDto,
  ) {
    // 1. Lấy thông tin Template nguồn và kiểm tra quyền xem
    const template = await this.findById(templateId, userId);

    if (!template.is_public && (!template.author_id || template.author_id !== userId)) {
      throw new ForbiddenException('Bạn không có quyền sao chép từ mẫu riêng tư này');
    }

    // 2. Xác thực quyền truy cập vào Workspace đích
    await this.verifyWorkspaceAccess(dto.workspaceId, userId);

    // 3. Tạo Board mới trong Workspace
    const insertPayload: any = {
      workspace_id: dto.workspaceId,
      name: dto.boardName.trim(),
      description: template.description || null,
      background: template.background || 'linear-gradient(135deg, #2b1572 0%, #1e0854 100%)',
      visibility: dto.visibility || 'WORKSPACE',
      is_favorite: false,
    };

    let newBoard: any;
    const { data: bData, error: bError } = await this.supabase
      .from('boards')
      .insert(insertPayload)
      .select()
      .single();

    if (bError) {
      // Fallback nếu cột background hoặc visibility chưa được thêm vào bảng boards
      if (
        bError.message?.includes('background') ||
        bError.message?.includes('visibility') ||
        bError.message?.includes('schema cache') ||
        bError.code === '42703'
      ) {
        delete insertPayload.background;
        delete insertPayload.visibility;
        const { data: retryBoard, error: retryErr } = await this.supabase
          .from('boards')
          .insert(insertPayload)
          .select()
          .single();

        if (retryErr || !retryBoard) {
          throw new BadRequestException(retryErr?.message || 'Không thể tạo Board từ mẫu');
        }
        newBoard = retryBoard;
      } else {
        throw new BadRequestException(bError?.message || 'Không thể tạo Board từ mẫu');
      }
    } else {
      newBoard = bData;
    }

    try {
      // 4. Gán quyền ADMIN cho người tạo board
      const { error: mError } = await this.supabase.from('board_members').insert({
        board_id: newBoard.id,
        user_id: userId,
        role: 'ADMIN',
      });
      if (mError) throw mError;

      // 5. Khởi tạo các Lists, Cards và Checklists từ structure
      const templateLists: any[] = template.structure?.lists || [];

      if (templateLists.length > 0) {
        for (const [lIdx, tList] of templateLists.entries()) {
          const { data: createdList, error: lError } = await this.supabase
            .from('lists')
            .insert({
              board_id: newBoard.id,
              title: tList.title || `Cột ${lIdx + 1}`,
              position: tList.position ?? lIdx,
              limit: tList.limit || null,
            })
            .select()
            .single();

          if (lError || !createdList) {
            if (lError) throw lError;
            continue;
          }

          // Nếu người dùng chọn giữ nguyên thẻ mẫu (keepCards !== false)
          if (dto.keepCards !== false && Array.isArray(tList.cards)) {
            for (const [cIdx, tCard] of tList.cards.entries()) {
              const { data: createdCard, error: cError } = await this.supabase
                .from('cards')
                .insert({
                  list_id: createdList.id,
                  title: tCard.title || `Công việc ${cIdx + 1}`,
                  description: tCard.description || null,
                  position: tCard.position ?? cIdx,
                  created_by: userId,
                  status: 'TODO',
                })
                .select()
                .single();

              if (cError || !createdCard) {
                if (cError) throw cError;
                continue;
              }

              // Sao chép Checklists nếu có
              if (Array.isArray(tCard.checklists)) {
                for (const [ckIdx, tCk] of tCard.checklists.entries()) {
                  const { data: createdCk, error: ckError } = await this.supabase
                    .from('checklists')
                    .insert({
                      card_id: createdCard.id,
                      title: tCk.title || 'Checklist',
                      position: ckIdx,
                    })
                    .select()
                    .single();

                  if (ckError) throw ckError;

                  if (createdCk && Array.isArray(tCk.items)) {
                    for (const [itIdx, tIt] of tCk.items.entries()) {
                      const itemText = tIt.content || tIt.title || 'Mục công việc';
                      const { error: itError } = await this.supabase.from('checklist_items').insert({
                        checklist_id: createdCk.id,
                        content: itemText,
                        is_completed: tIt.is_completed ?? false,
                        position: itIdx,
                      });
                      if (itError) throw itError;
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (err: any) {
      // Transactional rollback: xóa board nếu gặp lỗi giữa chừng
      await this.supabase.from('boards').delete().eq('id', newBoard.id);
      throw new BadRequestException(err?.message || 'Không thể tạo đầy đủ cấu trúc Bảng từ mẫu');
    }

    // 6. Cập nhật lượt sử dụng của Template
    try {
      await this.supabase
        .from('templates')
        .update({ usage_count: (template.usage_count || 0) + 1 })
        .eq('id', template.id);
    } catch {}

    // 7. Ghi nhận Activity log
    await this.activitiesService
      .logActivity({
        workspaceId: dto.workspaceId,
        userId,
        action: `đã tạo Bảng "${newBoard.name}" từ mẫu "${template.title}"`,
        targetType: `board:${newBoard.id}`,
      })
      .catch(() => {});

    return {
      message: 'Khởi tạo Bảng từ mẫu thành công!',
      boardId: newBoard.id,
      workspaceId: dto.workspaceId,
    };
  }

  private async verifyBoardAccess(boardId: string, userId: string) {
    const { data: member } = await this.supabase
      .from('board_members')
      .select('id')
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      const { data: board } = await this.supabase
        .from('boards')
        .select('workspace_id')
        .eq('id', boardId)
        .maybeSingle();

      if (!board) {
        throw new NotFoundException('Không tìm thấy Board nguồn');
      }

      const { data: workspace } = await this.supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', board.workspace_id)
        .maybeSingle();

      if (workspace?.owner_id !== userId) {
        throw new ForbiddenException('Bạn không có quyền truy cập Bảng này để lưu thành mẫu');
      }
    }
  }

  private async verifyWorkspaceAccess(workspaceId: string, userId: string) {
    const { data: member } = await this.supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      const { data: workspace } = await this.supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .maybeSingle();

      if (workspace?.owner_id !== userId) {
        throw new ForbiddenException('Bạn không có quyền tạo Board trong Không gian làm việc này');
      }
    }
  }
}
