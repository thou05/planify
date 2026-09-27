import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type } from '@google/genai';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { ActivitiesService } from '../activities/activities.service';
import { BreakdownTaskDto } from './dto/breakdown-task.dto';
import { ApplyBreakdownDto } from './dto/apply-breakdown.dto';
import { BoardChatDto } from './dto/board-chat.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private aiClient: GoogleGenAI | null = null;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly activitiesService: ActivitiesService,
  ) {
    this.apiKey = this.resolveApiKey();
    if (this.apiKey) {
      this.aiClient = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  private resolveApiKey(): string {
    let key =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY ||
      '';

    if (!key) {
      try {
        const fs = require('fs');
        const path = require('path');
        const pathsToTry = [
          path.resolve(process.cwd(), 'backend', '.env'),
          path.resolve(process.cwd(), '.env'),
          path.resolve(__dirname, '..', '..', '..', '.env'),
          path.resolve(__dirname, '..', '..', '..', '..', '.env'),
          path.resolve(__dirname, '..', '..', '..', 'backend', '.env'),
        ];
        for (const p of pathsToTry) {
          if (fs.existsSync(p)) {
            const content = fs.readFileSync(p, 'utf8');
            const match = content.match(/GEMINI_API_KEY=(.*)/);
            if (match && match[1]?.trim()) {
              key = match[1].trim();
              process.env.GEMINI_API_KEY = key;
              break;
            }
          }
        }
      } catch {
        // ignore
      }
    }
    return key;
  }

  private getClient(): GoogleGenAI {
    if (this.aiClient) return this.aiClient;
    const currentKey = this.resolveApiKey();
    if (!currentKey) {
      throw new BadRequestException(
        'Chưa cấu hình GEMINI_API_KEY! Vui lòng tạo API Key miễn phí tại https://aistudio.google.com/app/apikey và thêm vào file backend/.env hoặc cấu hình biến môi trường trên server deploy.',
      );
    }
    this.aiClient = new GoogleGenAI({ apiKey: currentKey });
    return this.aiClient;
  }

  private getModelName(): string {
    return (
      this.configService.get<string>('GEMINI_MODEL') ||
      process.env.GEMINI_MODEL ||
      'gemini-3.6-flash'
    );
  }

  private getCandidateModels(): string[] {
    const primary = this.getModelName();
    const candidateList = [
      primary,
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-3-flash-preview',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
    ];
    return candidateList.filter((m, idx, arr) => arr.indexOf(m) === idx);
  }

  private async verifyCardAccess(cardId: string, userId: string) {
    const { data: card, error: cError } = await this.supabase
      .from('cards')
      .select(`
        id,
        title,
        description,
        status,
        due_date,
        is_due_date_completed,
        list_id,
        list:lists (
          id,
          title,
          board_id,
          board:boards (id, name, workspace_id)
        ),
        checklists (
          id,
          title,
          items:checklist_items (content, is_completed)
        )
      `)
      .eq('id', cardId)
      .maybeSingle();

    if (cError || !card) {
      throw new NotFoundException('Không tìm thấy thông tin thẻ (Card)');
    }

    const board = (card.list as any)?.board;
    const workspaceId = board?.workspace_id;
    if (workspaceId) {
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
          throw new ForbiddenException('Bạn không có quyền thao tác trên thẻ này');
        }
      }
    }

    return { card, boardId: board?.id, workspaceId };
  }

  private async verifyBoardAccess(boardId: string, userId: string) {
    const { data: board, error: bError } = await this.supabase
      .from('boards')
      .select('id, name, description, workspace_id')
      .eq('id', boardId)
      .maybeSingle();

    if (bError || !board) {
      throw new NotFoundException('Không tìm thấy Bảng (Board)');
    }

    if (board.workspace_id) {
      const { data: member } = await this.supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', board.workspace_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (!member) {
        const { data: workspace } = await this.supabase
          .from('workspaces')
          .select('owner_id')
          .eq('id', board.workspace_id)
          .maybeSingle();

        if (workspace?.owner_id !== userId) {
          throw new ForbiddenException('Bạn không có quyền truy cập Bảng này');
        }
      }
    }

    return board;
  }

  // ==========================================
  // 1. AI TASK BREAKDOWN (PHÂN RÃ CÔNG VIỆC)
  // ==========================================
  async breakdownTask(cardId: string, userId: string, dto?: BreakdownTaskDto) {
    const { card } = await this.verifyCardAccess(cardId, userId);
    const client = this.getClient();

    const currentChecklists = (card.checklists || [])
      .map(
        (cl: any) =>
          `- ${cl.title}: ${(cl.items || []).map((i: any) => i.content).join(', ')}`,
      )
      .join('\n');

    const prompt = `Bạn là một Technical Lead và Agile Coach xuất sắc.
Nhiệm vụ của bạn: Phân rã (break down) công việc sau đây thành các đầu mục checklist kỹ thuật chi tiết, rõ ràng, có tính khả thi và đo lường được cho thành viên thực hiện.

[THÔNG TIN THẺ CÔNG VIỆC]:
- Tiêu đề: ${card.title}
- Mô tả: ${card.description || 'Chưa có mô tả chi tiết'}
- Cột danh sách hiện tại: ${(card.list as any)?.title || 'TODO'}
${currentChecklists ? `- Các checklist đã có:\n${currentChecklists}` : ''}
${dto?.customPrompt ? `- YÊU CẦU ĐẶC BIỆT TỪ NGƯỜI DÙNG: ${dto.customPrompt}` : ''}

[YÊU CẦU ĐẦU RA]:
1. Viết tóm tắt súc tích về hướng tiếp cận kỹ thuật / mục tiêu chính.
2. Ước lượng tổng số giờ thực hiện hợp lý.
3. Chia thành từ 3 đến 8 checklist items cụ thể (mỗi item nêu rõ hành động, ví dụ: 'Viết API POST /users', 'Thiết kế giao diện Modal Tailwind', 'Test trường hợp ngoại lệ').
4. Với mỗi item, ước tính số phút thực hiện (30, 45, 60, 90, 120...) và độ ưu tiên (HIGH, MEDIUM, LOW).`;

    const candidateModels = this.getCandidateModels();

    let lastError: any = null;
    for (const model of candidateModels) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: {
                  type: Type.STRING,
                  description: 'Tóm tắt hướng tiếp cận kỹ thuật hoặc giải pháp',
                },
                estimatedHours: {
                  type: Type.NUMBER,
                  description: 'Tổng thời gian ước tính (giờ)',
                },
                checklistTitle: {
                  type: Type.STRING,
                  description: 'Tiêu đề đề xuất cho checklist mới',
                },
                items: {
                  type: Type.ARRAY,
                  description: 'Danh sách các việc cụ thể cần làm',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      content: {
                        type: Type.STRING,
                        description: 'Nội dung công việc cụ thể',
                      },
                      estimatedMinutes: {
                        type: Type.NUMBER,
                        description: 'Thời gian ước tính bằng phút',
                      },
                      priority: {
                        type: Type.STRING,
                        description: 'Độ ưu tiên: HIGH, MEDIUM, hoặc LOW',
                      },
                    },
                    required: ['content'],
                  },
                },
              },
              required: ['summary', 'checklistTitle', 'items'],
            },
          },
        });

        const responseText = response.text || '{}';
        return JSON.parse(responseText);
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`Model ${model} thất bại: ${err?.message}, đang thử model tiếp theo...`);
      }
    }

    this.logger.error(`Lỗi khi gọi Gemini API phân rã thẻ ${cardId}: ${lastError?.message}`);
    throw new BadRequestException(
      `Không thể phân rã công việc với AI: ${lastError?.message || 'Lỗi kết nối AI'}`,
    );
  }

  // ==========================================
  // 2. APPLY BREAKDOWN INTO CHECKLIST
  // ==========================================
  async applyBreakdown(cardId: string, userId: string, dto: ApplyBreakdownDto) {
    const { card, boardId, workspaceId } = await this.verifyCardAccess(cardId, userId);

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Danh sách công việc phân rã không được để trống');
    }

    // 1. Tạo checklist mới
    const checklistTitle = dto.title?.trim() || 'AI Checklist: Kế hoạch triển khai';

    const { data: lastChecklist } = await this.supabase
      .from('checklists')
      .select('position')
      .eq('card_id', cardId)
      .order('position', { ascending: false })
      .limit(1);

    const position = (lastChecklist?.[0]?.position ?? -1) + 1;

    const { data: newChecklist, error: cError } = await this.supabase
      .from('checklists')
      .insert({
        card_id: cardId,
        title: checklistTitle,
        position,
      })
      .select()
      .single();

    if (cError || !newChecklist) {
      throw new BadRequestException(cError?.message || 'Không thể tạo Checklist mới');
    }

    // 2. Chèn các checklist items
    const itemsToInsert = dto.items.map((item, index) => {
      let content = item.content.trim();
      if (item.estimatedMinutes) {
        content = `${content} (~${item.estimatedMinutes}m)`;
      }
      return {
        checklist_id: newChecklist.id,
        content,
        position: index,
        is_completed: false,
      };
    });

    const { data: createdItems, error: itemsError } = await this.supabase
      .from('checklist_items')
      .insert(itemsToInsert)
      .select();

    if (itemsError) {
      throw new BadRequestException(itemsError.message);
    }

    // 3. Log activity
    if (workspaceId) {
      await this.activitiesService.logActivity({
        workspaceId,
        userId,
        action: `đã dùng AI phân rã "${checklistTitle}" với ${dto.items.length} công việc`,
        targetType: `card:${cardId}`,
      });
    }

    // 4. Phát sóng Realtime cập nhật thẻ
    if (boardId) {
      this.supabase.emitBoardEvent(boardId, 'CARD_UPDATED', {
        cardId,
        senderId: userId,
      });
    }

    return {
      ...newChecklist,
      items: createdItems || [],
    };
  }

  // ==========================================
  // 3. AI DAILY STANDUP & BOARD SUMMARY
  // ==========================================
  async generateDailyStandup(boardId: string, userId: string) {
    const board = await this.verifyBoardAccess(boardId, userId);
    const client = this.getClient();

    // 1. Lấy dữ liệu lists và cards trên bảng
    const { data: lists } = await this.supabase
      .from('lists')
      .select(`
        id,
        title,
        position,
        cards (
          id,
          title,
          description,
          status,
          due_date,
          is_due_date_completed,
          card_assignees (
            board_member:board_members (
              user:users (name, email)
            )
          )
        )
      `)
      .eq('board_id', boardId)
      .order('position', { ascending: true });

    // 2. Lấy activity logs gần đây của board / workspace
    let recentActivitiesText = 'Không có hoạt động mới ghi nhận.';
    if (board.workspace_id) {
      const { data: activities } = await this.supabase
        .from('activity_logs')
        .select(`
          action,
          target_type,
          created_at,
          user:users (name)
        `)
        .eq('workspace_id', board.workspace_id)
        .order('created_at', { ascending: false })
        .limit(25);

      if (activities && activities.length > 0) {
        recentActivitiesText = activities
          .map((a: any) => `[${a.created_at}] ${a.user?.name || 'Thành viên'}: ${a.action}`)
          .join('\n');
      }
    }

    // Tổng hợp thống kê sơ bộ
    let totalCards = 0;
    let completedCards = 0;
    const listSummaries = (lists || []).map((list: any) => {
      const cList = list.cards || [];
      totalCards += cList.length;
      const doneInList = cList.filter((c: any) => c.is_due_date_completed || list.title.toLowerCase().includes('done') || list.title.toLowerCase().includes('hoàn thành')).length;
      completedCards += doneInList;
      return `- Cột "${list.title}": ${cList.length} thẻ (${cList.map((c: any) => c.title).slice(0, 5).join(', ')}${cList.length > 5 ? '...' : ''})`;
    }).join('\n');

    const prompt = `Bạn là một Agile Scrum Master kiêm Project Manager cấp cao.
Hãy tạo Báo cáo Daily Standup và Đánh giá Tiến độ chi tiết cho Bảng Kanban "${board.name}".

[DỮ LIỆU HIỆN TẠI TRÊN BẢNG]:
- Tên bảng: ${board.name}
- Mô tả: ${board.description || 'Không có'}
- Tổng số thẻ: ${totalCards} (Đã hoàn thành ước tính: ${completedCards})
- Phân bổ cột:
${listSummaries}

[LỊCH SỬ HOẠT ĐỘNG GẦN ĐÂY]:
${recentActivitiesText}

[YÊU CẦU ĐẦU RA]:
Soạn thảo một báo cáo Daily Standup chuyên nghiệp bằng định dạng Markdown (tiếng Việt), bao gồm:
1. 🎯 **Tổng quan tình hình Sprint & Tiến độ hiện tại** (nhận xét % hoàn thành, tốc độ).
2. ✅ **Đã hoàn thành gần đây (What was done)**: Liệt kê các đầu việc hoặc chuyển dịch thẻ nổi bật.
3. ⏳ **Đang triển khai & Trọng tâm hôm nay (What to do today)**: Các thẻ đang ở cột In Progress / TODO cần chú ý.
4. ⚠️ **Rủi ro & Điểm nghẽn (Blockers / Bottlenecks)**: Thẻ quá hạn, cột nào đang bị dồn ứ nhiều task, thành viên nào có thể đang quá tải.
5. 💡 **Hành động đề xuất cho Team (Actionable Recommendations)**: 2-3 lời khuyên thiết thực giúp team đẩy nhanh tiến độ.

Hãy dùng format Markdown rõ ràng, bullet points đẹp mắt, emoji sinh động, thích hợp để copy paste vào Slack / Teams / Zalo.`;

    const candidateModels = this.getCandidateModels();

    let lastError: any = null;
    for (const model of candidateModels) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.2,
          },
        });

        return {
          boardId,
          boardName: board.name,
          totalCards,
          completedCards,
          reportMarkdown: response.text || 'Không có nội dung báo cáo',
          generatedAt: new Date().toISOString(),
        };
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`Model ${model} tạo Standup thất bại: ${err?.message}, đang thử model tiếp theo...`);
      }
    }

    this.logger.error(`Lỗi khi tạo Daily Standup cho board ${boardId}: ${lastError?.message}`);
    throw new BadRequestException(
      `Không thể tạo báo cáo AI: ${lastError?.message || 'Lỗi kết nối AI'}`,
    );
  }

  // ==========================================
  // 4. AI BOTTLENECK & RISK SCANNER
  // ==========================================
  async scanBoardRisks(boardId: string, userId: string) {
    const board = await this.verifyBoardAccess(boardId, userId);
    const client = this.getClient();

    const { data: lists, error } = await this.supabase
      .from('lists')
      .select(`
        id,
        title,
        position,
        cards (
          id,
          title,
          description,
          status,
          start_date,
          due_date,
          is_due_date_completed,
          card_assignees (
            board_member:board_members (
              user:users (id, name, email)
            )
          ),
          card_labels (
            label:labels (name, color)
          ),
          card_relations!fk_card_relation_source (
            id,
            type,
            related_card:cards!fk_card_relation_target (
              id,
              title,
              status,
              is_due_date_completed
            )
          )
        )
      `)
      .eq('board_id', boardId)
      .order('position', { ascending: true });

    if (error) {
      throw new BadRequestException('Không thể lấy dữ liệu phân tích rủi ro');
    }

    const now = new Date();
    let totalCards = 0;
    let completedCards = 0;
    const overdueCards: any[] = [];
    const dueSoonCards: any[] = [];
    const blockedCards: any[] = [];
    const memberTasks: Record<string, { total: number; completed: number; inProgress: number }> = {};
    const columnStats: Array<{ title: string; count: number; cards: string[] }> = [];

    (lists || []).forEach((list: any) => {
      const cList = list.cards || [];
      totalCards += cList.length;
      columnStats.push({
        title: list.title,
        count: cList.length,
        cards: cList.map((c: any) => c.title),
      });

      cList.forEach((c: any) => {
        const isDone =
          c.is_due_date_completed ||
          c.status === 'DONE' ||
          list.title.toLowerCase().includes('done') ||
          list.title.toLowerCase().includes('hoàn thành');

        if (isDone) {
          completedCards++;
        }

        // Kiểm tra hạn chót
        if (c.due_date && !isDone) {
          const due = new Date(c.due_date);
          const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
          if (diffHours < 0) {
            overdueCards.push({
              id: c.id,
              title: c.title,
              due_date: c.due_date,
              overdueHours: Math.abs(Math.round(diffHours)),
            });
          } else if (diffHours <= 48) {
            dueSoonCards.push({
              id: c.id,
              title: c.title,
              due_date: c.due_date,
              dueInHours: Math.round(diffHours),
            });
          }
        }

        // Kiểm tra blocked cards
        const blockers = (c.card_relations || []).filter(
          (r: any) =>
            r.type === 'BLOCKED_BY' &&
            r.related_card &&
            !r.related_card.is_due_date_completed &&
            r.related_card.status !== 'DONE',
        );
        if (blockers.length > 0 && !isDone) {
          blockedCards.push({
            id: c.id,
            title: c.title,
            blockers: blockers.map((b: any) => b.related_card?.title || 'Thẻ chặn'),
          });
        }

        // Thống kê phân bổ thành viên
        const assignees = c.card_assignees || [];
        if (assignees.length === 0 && !isDone) {
          memberTasks['Chưa phân công'] = memberTasks['Chưa phân công'] || {
            total: 0,
            completed: 0,
            inProgress: 0,
          };
          memberTasks['Chưa phân công'].total++;
          memberTasks['Chưa phân công'].inProgress++;
        } else {
          assignees.forEach((a: any) => {
            const name = a.board_member?.user?.name || 'Thành viên';
            memberTasks[name] = memberTasks[name] || { total: 0, completed: 0, inProgress: 0 };
            memberTasks[name].total++;
            if (isDone) memberTasks[name].completed++;
            else memberTasks[name].inProgress++;
          });
        }
      });
    });

    // Tính toán Điểm Rủi ro cơ sở tất định (Deterministic Baseline Risk Score)
    let baselineScore = 15;
    if (totalCards === 0) {
      baselineScore = 20; // Bảng chưa có thẻ
    } else {
      const overdueRatio = overdueCards.length / totalCards;
      const dueSoonRatio = dueSoonCards.length / totalCards;
      const blockedRatio = blockedCards.length / totalCards;
      const completedRatio = completedCards / totalCards;

      baselineScore += Math.round(overdueRatio * 45);
      baselineScore += Math.round(blockedRatio * 25);
      baselineScore += Math.round(dueSoonRatio * 15);

      const maxColCount = Math.max(...columnStats.map((c) => c.count), 0);
      if (maxColCount / totalCards > 0.4 && totalCards >= 4) {
        baselineScore += 10;
      }
      if (totalCards >= 6 && completedRatio < 0.15) {
        baselineScore += 5;
      }
    }
    baselineScore = Math.min(Math.max(baselineScore, 5), 98);

    const contextData = {
      boardName: board.name,
      totalCards,
      completedCards,
      baselineRiskScore: baselineScore,
      overdueCount: overdueCards.length,
      overdueCards: overdueCards.slice(0, 10),
      dueSoonCount: dueSoonCards.length,
      dueSoonCards: dueSoonCards.slice(0, 10),
      blockedCount: blockedCards.length,
      blockedCards: blockedCards.slice(0, 10),
      columnDistribution: columnStats,
      memberWorkload: memberTasks,
    };

    const prompt = `Bạn là Chuyên gia Quản trị Rủi ro & Tối ưu hóa Quy trình Kanban (Agile Process Consultant).
Hãy phân tích dữ liệu thực tế sau đây của Bảng Kanban "${board.name}" và tìm ra các rủi ro, điểm nghẽn (bottlenecks) và phương án khắc phục:

[DỮ LIỆU DỰ ÁN]:
${JSON.stringify(contextData, null, 2)}

[YÊU CẦU]:
Đánh giá khách quan, nhất quán, logic và trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm văn bản mở đầu hay kết thúc) theo schema sau.
Lưu ý: Chỉ số rủi ro tính toán từ dữ liệu cứng là ${baselineScore}/100. Hãy neo điểm số riskScore sát với mốc này để đảm bảo tính nhất quán qua các lần quét nếu dữ liệu không thay đổi.
{
  "riskScore": (số từ 0 đến 100, 0 là an toàn tuyệt đối, 100 là báo động đỏ),
  "riskLevel": ("LOW" | "MEDIUM" | "HIGH" | "CRITICAL"),
  "summary": "Tóm tắt ngắn gọn 2-3 câu về tình trạng sức khỏe tổng quan của dự án",
  "bottlenecks": [
    {
      "title": "Tên điểm nghẽn",
      "description": "Giải thích chi tiết nguyên nhân gây nghẽn",
      "severity": ("low" | "medium" | "high"),
      "affectedCards": ["Tên thẻ 1", "Tên thẻ 2"]
    }
  ],
  "deadlineRisks": [
    {
      "cardTitle": "Tên thẻ có nguy cơ trễ hạn",
      "dueDate": "Thời hạn",
      "issue": "Mô tả vấn đề",
      "severity": ("medium" | "high" | "critical")
    }
  ],
  "workloadIssues": [
    {
      "memberName": "Tên thành viên",
      "taskCount": 5,
      "status": "Quá tải" hoặc "Mất cân đối",
      "suggestion": "Đề xuất điều phối lại"
    }
  ],
  "blockerChains": [
    {
      "blockerCard": "Tên thẻ đang chặn",
      "blockedCards": ["Danh sách các thẻ bị kẹt"],
      "impact": "Mức độ ảnh hưởng"
    }
  ],
  "actionItems": [
    {
      "priority": ("HIGH" | "MEDIUM" | "LOW"),
      "action": "Hành động cụ thể cần làm ngay",
      "impact": "Lợi ích mang lại sau khi làm"
    }
  ]
}`;

    const candidateModels = this.getCandidateModels();

    let lastError: any = null;
    for (const model of candidateModels) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.1,
          },
        });

        const rawText = response.text || '';
        const cleanJson = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        const result = JSON.parse(cleanJson);
        const finalRiskScore = typeof result.riskScore === 'number'
          ? Math.round(result.riskScore * 0.35 + baselineScore * 0.65)
          : baselineScore;

        return {
          boardId,
          boardName: board.name,
          scannedAt: new Date().toISOString(),
          metrics: {
            totalCards,
            completedCards,
            overdueCount: overdueCards.length,
            dueSoonCount: dueSoonCards.length,
            blockedCount: blockedCards.length,
          },
          ...result,
          riskScore: finalRiskScore,
        };
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`Model ${model} quét rủi ro thất bại: ${err?.message}, thử model tiếp theo...`);
      }
    }

    throw new BadRequestException(
      `Không thể phân tích rủi ro AI: ${lastError?.message || 'Lỗi xử lý AI'}`,
    );
  }

  // ==========================================
  // 5. AI BOARD COPILOT (CHATBOT THÔNG MINH)
  // ==========================================
  async chatWithBoardCopilot(boardId: string, userId: string, dto: BoardChatDto) {
    const board = await this.verifyBoardAccess(boardId, userId);
    const client = this.getClient();

    const { data: lists } = await this.supabase
      .from('lists')
      .select(`
        id,
        title,
        cards (
          id,
          title,
          description,
          status,
          due_date,
          is_due_date_completed,
          card_assignees (
            board_member:board_members (
              user:users (id, name)
            )
          ),
          card_labels (
            label:labels (name, color)
          ),
          card_relations!fk_card_relation_source (
            type,
            related_card:cards!fk_card_relation_target (id, title, is_due_date_completed)
          )
        )
      `)
      .eq('board_id', boardId)
      .order('position', { ascending: true });

    const now = new Date();
    const boardContext = (lists || [])
      .map((l: any) => {
        const cards = (l.cards || [])
          .map((c: any) => {
            const assignees = (c.card_assignees || [])
              .map((a: any) => a.board_member?.user?.name)
              .filter(Boolean);
            const labels = (c.card_labels || [])
              .map((lb: any) => lb.label?.name)
              .filter(Boolean);
            const blockers = (c.card_relations || [])
              .filter(
                (r: any) =>
                  r.type === 'BLOCKED_BY' && !r.related_card?.is_due_date_completed,
              )
              .map((r: any) => r.related_card?.title);

            let timeNote = '';
            if (c.due_date) {
              const due = new Date(c.due_date);
              const diffDays = Math.round(
                (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
              );
              if (!c.is_due_date_completed) {
                timeNote =
                  diffDays < 0
                    ? ` (QUÁ HẠN ${Math.abs(diffDays)} ngày)`
                    : ` (Hạn chót còn ${diffDays} ngày)`;
              }
            }

            return `  - Thẻ: "${c.title}" [id: ${c.id}]${timeNote}
    + Trạng thái: ${c.is_due_date_completed ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
    + Người làm: ${assignees.length > 0 ? assignees.join(', ') : 'Chưa giao'}
    + Nhãn: ${labels.length > 0 ? labels.join(', ') : 'Không có'}
    + Bị chặn bởi: ${blockers.length > 0 ? blockers.join(', ') : 'Không bị chặn'}`;
          })
          .join('\n');

        return `Cột "${l.title}":\n${cards || '  (Chưa có thẻ nào)'}`;
      })
      .join('\n\n');

    const systemPrompt = `Bạn là Planify Copilot — Trợ lý AI Quản lý Dự án thông minh được tích hợp trực tiếp vào Bảng Kanban "${board.name}".
Thời gian hiện tại: ${now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

[DỮ LIỆU HIỆN TẠI CỦA BẢNG KANBAN]:
${boardContext}

[HƯỚNG DẪN TRẢ LỜI]:
1. Trả lời bằng tiếng Việt thân thiện, chuyên nghiệp, súc tích và có tính hành động cao.
2. Khi đề cập đến một thẻ cụ thể, hãy viết theo định dạng: [Tên thẻ](card:cardId) (đúng id trong dữ liệu) để người dùng có thể bấm vào xem chi tiết thẻ ngay.
3. Nếu người dùng hỏi về hạn chót (overdue / trễ hạn), hãy lọc và chỉ rõ thẻ nào, quá hạn bao lâu và ai đang phụ trách.
4. Nếu người dùng hỏi về khối lượng công việc, hãy thống kê số thẻ của từng thành viên.
5. Nếu người dùng hỏi lời khuyên hoặc tìm kiếm, hãy đưa ra phân tích chính xác dựa vào dữ liệu bảng trên.`;

    const conversation = (dto.history || [])
      .map(
        (h) =>
          `${h.role === 'user' ? 'Người dùng' : 'Planify Copilot'}: ${h.content}`,
      )
      .join('\n\n');
    const fullPrompt = `${systemPrompt}\n\n[LỊCH SỬ HỘI THOẠI]:\n${conversation}\n\nNgười dùng: ${dto.message}\nPlanify Copilot:`;

    const candidateModels = this.getCandidateModels();

    let lastError: any = null;
    for (const model of candidateModels) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: fullPrompt,
        });

        return {
          boardId,
          reply: response.text || 'Tôi đã tiếp nhận thông tin nhưng chưa có phản hồi.',
          generatedAt: new Date().toISOString(),
        };
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`Model ${model} copilot chat thất bại: ${err?.message}, thử model tiếp theo...`);
      }
    }

    throw new BadRequestException(
      `Không thể trò chuyện cùng AI Copilot: ${lastError?.message || 'Lỗi kết nối AI'}`,
    );
  }
}
