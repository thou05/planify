import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { SupabaseService } from '../../integrations/supabase/supabase.service';

export interface BoardAnalyticsSummary {
  totalCards: number;
  completedCards: number;
  inProgressCards: number;
  todoCards: number;
  overdueCards: number;
  dueSoonCards: number;
  noDueDateCards: number;
  completionRate: number;
  overdueRate: number;
}

export interface ListStat {
  id: string;
  title: string;
  position: number;
  cardCount: number;
  completedCount: number;
  percentage: number;
}

export interface MemberWorkload {
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  assignedCardsCount: number;
  completedCardsCount: number;
  overdueCardsCount: number;
  completionRate: number;
}

export interface LabelStat {
  id: string;
  name: string;
  color: string;
  cardCount: number;
  percentage: number;
}

export interface ChecklistStat {
  totalChecklists: number;
  totalItems: number;
  completedItems: number;
  completionRate: number;
}

export interface UrgentCardItem {
  id: string;
  title: string;
  dueDate: string;
  isOverdue: boolean;
  listTitle: string;
  assignees: { name: string; avatar: string | null }[];
}

export interface BoardAnalyticsData {
  board: {
    id: string;
    name: string;
    description: string | null;
  };
  summary: BoardAnalyticsSummary;
  lists: ListStat[];
  members: MemberWorkload[];
  unassignedCardsCount: number;
  labels: LabelStat[];
  checklists: ChecklistStat;
  urgentCards: UrgentCardItem[];
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private aiClient: GoogleGenAI | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly supabase: SupabaseService,
  ) {
    const key = this.resolveApiKey();
    if (key) {
      try {
        this.aiClient = new GoogleGenAI({ apiKey: key });
      } catch (err) {
        this.logger.warn(`Không thể khởi tạo Gemini Client: ${err?.message || err}`);
      }
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
          path.resolve(process.cwd(), '..', 'backend', '.env'),
          path.resolve(process.cwd(), '..', '.env'),
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
          // Kiểm tra xem có phải là board member trực tiếp không
          const { data: bMember } = await this.supabase
            .from('board_members')
            .select('id')
            .eq('board_id', boardId)
            .eq('user_id', userId)
            .maybeSingle();

          if (!bMember) {
            throw new ForbiddenException('Bạn không có quyền truy cập bảng này');
          }
        }
      }
    }

    return board;
  }

  async getBoardAnalytics(boardId: string, userId: string): Promise<BoardAnalyticsData> {
    const board = await this.verifyBoardAccess(boardId, userId);

    // 1. Lấy toàn bộ lists của board
    const { data: lists, error: listsError } = await this.supabase
      .from('lists')
      .select('id, title, position')
      .eq('board_id', boardId)
      .order('position', { ascending: true });

    if (listsError) {
      this.logger.error(`Lỗi khi lấy danh sách lists: ${listsError.message}`);
      throw new NotFoundException('Không thể tải danh sách cột');
    }

    const listIds = (lists || []).map((l) => l.id);

    // 2. Lấy toàn bộ cards kèm assignees, labels, checklists
    let cards: any[] = [];
    if (listIds.length > 0) {
      const { data: cardData, error: cardsError } = await this.supabase
        .from('cards')
        .select(`
          id,
          list_id,
          title,
          status,
          start_date,
          due_date,
          is_due_date_completed,
          position,
          card_assignees (
            board_member:board_members (
              id,
              user_id,
              role,
              user:users (
                id,
                name,
                email,
                avatar
              )
            )
          ),
          card_labels (
            label:labels (
              id,
              name,
              color
            )
          ),
          checklists (
            id,
            title,
            items:checklist_items (
              id,
              content,
              is_completed
            )
          )
        `)
        .in('list_id', listIds);

      if (cardsError) {
        this.logger.error(`Lỗi khi lấy cards: ${cardsError.message}`);
      } else {
        cards = cardData || [];
      }
    }

    // 3. Lấy toàn bộ thành viên của board
    const { data: boardMembers } = await this.supabase
      .from('board_members')
      .select(`
        id,
        user_id,
        role,
        user:users (
          id,
          name,
          email,
          avatar
        )
      `)
      .eq('board_id', boardId);

    // 4. Lấy toàn bộ labels của board
    const { data: boardLabels } = await this.supabase
      .from('labels')
      .select('id, name, color')
      .eq('board_id', boardId);

    const now = new Date();
    const twoDaysLater = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Chuẩn hóa hàm kiểm tra hoàn thành
    const isCompletedCard = (c: any, listTitle: string = '') => {
      if (c.is_due_date_completed) return true;
      if (c.status === 'DONE' || c.status === 'COMPLETED') return true;
      const lowerTitle = listTitle.toLowerCase();
      return (
        lowerTitle.includes('done') ||
        lowerTitle.includes('xong') ||
        lowerTitle.includes('hoàn thành') ||
        lowerTitle.includes('completed')
      );
    };

    // Tạo Map listId -> List
    const listMap = new Map<string, { id: string; title: string; position: number }>();
    (lists || []).forEach((l) => listMap.set(l.id, l));

    // Thống kê Summary
    let totalCards = cards.length;
    let completedCards = 0;
    let inProgressCards = 0;
    let todoCards = 0;
    let overdueCards = 0;
    let dueSoonCards = 0;
    let noDueDateCards = 0;
    let unassignedCardsCount = 0;

    const urgentCards: UrgentCardItem[] = [];

    // Map thống kê list
    const listStatCounts = new Map<string, { total: number; completed: number }>();
    (lists || []).forEach((l) => listStatCounts.set(l.id, { total: 0, completed: 0 }));

    // Map thống kê member
    const memberStatCounts = new Map<
      string,
      {
        user: any;
        role: string;
        total: number;
        completed: number;
        overdue: number;
      }
    >();

    (boardMembers || []).forEach((bm) => {
      const u = (bm as any).user;
      if (u) {
        memberStatCounts.set(u.id, {
          user: u,
          role: bm.role || 'MEMBER',
          total: 0,
          completed: 0,
          overdue: 0,
        });
      }
    });

    // Map thống kê labels
    const labelStatCounts = new Map<string, { id: string; name: string; color: string; count: number }>();
    (boardLabels || []).forEach((lbl) => {
      labelStatCounts.set(lbl.id, {
        id: lbl.id,
        name: lbl.name,
        color: lbl.color,
        count: 0,
      });
    });

    // Thống kê checklist
    let totalChecklists = 0;
    let totalChecklistItems = 0;
    let completedChecklistItems = 0;

    cards.forEach((card) => {
      const parentList = listMap.get(card.list_id);
      const listTitle = parentList?.title || '';
      const isDone = isCompletedCard(card, listTitle);

      // Cập nhật list counts
      const lStat = listStatCounts.get(card.list_id);
      if (lStat) {
        lStat.total += 1;
        if (isDone) lStat.completed += 1;
      }

      // Check completion status
      if (isDone) {
        completedCards += 1;
      } else {
        const lowerList = listTitle.toLowerCase();
        if (
          card.status === 'IN_PROGRESS' ||
          lowerList.includes('doing') ||
          lowerList.includes('đang làm') ||
          lowerList.includes('in progress') ||
          lowerList.includes('xử lý')
        ) {
          inProgressCards += 1;
        } else {
          todoCards += 1;
        }
      }

      // Check due dates
      if (card.due_date) {
        const dueDate = new Date(card.due_date);
        if (!isDone && dueDate < now) {
          overdueCards += 1;
        } else if (!isDone && dueDate >= now && dueDate <= twoDaysLater) {
          dueSoonCards += 1;
        }

        // Lấy danh sách thẻ quá hạn hoặc sắp đến hạn để cảnh báo
        if (!isDone && (dueDate < now || dueDate <= twoDaysLater)) {
          const assignees = (card.card_assignees || [])
            .map((ca: any) => ca.board_member?.user)
            .filter(Boolean)
            .map((u: any) => ({ name: u.name, avatar: u.avatar }));

          urgentCards.push({
            id: card.id,
            title: card.title,
            dueDate: card.due_date,
            isOverdue: dueDate < now,
            listTitle,
            assignees,
          });
        }
      } else {
        noDueDateCards += 1;
      }

      // Check Assignees
      const cardAssignees = card.card_assignees || [];
      if (cardAssignees.length === 0) {
        unassignedCardsCount += 1;
      } else {
        const isOverdue = !isDone && card.due_date && new Date(card.due_date) < now;
        cardAssignees.forEach((ca: any) => {
          const u = ca.board_member?.user;
          if (u) {
            let mStat = memberStatCounts.get(u.id);
            if (!mStat) {
              mStat = {
                user: u,
                role: ca.board_member?.role || 'MEMBER',
                total: 0,
                completed: 0,
                overdue: 0,
              };
              memberStatCounts.set(u.id, mStat);
            }
            mStat.total += 1;
            if (isDone) mStat.completed += 1;
            if (isOverdue) mStat.overdue += 1;
          }
        });
      }

      // Check Labels
      const cardLabels = card.card_labels || [];
      cardLabels.forEach((cl: any) => {
        const lbl = cl.label;
        if (lbl) {
          let lblStat = labelStatCounts.get(lbl.id);
          if (!lblStat) {
            lblStat = {
              id: lbl.id,
              name: lbl.name,
              color: lbl.color,
              count: 0,
            };
            labelStatCounts.set(lbl.id, lblStat);
          }
          lblStat.count += 1;
        }
      });

      // Check Checklists
      const cls = card.checklists || [];
      totalChecklists += cls.length;
      cls.forEach((cl: any) => {
        const items = cl.items || [];
        totalChecklistItems += items.length;
        items.forEach((item: any) => {
          if (item.is_completed) completedChecklistItems += 1;
        });
      });
    });

    // Sắp xếp urgent cards: Quá hạn trước, sau đó đến sắp hết hạn sớm nhất
    urgentCards.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Tính list stats
    const listStats: ListStat[] = (lists || []).map((l) => {
      const stat = listStatCounts.get(l.id) || { total: 0, completed: 0 };
      const pct = totalCards > 0 ? Math.round((stat.total / totalCards) * 100) : 0;
      return {
        id: l.id,
        title: l.title,
        position: l.position,
        cardCount: stat.total,
        completedCount: stat.completed,
        percentage: pct,
      };
    });

    // Tính member stats
    const members: MemberWorkload[] = Array.from(memberStatCounts.values())
      .map((item) => {
        const rate =
          item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
        return {
          userId: item.user.id,
          name: item.user.name,
          email: item.user.email,
          avatar: item.user.avatar,
          role: item.role,
          assignedCardsCount: item.total,
          completedCardsCount: item.completed,
          overdueCardsCount: item.overdue,
          completionRate: rate,
        };
      })
      .sort((a, b) => b.assignedCardsCount - a.assignedCardsCount);

    // Tính label stats
    const labelStats: LabelStat[] = Array.from(labelStatCounts.values())
      .filter((lbl) => lbl.count > 0)
      .map((lbl) => ({
        id: lbl.id,
        name: lbl.name,
        color: lbl.color,
        cardCount: lbl.count,
        percentage: totalCards > 0 ? Math.round((lbl.count / totalCards) * 100) : 0,
      }))
      .sort((a, b) => b.cardCount - a.cardCount);

    const completionRate =
      totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;
    const overdueRate =
      totalCards > 0 ? Math.round((overdueCards / totalCards) * 100) : 0;

    const checklistRate =
      totalChecklistItems > 0
        ? Math.round((completedChecklistItems / totalChecklistItems) * 100)
        : 0;

    return {
      board: {
        id: board.id,
        name: board.name,
        description: board.description,
      },
      summary: {
        totalCards,
        completedCards,
        inProgressCards,
        todoCards,
        overdueCards,
        dueSoonCards,
        noDueDateCards,
        completionRate,
        overdueRate,
      },
      lists: listStats,
      members,
      unassignedCardsCount,
      labels: labelStats,
      checklists: {
        totalChecklists,
        totalItems: totalChecklistItems,
        completedItems: completedChecklistItems,
        completionRate: checklistRate,
      },
      urgentCards: urgentCards.slice(0, 8),
    };
  }

  async getBoardAiInsights(boardId: string, userId: string): Promise<{
    score: number;
    healthStatus: 'HEALTHY' | 'MODERATE' | 'CRITICAL';
    summary: string;
    bottlenecks: string[];
    workloadAnalysis: string;
    recommendations: string[];
    generatedAt: string;
    source: 'GEMINI' | 'HEURISTIC';
  }> {
    const data = await this.getBoardAnalytics(boardId, userId);
    const { summary, lists, members, checklists, urgentCards } = data;

    // Tính điểm sức khỏe dự án (0 - 100)
    let score = 85;
    if (summary.totalCards > 0) {
      // Trừ điểm vì quá hạn
      score -= summary.overdueRate * 1.5;
      // Cộng điểm hoàn thành
      score += (summary.completionRate - 50) * 0.2;
      // Trừ điểm nếu có nhiều thẻ chưa phân công
      const unassignedRate = Math.round((data.unassignedCardsCount / summary.totalCards) * 100);
      if (unassignedRate > 30) score -= 10;
    }
    score = Math.max(10, Math.min(100, Math.round(score)));

    let healthStatus: 'HEALTHY' | 'MODERATE' | 'CRITICAL' = 'HEALTHY';
    if (score < 50 || summary.overdueRate > 25) {
      healthStatus = 'CRITICAL';
    } else if (score < 75 || summary.overdueRate > 10) {
      healthStatus = 'MODERATE';
    }

    // Thử gọi Gemini AI nếu có client
    const apiKey = this.resolveApiKey();
    if (apiKey) {
      try {
        if (!this.aiClient) {
          this.aiClient = new GoogleGenAI({ apiKey });
        }

        const prompt = `
Bạn là chuyên gia cố vấn quản lý dự án Agile & Scrum (Senior Scrum Master / PM).
Hãy phân tích dữ liệu thống kê bảng Kanban sau đây và đưa ra đánh giá khách quan, thực tế và hành động cụ thể cho đội ngũ:

TÊN BẢNG: "${data.board.name}"
THỐNG KÊ TỔNG QUAN:
- Tổng số thẻ: ${summary.totalCards}
- Đã hoàn thành: ${summary.completedCards} (${summary.completionRate}%)
- Đang xử lý: ${summary.inProgressCards}
- Chưa bắt đầu: ${summary.todoCards}
- Quá hạn: ${summary.overdueCards} (${summary.overdueRate}%)
- Sắp đến hạn trong 48h: ${summary.dueSoonCards}
- Thẻ chưa giao cho ai: ${data.unassignedCardsCount}
- Checklists: ${checklists.completedItems}/${checklists.totalItems} mục hoàn thành (${checklists.completionRate}%)

PHÂN BỔ THEO CỘT:
${lists.map((l) => `- Cột "${l.title}": ${l.cardCount} thẻ (${l.percentage}%)`).join('\n')}

PHÂN BỔ THÀNH VIÊN:
${members.map((m) => `- ${m.name}: ${m.assignedCardsCount} thẻ (Quá hạn: ${m.overdueCardsCount}, Hoàn thành: ${m.completedCardsCount})`).join('\n')}

DANH SÁCH THẺ CẦN CHÚ Ý GẤP:
${urgentCards.map((c) => `- [${c.isOverdue ? 'QUÁ HẠN' : 'SẮP ĐẾN HẠN'}] "${c.title}" (Hạn: ${c.dueDate}, Cột: ${c.listTitle})`).join('\n') || 'Không có thẻ quá hạn'}

Yêu cầu trả về đúng định dạng JSON (không dùng markdown code block, chỉ trả về JSON thuần):
{
  "summary": "Tóm tắt 2-3 câu ngắn gọn về sức khỏe hiện tại của bảng và tiến độ tổng quan",
  "bottlenecks": [
    "Điểm nghẽn 1 (nếu có cột nào dồn ứ hoặc tình trạng trễ hạn)",
    "Điểm nghẽn 2"
  ],
  "workloadAnalysis": "Nhận xét 1-2 câu về sự phân bổ khối lượng công việc giữa các thành viên (ai quá tải, ai chưa được giao việc)",
  "recommendations": [
    "Hành động cụ thể 1 nên làm ngay hôm nay",
    "Hành động cụ thể 2",
    "Hành động cụ thể 3"
  ]
}
        `.trim();

        const candidateModels = [
          'gemini-2.5-flash',
          'gemini-1.5-flash',
          'gemini-1.5-pro',
        ];

        let aiResponseText = '';
        for (const model of candidateModels) {
          try {
            const resp = await this.aiClient.models.generateContent({
              model,
              contents: prompt,
            });
            aiResponseText = resp?.text || '';
            if (aiResponseText) break;
          } catch (mErr) {
            this.logger.debug(`Model ${model} thất bại: ${mErr?.message || mErr}`);
          }
        }

        if (aiResponseText) {
          let cleanJson = aiResponseText.trim();
          if (cleanJson.startsWith('```json')) {
            cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }

          const parsed = JSON.parse(cleanJson);
          return {
            score,
            healthStatus,
            summary: parsed.summary || 'Dự án đang tiến triển theo kế hoạch.',
            bottlenecks: parsed.bottlenecks || [],
            workloadAnalysis: parsed.workloadAnalysis || 'Khối lượng công việc phân bổ tương đối đồng đều.',
            recommendations: parsed.recommendations || [],
            generatedAt: new Date().toISOString(),
            source: 'GEMINI',
          };
        }
      } catch (aiErr) {
        this.logger.warn(`AI Insight fallback sang Heuristic: ${aiErr?.message || aiErr}`);
      }
    }

    // Heuristic Fallback (Quy tắc thông minh nếu không có API key hoặc lỗi mạng)
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];

    if (summary.overdueCards > 0) {
      bottlenecks.push(
        `Có ${summary.overdueCards} công việc bị trễ hạn (${summary.overdueRate}% tổng số thẻ), tập trung chủ yếu ở các thẻ deadline cũ.`,
      );
      recommendations.push(
        `Rà soát lại ${summary.overdueCards} thẻ quá hạn, dời deadline thực tế hoặc phân bổ thêm người hỗ trợ.`,
      );
    }

    if (data.unassignedCardsCount > 0) {
      bottlenecks.push(
        `Còn ${data.unassignedCardsCount} thẻ chưa được phân công người phụ trách, có nguy cơ bị bỏ sót.`,
      );
      recommendations.push(
        `Chỉ định thành viên chịu trách nhiệm cho ${data.unassignedCardsCount} thẻ chưa được gán.`,
      );
    }

    // Kiểm tra member ôm đồm
    const overloadedMember = members.find(
      (m) => m.assignedCardsCount >= 5 && m.overdueCardsCount >= 2,
    );
    let workloadAnalysis = 'Phân bổ công việc giữa các thành viên đang ở mức cân bằng.';
    if (overloadedMember) {
      workloadAnalysis = `Thành viên ${overloadedMember.name} đang phụ trách ${overloadedMember.assignedCardsCount} thẻ và có ${overloadedMember.overdueCardsCount} thẻ quá hạn.`;
      recommendations.push(
        `San bớt công việc từ ${overloadedMember.name} sang các thành viên có ít việc hơn để giải tỏa áp lực.`,
      );
    }

    if (checklists.totalItems > 0 && checklists.completionRate < 40) {
      bottlenecks.push(
        `Tỷ lệ hoàn thành Checklist chỉ đạt ${checklists.completionRate}%, cho thấy các đầu việc chi tiết đang bị nghẽn.`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Duy trì nhịp độ làm việc hiện tại và cập nhật tiến độ đều đặn mỗi ngày.');
      recommendations.push('Kiểm tra các công việc sắp tới trong tuần để chuẩn bị tài nguyên.');
    }

    const summaryText =
      healthStatus === 'CRITICAL'
        ? `Bảng "${data.board.name}" đang có dấu hiệu chậm tiến độ với ${summary.overdueCards} thẻ quá hạn. Cần tái cơ cấu ưu tiên ngay.`
        : healthStatus === 'MODERATE'
        ? `Bảng "${data.board.name}" đang vận hành ở mức trung bình (${summary.completionRate}% hoàn thành). Cần xử lý sớm các thẻ sắp tới hạn.`
        : `Bảng "${data.board.name}" có chỉ số vận hành rất tốt, tỷ lệ hoàn thành đạt ${summary.completionRate}% và ít rủi ro deadline.`;

    return {
      score,
      healthStatus,
      summary: summaryText,
      bottlenecks: bottlenecks.slice(0, 3),
      workloadAnalysis,
      recommendations: recommendations.slice(0, 4),
      generatedAt: new Date().toISOString(),
      source: 'HEURISTIC',
    };
  }
}
