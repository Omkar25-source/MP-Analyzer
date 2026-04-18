package com.MiniProject.Students.controller;

import com.MiniProject.Students.dto.LoginRequest;
import com.MiniProject.Students.dto.LoginResponse;
import com.MiniProject.Students.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:5500", "http://127.0.0.1:5500"})
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        if (!response.isSuccess()) {
            return ResponseEntity.status(401).body(response);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.register(request);
        if (!response.isSuccess()) {
            return ResponseEntity.status(409).body(response);
        }
        return ResponseEntity.status(201).body(response);
    }
}
