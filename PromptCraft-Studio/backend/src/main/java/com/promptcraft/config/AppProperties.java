package com.promptcraft.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Data
@Component
@ConfigurationProperties(prefix = "promptcraft")
public class AppProperties {

    private String appSecret;

    private Sse sse = new Sse();

    private Cors cors = new Cors();

    private PresetTest presetTest = new PresetTest();

    @Data
    public static class Sse {
        private long timeoutMs = 180000L;
        private int executorCorePoolSize = 10;
        private int executorMaxPoolSize = 50;
    }

    @Data
    public static class Cors {
        private List<String> allowedOrigins = List.of("http://localhost:5173");
    }

    /** 模型配置「测试连接」按钮的网络超时（毫秒）。国内 LLM 冷启动经常 10s 起步，默认 30s。 */
    @Data
    public static class PresetTest {
        private long connectTimeoutMs = 10000L;
        private long requestTimeoutMs = 30000L;
    }
}
