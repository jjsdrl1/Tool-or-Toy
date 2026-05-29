package com.promptcraft.controller;

import com.promptcraft.common.ApiResult;
import com.promptcraft.config.AppProperties;
import com.promptcraft.dto.RunRequestDTO;
import com.promptcraft.entity.RunRecord;
import com.promptcraft.service.PromptRunService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.concurrent.Executor;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RunController {

    private final PromptRunService promptRunService;
    private final AppProperties appProperties;

    @Qualifier("sseExecutor")
    private final Executor sseExecutor;

    /**
     * SSE streaming run.
     * POST body: {versionId, presetId, variablesJson}
     * Response: text/event-stream with events: chunk / stats / done / error
     */
    @PostMapping(value = "/runs/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamRun(@Valid @RequestBody RunRequestDTO dto,
                                HttpServletResponse response) {
        // 显式写入 SSE 关键响应头：Nginx/Cloudflare 等反代默认会缓冲响应体，
        // 没有 X-Accel-Buffering: no 时流式输出会被切成大块到达客户端。
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache");
        response.setContentType("text/event-stream;charset=UTF-8");

        long timeoutMs = appProperties.getSse().getTimeoutMs();
        SseEmitter emitter = new SseEmitter(timeoutMs);

        // Handle emitter lifecycle hooks
        emitter.onTimeout(emitter::complete);
        emitter.onError(e -> {
            log.debug("SSE emitter error: {}", e.getMessage());
            emitter.complete();
        });

        // Execute on SSE thread pool to avoid blocking the request thread
        sseExecutor.execute(() -> promptRunService.streamRun(dto, emitter));

        return emitter;
    }

    /**
     * Non-streaming run. Blocks until complete, returns the saved RunRecord.
     */
    @PostMapping("/runs")
    public ApiResult<RunRecord> runSync(@Valid @RequestBody RunRequestDTO dto) {
        return ApiResult.success(promptRunService.runSync(dto));
    }

    /**
     * Get run history for a project (paginated, default page=1 size=20).
     */
    @GetMapping("/projects/{projectId}/runs")
    public ApiResult<List<RunRecord>> listByProject(@PathVariable Long projectId) {
        return ApiResult.success(promptRunService.listByProject(projectId));
    }

    /**
     * Get run history for a specific version.
     */
    @GetMapping("/versions/{versionId}/runs")
    public ApiResult<List<RunRecord>> listByVersion(@PathVariable Long versionId) {
        return ApiResult.success(promptRunService.listByVersion(versionId));
    }

    /**
     * Get a single run record.
     */
    @GetMapping("/runs/{id}")
    public ApiResult<RunRecord> getById(@PathVariable Long id) {
        return ApiResult.success(promptRunService.getById(id));
    }
}
