package com.promptcraft.controller;

import com.promptcraft.common.ApiResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public ApiResult<Map<String, Object>> health() {
        return ApiResult.success(Map.of(
                "status", "ok",
                "timestamp", System.currentTimeMillis()
        ));
    }
}
