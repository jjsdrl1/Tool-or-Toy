package com.promptcraft;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties
public class PromptCraftApplication {

    public static void main(String[] args) {
        SpringApplication.run(PromptCraftApplication.class, args);
    }
}
