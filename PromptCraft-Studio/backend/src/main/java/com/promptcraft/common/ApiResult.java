package com.promptcraft.common;

import lombok.Getter;

@Getter
public class ApiResult<T> {

    private final boolean success;
    private final int code;
    private final String message;
    private final T data;

    private ApiResult(boolean success, int code, String message, T data) {
        this.success = success;
        this.code = code;
        this.message = message;
        this.data = data;
    }

    public static <T> ApiResult<T> success(T data) {
        return new ApiResult<>(true, 200, null, data);
    }

    public static <T> ApiResult<T> ok(T data) {
        return success(data);
    }

    public static ApiResult<Void> ok() {
        return new ApiResult<>(true, 200, null, null);
    }
    public static <T> ApiResult<T> fail(int code, String message) {
        return new ApiResult<>(false, code, message, null);
    }
}
