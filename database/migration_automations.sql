-- ==============================================================================
-- MIGRATION: HỆ THỐNG AUTOMATION (TRELLO BUTLER STYLE) CHO PLANIFY
-- ==============================================================================

-- 1. Bảng lưu trữ định nghĩa Automation (Rules, Scheduled, Due Date, Card & Board Buttons)
CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'RULE', -- 'RULE' | 'SCHEDULED' | 'DUE_DATE' | 'CARD_BUTTON' | 'BOARD_BUTTON'
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  button_icon VARCHAR(50) DEFAULT 'Sparkles',
  button_label VARCHAR(100),
  trigger_type VARCHAR(50) NOT NULL, -- 'CARD_MOVED' | 'CARD_CREATED' | 'CARD_COMPLETED' | 'CARD_DUE_DATE_CHANGED' | 'DUE_DATE_APPROACHING' | 'SCHEDULED' | 'CARD_BUTTON_CLICKED' | 'BOARD_BUTTON_CLICKED' | 'CHECKLIST_COMPLETED'
  trigger_config JSONB DEFAULT '{}'::jsonb,
  conditions JSONB DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Bảng lưu trữ lịch sử thực thi (Automation Execution Logs)
CREATE TABLE IF NOT EXISTS automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES automations(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  trigger_event VARCHAR(50) NOT NULL,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS', -- 'SUCCESS' | 'FAILED' | 'PARTIAL'
  actions_total INT NOT NULL DEFAULT 0,
  actions_succeeded INT NOT NULL DEFAULT 0,
  error_message TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tạo các chỉ mục (Indexes) để tối ưu hóa truy vấn
CREATE INDEX IF NOT EXISTS idx_automations_board_id ON automations(board_id);
CREATE INDEX IF NOT EXISTS idx_automations_type ON automations(type);
CREATE INDEX IF NOT EXISTS idx_automations_is_enabled ON automations(is_enabled);
CREATE INDEX IF NOT EXISTS idx_automations_trigger_type ON automations(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automation_executions_board_id ON automation_executions(board_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_automation_id ON automation_executions(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_started_at ON automation_executions(started_at DESC);
