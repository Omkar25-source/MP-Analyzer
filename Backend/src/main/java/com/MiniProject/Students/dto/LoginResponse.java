package com.MiniProject.Students.dto;

public class LoginResponse {

    private String message;
    private boolean success;
    private String token;

    public LoginResponse(String message, boolean success) {
        this.message = message;
        this.success = success;
    }

    public LoginResponse(String message, boolean success, String token) {
        this.message = message;
        this.success = success;
        this.token = token;
    }

    public String getMessage() {
        return message;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getToken() {
        return token;
    }
}
