package com.MiniProject.Students.service;

import com.MiniProject.Students.dto.LoginRequest;
import com.MiniProject.Students.dto.LoginResponse;
import com.MiniProject.Students.model.User;
import com.MiniProject.Students.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    public LoginResponse login(LoginRequest request) {

        // Check if user exists
        Optional<User> userOptional = userRepository.findByEmail(request.getEmail());

        if (userOptional.isEmpty()) {
            return new LoginResponse("User not found", false);
        }

        User user = userOptional.get();

        // Check password
        if (!user.getPassword().equals(request.getPassword())) {
            return new LoginResponse("Invalid password", false);
        }

        return new LoginResponse("Login successful", true);
    }
}
