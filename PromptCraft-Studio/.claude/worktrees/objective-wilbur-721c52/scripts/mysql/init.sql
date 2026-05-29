CREATE DATABASE IF NOT EXISTS promptcraft
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE promptcraft;

CREATE TABLE IF NOT EXISTS project (
    id                BIGINT       PRIMARY KEY AUTO_INCREMENT,
    name              VARCHAR(128) NOT NULL          COMMENT '项目名称',
    description       TEXT                           COMMENT '项目描述',
    tags              JSON                           COMMENT '标签数组 ["summary","translation"]',
    stable_version_id BIGINT       NULL              COMMENT '当前 stable 版本 ID（唯一真相源）',
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Prompt 项目表';

CREATE TABLE IF NOT EXISTS prompt_version (
    id              BIGINT        PRIMARY KEY AUTO_INCREMENT,
    project_id      BIGINT        NOT NULL            COMMENT '所属项目 ID',
    version_no      INT           NOT NULL            COMMENT '版本号，项目内递增',
    system_prompt   MEDIUMTEXT                        COMMENT 'System Prompt 内容',
    user_prompt     MEDIUMTEXT    NOT NULL            COMMENT 'User Prompt 内容（含 {{变量}}）',
    note            VARCHAR(512)                      COMMENT '版本备注（必填）',
    status          VARCHAR(32)   NOT NULL DEFAULT 'draft'
                                                      COMMENT 'draft / stable / deprecated',
    model_provider  VARCHAR(64)                       COMMENT '测试时使用的模型提供商',
    model_name      VARCHAR(128)                      COMMENT '测试时使用的模型名称',
    temperature     DECIMAL(4,2)                      COMMENT '测试时使用的 temperature',
    max_tokens      INT                               COMMENT '测试时使用的 max_tokens',
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX  idx_project_id (project_id),
    UNIQUE KEY uk_project_version (project_id, version_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Prompt 版本表';

CREATE TABLE IF NOT EXISTS api_preset (
    id                BIGINT        PRIMARY KEY AUTO_INCREMENT,
    name              VARCHAR(128)  NOT NULL            COMMENT '配置预设名称',
    provider          VARCHAR(64)   NOT NULL            COMMENT 'openai / anthropic / ollama 等',
    base_url          VARCHAR(512)                      COMMENT 'API Base URL',
    api_key_encrypted TEXT                              COMMENT 'AES-256-GCM 加密后的 API Key',
    model_name        VARCHAR(128)  NOT NULL            COMMENT '模型名称',
    temperature       DECIMAL(4,2)  DEFAULT 0.70,
    max_tokens        INT           DEFAULT 1024,
    enabled           BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='模型 API 配置表';

CREATE TABLE IF NOT EXISTS test_case (
    id              BIGINT        PRIMARY KEY AUTO_INCREMENT,
    project_id      BIGINT        NOT NULL            COMMENT '所属项目 ID',
    name            VARCHAR(128)  NOT NULL            COMMENT '样例名称',
    variables_json  JSON          NOT NULL            COMMENT '变量键值对 {"role":"翻译","content":"..."}',
    expected_output TEXT                              COMMENT '期望输出（可选，供参考）',
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='测试样例表';

CREATE TABLE IF NOT EXISTS run_record (
    id                      BIGINT        PRIMARY KEY AUTO_INCREMENT,
    project_id              BIGINT        NOT NULL,
    version_id              BIGINT        NULL              COMMENT '关联版本 ID',
    api_preset_id           BIGINT        NULL              COMMENT '关联配置预设 ID',
    variables_json          JSON          NOT NULL          COMMENT '本次运行的变量值',
    rendered_system_prompt  MEDIUMTEXT                      COMMENT '变量填充后的 System Prompt',
    rendered_user_prompt    MEDIUMTEXT                      COMMENT '变量填充后的 User Prompt',
    output_text             MEDIUMTEXT                      COMMENT '模型输出文本',
    input_chars             INT                             COMMENT '输入字符数',
    output_chars            INT                             COMMENT '输出字符数',
    input_tokens            INT                             COMMENT '输入 token 数',
    output_tokens           INT                             COMMENT '输出 token 数',
    latency_ms              INT                             COMMENT '响应耗时（毫秒）',
    success                 BOOLEAN       NOT NULL DEFAULT TRUE,
    error_message           TEXT,
    model_provider          VARCHAR(64),
    model_name              VARCHAR(128),
    created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_project_id (project_id),
    INDEX idx_version_id  (version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='运行记录表';

CREATE TABLE IF NOT EXISTS compare_record (
    id                BIGINT    PRIMARY KEY AUTO_INCREMENT,
    project_id        BIGINT    NOT NULL,
    version_a_id      BIGINT    NOT NULL,
    version_b_id      BIGINT    NOT NULL,
    run_a_id          BIGINT    NULL,
    run_b_id          BIGINT    NULL,
    winner_version_id BIGINT    NULL            COMMENT '人工标注的更优版本',
    reason            TEXT                      COMMENT '标注原因',
    created_at        DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='版本对比记录表';

CREATE TABLE IF NOT EXISTS batch_run (
    id            BIGINT       PRIMARY KEY AUTO_INCREMENT,
    project_id    BIGINT       NOT NULL,
    version_id    BIGINT       NOT NULL,
    preset_id     BIGINT       NULL                   COMMENT '使用的模型配置 ID',
    compare_group_id BIGINT   NULL                   COMMENT '关联对比组 ID（可选）',
    status        VARCHAR(32)  NOT NULL DEFAULT 'pending'
                                        COMMENT 'pending / running / done / failed',
    total_count   INT          DEFAULT 0,
    success_count INT          DEFAULT 0,
    failed_count  INT          DEFAULT 0,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at   DATETIME     NULL,
    INDEX idx_project_id (project_id),
    INDEX idx_version_id (version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='批量运行任务表';

CREATE TABLE IF NOT EXISTS batch_run_item (
    id            BIGINT      PRIMARY KEY AUTO_INCREMENT,
    batch_run_id  BIGINT      NOT NULL,
    test_case_id  BIGINT      NOT NULL,
    run_record_id BIGINT      NULL              COMMENT '关联 run_record（成功后填入）',
    status        VARCHAR(32) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_batch_run_id (batch_run_id),
    INDEX idx_test_case_id (test_case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='批量运行明细表';

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

CREATE TABLE IF NOT EXISTS variable_snapshot (
    id              BIGINT       PRIMARY KEY AUTO_INCREMENT,
    version_id      BIGINT       NOT NULL              COMMENT '所属版本 ID',
    name            VARCHAR(128) NOT NULL              COMMENT '变量组名称',
    variables_json  JSON         NOT NULL              COMMENT '变量键值对 JSON',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_version_id (version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='版本变量组快照表';
