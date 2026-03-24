package com.MiniProject.Students.controller;

import com.MiniProject.Students.dto.LoginRequest;
import com.MiniProject.Students.dto.LoginResponse;
import com.MiniProject.Students.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        return authService.login(request);
    }
}

