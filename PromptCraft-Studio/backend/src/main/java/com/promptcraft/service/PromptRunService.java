package com.promptcraft.service;

import com.promptcraft.dto.RunRequestDTO;
import com.promptcraft.entity.RunRecord;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

public interface PromptRunService {

    /**
     * Execute a streaming run. Sends SSE events (chunk / stats / done / error) to the emitter.
     * Must be called from a non-request thread (e.g. sseExecutor).
     */
    void streamRun(RunRequestDTO dto, SseEmitter emitter);

    /**
     * Execute a non-streaming (blocking) run and return the saved RunRecord.
     */
    RunRecord runSync(RunRequestDTO dto);

    List<RunRecord> listByProject(Long projectId);

    List<RunRecord> listByVersion(Long versionId);

    RunRecord getById(Long id);
}
