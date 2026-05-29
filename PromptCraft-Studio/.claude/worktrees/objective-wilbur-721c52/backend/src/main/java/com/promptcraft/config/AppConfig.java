package com.promptcraft.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@RequiredArgsConstructor
public class AppConfig {

    private final AppProperties appProperties;

    @Bean("sseExecutor")
    public Executor sseExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(appProperties.getSse().getExecutorCorePoolSize());
        executor.setMaxPoolSize(appProperties.getSse().getExecutorMaxPoolSize());
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("sse-stream-");
        executor.setKeepAliveSeconds(60);
        executor.initialize();
        return executor;
    }

    /** Dedicated pool for batch test coordination — isolated from SSE threads */
    @Bean("batchExecutor")
    public Executor batchExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("batch-run-");
        executor.setKeepAliveSeconds(60);
        executor.initialize();
        return executor;
    }
}
