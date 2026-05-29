-- Add batch compare group table and link column to batch_run
-- Run this on existing databases that already have the init.sql schema

CREATE TABLE IF NOT EXISTS batch_compare_group (
    id            BIGINT       PRIMARY KEY AUTO_INCREMENT,
    project_id    BIGINT       NOT NULL,
    mode          VARCHAR(32)  NOT NULL          COMMENT 'compare_versions / compare_presets',
    status        VARCHAR(32)  NOT NULL DEFAULT 'pending'
                                        COMMENT 'pending / running / done / failed',
    name          VARCHAR(256)                   COMMENT '对比任务名称',
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at   DATETIME     NULL,
    INDEX idx_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='批量对比组表';

ALTER TABLE batch_run
    ADD COLUMN compare_group_id BIGINT NULL COMMENT '关联对比组 ID（可选）' AFTER preset_id;
