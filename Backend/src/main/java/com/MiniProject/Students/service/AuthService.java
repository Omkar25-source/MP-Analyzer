package com.MiniProject.Students.service;

import com.MiniProject.Students.dto.LoginRequest;
import com.MiniProject.Students.dto.LoginResponse;
import com.MiniProject.Students.model.User;
import com.MiniProject.Students.repository.UserRepository;
import com.MiniProject.Students.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    public LoginResponse login(LoginRequest request) {
        Optional<User> userOptional = userRepository.findByEmail(request.getEmail());

        if (userOptional.isEmpty()) {
            return new LoginResponse("Invalid email or password", false);
        }

        User user = userOptional.get();
        String stored = user.getPassword();

        // OAuth users have no password
        if (stored == null) {
            return new LoginResponse("This account uses social login. Please sign in with Google or GitHub.", false);
        }

        boolean valid;
        boolean needsRehash = false;

        if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
            // Already BCrypt-encoded — normal path
            valid = passwordEncoder.matches(request.getPassword(), stored);
        } else {
            // Plaintext in DB (legacy) — compare raw, then migrate
            valid = stored.equals(request.getPassword());
            needsRehash = valid;
        }

        if (!valid) {
            return new LoginResponse("Invalid email or password", false);
        }

        // Silently re-encode plaintext password on success
        if (needsRehash) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            userRepository.save(user);
        }

        String token = jwtUtil.generateToken(user.getEmail());
        return new LoginResponse("Login successful", true, token);
    }

    public LoginResponse register(LoginRequest request) {

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            return new LoginResponse("Email already registered", false);
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail());
        return new LoginResponse("Registration successful", true, token);
    }
}
