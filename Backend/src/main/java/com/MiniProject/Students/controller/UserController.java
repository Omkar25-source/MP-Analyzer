package com.MiniProject.Students.controller;

import com.MiniProject.Students.dto.UpdateProfileRequest;
import com.MiniProject.Students.dto.UserProfileResponse;
import com.MiniProject.Students.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
@CrossOrigin(origins = {"http://localhost:5500", "http://127.0.0.1:5500"})
public class UserController {

    @Autowired
    private UserService userService;

    /**
     * GET /api/user/me
     * Returns current user's profile. JWT required.
     */
    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getMe(Authentication authentication) {
        String email = authentication.getName();          // set by JwtAuthFilter
        return ResponseEntity.ok(userService.getProfile(email));
    }

    /**
     * PUT /api/user/profile
     * Updates name and email. JWT required.
     */
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(Authentication authentication,
                                           @Valid @RequestBody UpdateProfileRequest req) {
        String currentEmail = authentication.getName();
        try {
            UserProfileResponse updated = userService.updateProfile(currentEmail, req);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(409).body(e.getMessage());
        }
    }
}
