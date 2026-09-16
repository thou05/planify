-- USER
CREATE INDEX idx_users_email
ON public.users(email);

-- WORKSPACE
CREATE INDEX idx_workspaces_owner
ON public.workspaces(owner_id);

CREATE INDEX idx_workspace_members_workspace
ON public.workspace_members(workspace_id);

CREATE INDEX idx_workspace_members_user
ON public.workspace_members(user_id);

CREATE INDEX idx_workspace_invites_workspace
ON public.workspace_invites(workspace_id);

-- NOTIFICATION
CREATE INDEX idx_notifications_user
ON public.notifications(user_id);

CREATE INDEX idx_notifications_user_read
ON public.notifications(user_id, is_read);

-- ACTIVITY
CREATE INDEX idx_activity_logs_workspace
ON public.activity_logs(workspace_id);

CREATE INDEX idx_activity_logs_user
ON public.activity_logs(user_id);

-- BOARD
CREATE INDEX idx_boards_workspace
ON public.boards(workspace_id);

CREATE INDEX idx_board_members_board
ON public.board_members(board_id);

CREATE INDEX idx_board_members_user
ON public.board_members(user_id);

-- LIST
CREATE INDEX idx_lists_board_position
ON public.lists(board_id, position);

-- CARD
CREATE INDEX idx_cards_list_position
ON public.cards(list_id, position);

CREATE INDEX idx_cards_created_by
ON public.cards(created_by);

CREATE INDEX idx_cards_due_date
ON public.cards(due_date);

-- CARD ASSIGNEE
CREATE INDEX idx_card_assignees_board_member
ON public.card_assignees(board_member_id);

-- LABEL
CREATE INDEX idx_labels_board
ON public.labels(board_id);

CREATE INDEX idx_card_labels_label
ON public.card_labels(label_id);

-- CHECKLIST
CREATE INDEX idx_checklists_card
ON public.checklists(card_id);

CREATE INDEX idx_checklist_items_checklist
ON public.checklist_items(checklist_id);

-- COMMENT
CREATE INDEX idx_comments_card_created
ON public.comments(card_id, created_at);

CREATE INDEX idx_comments_user
ON public.comments(user_id);

-- ATTACHMENT
CREATE INDEX idx_attachments_card
ON public.attachments(card_id);

-- RELATION
CREATE INDEX idx_card_relations_related
ON public.card_relations(related_card_id);

-- CUSTOM FIELD
CREATE INDEX idx_custom_fields_board
ON public.custom_fields(board_id);

CREATE INDEX idx_custom_field_values_card
ON public.custom_field_values(card_id);

CREATE INDEX idx_custom_field_values_field
ON public.custom_field_values(field_id);

-- AUTOMATION
CREATE INDEX idx_automation_rules_board
ON public.automation_rules(board_id);

CREATE INDEX idx_automation_actions_rule
ON public.automation_actions(rule_id);
