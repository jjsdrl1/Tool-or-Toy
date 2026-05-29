package com.promptcraft.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

/**
 * AES-256-GCM 加解密工具。
 * 每次加密随机生成 IV，格式：Base64(iv[12] + ciphertext + gcmTag[16])
 */
@Component
public class ApiKeyEncryptor {

    private static final int IV_LENGTH = 12;
    private static final int GCM_TAG_BITS = 128;

    private final byte[] keyBytes;

    public ApiKeyEncryptor(@Value("${promptcraft.app-secret}") String appSecret) {
        try {
            this.keyBytes = MessageDigest.getInstance("SHA-256")
                    .digest(appSecret.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new RuntimeException("ApiKeyEncryptor init failed", e);
        }
    }

    public String encrypt(String plainKey) {
        if (plainKey == null || plainKey.isBlank()) return null;
        try {
            byte[] iv = new byte[IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE,
                    new SecretKeySpec(keyBytes, "AES"),
                    new GCMParameterSpec(GCM_TAG_BITS, iv));

            byte[] ciphertext = cipher.doFinal(plainKey.getBytes(StandardCharsets.UTF_8));

            // Concatenate iv + ciphertext
            byte[] combined = new byte[IV_LENGTH + ciphertext.length];
            System.arraycopy(iv, 0, combined, 0, IV_LENGTH);
            System.arraycopy(ciphertext, 0, combined, IV_LENGTH, ciphertext.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed", e);
        }
    }

    public String decrypt(String encryptedKey) {
        if (encryptedKey == null || encryptedKey.isBlank()) return null;
        try {
            byte[] combined = Base64.getDecoder().decode(encryptedKey);
            byte[] iv = Arrays.copyOfRange(combined, 0, IV_LENGTH);
            byte[] ciphertext = Arrays.copyOfRange(combined, IV_LENGTH, combined.length);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE,
                    new SecretKeySpec(keyBytes, "AES"),
                    new GCMParameterSpec(GCM_TAG_BITS, iv));

            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Decryption failed", e);
        }
    }
}
