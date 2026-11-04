'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Trash2,
  ExternalLink,
  ChevronRight,
  UserPlus,
  AlertCircle,
  Clock,
  ArrowUpDown,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface BoardTableViewProps {
  board: any;
  onOpenCardDetail: (cardId: string) => void;
  onRefreshBoard: () => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
}

export default function BoardTableView({
  board,
  onOpenCardDetail,
  onRefreshBoard,
  onDeleteCard,
}: BoardTableViewProps) {
  const canEdit = Boolean(board?.canEdit && !board?.is_archived);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedListFilter, setSelectedListFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'overdue'>('all');
  const [sortField, setSortField] = useState<'title' | 'due_date' | 'list'>('list');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Quick inline add card state
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardListId, setNewCardListId] = useState(board?.lists?.[0]?.id || '');
  const [isSubmittingCard, setIsSubmittingCard] = useState(false);

  // Flatten cards with list metadata
  const allCards = useMemo(() => {
    if (!board?.lists) return [];
    const cards: any[] = [];
    board.lists.forEach((list: any) => {
      (list.cards || []).forEach((c: any) => {
        cards.push({
          ...c,
          listName: list.title,
          listId: list.id,
        });
      });
    });
    return cards;
  }, [board]);

  // Filtered & sorted cards
  const filteredCards = useMemo(() => {
    let result = [...allCards];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
      );
    }

    // Filter by list
    if (selectedListFilter !== 'all') {
      result = result.filter((c) => c.listId === selectedListFilter);
    }

    // Filter by status
    const now = Date.now();
    if (statusFilter === 'completed') {
      result = result.filter((c) => c.is_due_date_completed);
    } else if (statusFilter === 'in_progress') {
      result = result.filter((c) => !c.is_due_date_completed);
    } else if (statusFilter === 'overdue') {
      result = result.filter((c) => {
        if (!c.due_date || c.is_due_date_completed) return false;
        return new Date(c.due_date).getTime() < now;
      });
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'title') {
        comparison = (a.title || '').localeCompare(b.title || '');
      } else if (sortField === 'list') {
        comparison = (a.listName || '').localeCompare(b.listName || '');
      } else if (sortField === 'due_date') {
        const timeA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const timeB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        comparison = timeA - timeB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [allCards, searchQuery, selectedListFilter, statusFilter, sortField, sortOrder]);

  // Toggle card completion
  const handleToggleComplete = async (card: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    try {
      await apiClient(`/cards/${card.id}`, {
        method: 'PATCH',
        data: { is_due_date_completed: !card.is_due_date_completed },
      });
      await onRefreshBoard();
    } catch (err) {
      console.error('Lỗi khi đổi trạng thái hoàn thành thẻ:', err);
    }
  };

  // Move card to a different list
  const handleChangeList = async (cardId: string, newListId: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    if (!canEdit) return;
    try {
      await apiClient(`/cards/${cardId}/move`, {
        method: 'PATCH',
        data: { targetListId: newListId, position: 0 },
      });
      await onRefreshBoard();
    } catch (err) {
      console.error('Lỗi chuyển danh sách:', err);
    }
  };

  // Quick add card
  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim() || !newCardListId) return;

    try {
      setIsSubmittingCard(true);
      await apiClient(`/lists/${newCardListId}/cards`, {
        method: 'POST',
        data: { title: newCardTitle.trim() },
      });
      setNewCardTitle('');
      setIsAddingCard(false);
      await onRefreshBoard();
    } catch (err) {
      console.error('Lỗi tạo thẻ:', err);
    } finally {
      setIsSubmittingCard(false);
    }
  };

  // Due date status pill helper
  const renderDueDateBadge = (card: any) => {
    if (!card.due_date) {
      return (
        <span className="text-slate-400 text-xs italic">
          Chưa thiết lập
        </span>
      );
    }

    const dueTime = new Date(card.due_date).getTime();
    const now = Date.now();
    const diffHours = (dueTime - now) / (1000 * 60 * 60);

    if (card.is_due_date_completed) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-xs text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>{new Date(card.due_date).toLocaleDateString('vi-VN')}</span>
          <span className="text-[9px] uppercase font-bold">(Đã xong)</span>
        </span>
      );
    }

    if (diffHours < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-xs text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          <span>{new Date(card.due_date).toLocaleDateString('vi-VN')}</span>
          <span className="text-[9px] uppercase">(Quá hạn)</span>
        </span>
      );
    }

    if (diffHours <= 24) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-xs text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>{new Date(card.due_date).toLocaleDateString('vi-VN')}</span>
          <span className="text-[9px] uppercase">(Gần hạn)</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-xs text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
        <Calendar className="w-3 h-3 text-slate-500" />
        <span>{new Date(card.due_date).toLocaleDateString('vi-VN')}</span>
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 max-w-7xl mx-auto w-full">
      {/* Table Filter & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-2.5 rounded-lg bg-white border border-slate-300 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm thẻ..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-300 w-48 sm:w-60 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-colors bg-white font-medium"
            />
          </div>

          {/* Filter by List */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedListFilter}
              onChange={(e) => setSelectedListFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-md border border-slate-300 text-xs font-medium text-slate-800 cursor-pointer focus:outline-none bg-white"
            >
              <option value="all">Tất cả danh sách ({board?.lists?.length || 0})</option>
              {board?.lists?.map((list: any) => (
                <option key={list.id} value={list.id}>
                  {list.title} ({list.cards?.length || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Status */}
          <div className="flex items-center gap-1 p-0.5 rounded-md border border-slate-200 bg-slate-100 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'in_progress'
                  ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đang làm
            </button>
            <button
              onClick={() => setStatusFilter('overdue')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'overdue'
                  ? 'bg-rose-600 text-white font-semibold shadow-2xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              Quá hạn
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Đã xong
            </button>
          </div>
        </div>

        {/* Right Action: Add Card Button */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Tổng cộng: <strong className="text-slate-900">{filteredCards.length}</strong> thẻ
          </span>
          {!board?.is_archived && board?.canEdit && (
            <button
              onClick={() => {
                setIsAddingCard(true);
                setNewCardListId(board?.lists?.[0]?.id || '');
              }}
              className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm thẻ</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table View Container */}
      <div className="flex-1 overflow-auto rounded-lg bg-white border border-slate-300 shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
            <tr className="text-slate-700 font-semibold text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3 w-10 text-center">Xong</th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => {
                  setSortField('title');
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span>Thẻ công việc</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors w-44"
                onClick={() => {
                  setSortField('list');
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span>Danh sách</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-3 w-40">Thành viên</th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors w-44"
                onClick={() => {
                  setSortField('due_date');
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span>Thời hạn</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-3 w-36">Tiến độ Checklist</th>
              <th className="py-2.5 px-3 w-40">Nhãn</th>
              <th className="py-2.5 px-3 w-16 text-center">Thao tác</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100">
            {/* Inline Quick Add Card Row */}
            {isAddingCard && (
              <tr className="bg-slate-50 border-b border-slate-200 animate-fade-in">
                <td className="py-2 px-3 text-center">
                  <Circle className="w-4 h-4 text-slate-400 mx-auto" />
                </td>
                <td className="py-2 px-3">
                  <form onSubmit={handleCreateCard} className="flex items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      placeholder="Nhập tiêu đề thẻ mới và nhấn Enter..."
                      className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-slate-800"
                    />
                  </form>
                </td>
                <td className="py-2 px-3">
                  <select
                    value={newCardListId}
                    onChange={(e) => setNewCardListId(e.target.value)}
                    className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-md px-2 py-1.5"
                  >
                    {board?.lists?.map((l: any) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                </td>
                <td colSpan={4} className="py-2 px-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingCard(false)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleCreateCard}
                      disabled={!newCardTitle.trim() || isSubmittingCard}
                      className="px-3 py-1 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {isSubmittingCard ? 'Đang thêm...' : 'Lưu thẻ'}
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty State */}
            {filteredCards.length === 0 && !isAddingCard && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <p className="text-sm font-semibold text-slate-700">Không tìm thấy thẻ nào phù hợp</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Hãy thử thay đổi bộ lọc hoặc thêm thẻ mới vào bảng
                  </p>
                </td>
              </tr>
            )}

            {/* Card Rows */}
            {filteredCards.map((card) => {
              // Checklist calculation
              const totalItems = card.checklists?.reduce(
                (acc: number, cl: any) => acc + (cl.items?.length || 0),
                0
              ) || 0;
              const completedItems = card.checklists?.reduce(
                (acc: number, cl: any) =>
                  acc + (cl.items?.filter((it: any) => it.is_completed)?.length || 0),
                0
              ) || 0;
              const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

              return (
                <tr
                  key={card.id}
                  onClick={() => onOpenCardDetail(card.id)}
                  className="group hover:bg-slate-50 transition-colors cursor-pointer text-slate-800 select-none"
                >
                  {/* Completed Checkbox */}
                  <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      disabled={!canEdit}
                      onClick={(e) => handleToggleComplete(card, e)}
                      className="text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title={card.is_due_date_completed ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu đã hoàn thành'}
                    >
                      {card.is_due_date_completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                  </td>

                  {/* Card Title & Meta */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium text-xs transition-colors ${
                          card.is_due_date_completed
                            ? 'line-through text-slate-400'
                            : 'text-slate-900 group-hover:text-blue-600'
                        }`}
                      >
                        {card.title}
                      </span>

                      {/* Small badge counts */}
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 ml-1">
                        {card.description && (
                          <span title="Có phần mô tả">📝</span>
                        )}
                        {(card.comments?.length > 0 || card._count?.comments > 0) && (
                          <span className="flex items-center gap-0.5">
                            <MessageSquare className="w-3 h-3 text-slate-400" />
                            <span>{card.comments?.length || card._count?.comments}</span>
                          </span>
                        )}
                        {(card.attachments?.length > 0 || card._count?.attachments > 0) && (
                          <span className="flex items-center gap-0.5">
                            <Paperclip className="w-3 h-3 text-slate-400" />
                            <span>{card.attachments?.length || card._count?.attachments}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* List Selector Dropdown */}
                  <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      disabled={!canEdit}
                      value={card.listId}
                      onChange={(e) => handleChangeList(card.id, e.target.value, e)}
                      className="px-2 py-1 rounded-md text-xs font-medium bg-slate-50 hover:bg-white border border-slate-200 text-slate-700 cursor-pointer focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {board?.lists?.map((l: any) => (
                        <option key={l.id} value={l.id}>
                          {l.title}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Members / Assignees */}
                  <td className="py-2.5 px-3">
                    {card.card_assignees?.length > 0 ? (
                      <div className="flex items-center -space-x-1.5">
                        {card.card_assignees.map((ca: any, idx: number) => (
                          <div
                            key={ca.id || idx}
                            className="w-5 h-5 rounded-full bg-slate-800 text-white border-2 border-white flex items-center justify-center text-[9px] font-semibold"
                            title={ca.user?.name || 'Thành viên'}
                          >
                            {ca.user?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs italic">Chưa gán</span>
                    )}
                  </td>

                  {/* Due Date */}
                  <td className="py-2.5 px-3">
                    {renderDueDateBadge(card)}
                  </td>

                  {/* Progress Checklist Bar */}
                  <td className="py-2.5 px-3">
                    {totalItems > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-xs overflow-hidden">
                          <div
                            className={`h-full rounded-xs transition-all ${
                              percent === 100 ? 'bg-emerald-600' : 'bg-slate-700'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 shrink-0">
                          {completedItems}/{totalItems} ({percent}%)
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs italic">-</span>
                    )}
                  </td>

                  {/* Labels */}
                  <td className="py-2.5 px-3">
                    {card.card_labels?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {card.card_labels.map((cl: any) => (
                          <span
                            key={cl.label?.id || Math.random()}
                            className="px-1.5 py-0.2 rounded-xs text-[10px] font-semibold text-white"
                            style={{ backgroundColor: cl.label?.color || '#3b82f6' }}
                          >
                            {cl.label?.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs italic">-</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onOpenCardDetail(card.id)}
                        className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        title="Xem chi tiết thẻ"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => onDeleteCard(card.id)}
                          className="p-1 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Xóa thẻ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
